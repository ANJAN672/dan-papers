
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Github, Loader2, Paperclip, Eye, Edit3, X, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import { GitHubConfig, fetchFileContent, updateFileContent } from '../services/githubService';
import { structureArticle } from '../services/geminiService';
import { renderArticleContent } from './ArticlePage';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const WritePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const editArticle = location.state?.editArticle;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  
  const [ghSession, setGhSession] = useState<any>(null);

  useEffect(() => {
    if (editArticle) {
      setTitle(editArticle.title);
      setSubtitle(editArticle.subtitle);
      setTags(editArticle.tags.join(', '));
      setContent(editArticle.content);
      setImage(editArticle.image || '');
      setIsPreview(true);
    }

    const stored = localStorage.getItem('dan_papers_gh_session');
    if (stored) setGhSession(JSON.parse(stored));
  }, [editArticle]);

  const addLog = (msg: string) => setTerminalLogs(prev => [...prev, msg]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      let rawText = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        rawText = fullText;
      } else if (file.type.includes('word')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        rawText = result.value;
      } else {
        rawText = await file.text();
      }
      setContent(rawText);
      setIsRefining(true);
      const structured = await structureArticle(rawText);
      if (structured) {
        setTitle(structured.title || '');
        setSubtitle(structured.subtitle || '');
        setTags(structured.tags?.join(', ') || '');
        setContent(structured.content || '');
        setIsPreview(true);
      }
    } catch (err: any) {
      alert("Extraction Error: " + err.message);
    } finally {
      setIsProcessingFile(false);
      setIsRefining(false);
    }
  };

  const handlePublishToGitHub = async () => {
    if (!ghSession) {
      alert("Please Connect GitHub from the Navbar first.");
      return;
    }

    setShowTerminal(true);
    setTerminalLogs([]);
    setIsPublishing(true);
    addLog(`$ verifying session for ${ghSession.user.login}... OK`);
    addLog(`$ targeting: github.com/${ghSession.user.login}/dan-papers`);

    const config: GitHubConfig = {
      token: ghSession.token,
      owner: ghSession.user.login,
      repo: 'dan-papers',
      path: 'constants.ts',
      branch: 'main'
    };

    try {
      const { content: currentFileContent, sha } = await fetchFileContent(config);
      const targetId = editArticle?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'paper-' + Date.now();
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const safeContent = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

      const articleObject = `
  {
    id: "${targetId}",
    title: \`${title.replace(/`/g, '\\`')}\`,
    subtitle: \`${subtitle.replace(/`/g, '\\`')}\`,
    author: "${ghSession.user?.name || ghSession.user?.login || CURRENT_USER.name}",
    date: "${editArticle?.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}",
    readTime: ${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))},
    tags: ${JSON.stringify(tagArray.length ? tagArray : ['Research'])},
    image: "${image}",
    content: \`
${safeContent}
    \`
  },`;

      let newFileContent = "";
      if (editArticle) {
        const idRegex = new RegExp(`id:\\s*["']${targetId}["']`, 'm');
        const match = currentFileContent.match(idRegex);
        if (!match) throw new Error("Could not locate existing entry in constants.ts.");
        
        let start = match.index!;
        while (start >= 0 && currentFileContent[start] !== '{') start--;
        let end = match.index!, braces = 0;
        while (end < currentFileContent.length) {
          if (currentFileContent[end] === '{') braces++;
          if (currentFileContent[end] === '}') { braces--; if (braces === 0) break; }
          end++;
        }
        newFileContent = currentFileContent.slice(0, start) + articleObject.trim() + currentFileContent.slice(end + 1);
      } else {
        const fuzzyMarkerRegex = /ARTICLES\s*(?::\s*[^=]+)?\s*=\s*\[/;
        const markerMatch = currentFileContent.match(fuzzyMarkerRegex);
        if (!markerMatch) throw new Error("CRITICAL: 'ARTICLES' list not found in repository.");
        
        const insertAt = markerMatch.index! + markerMatch[0].length;
        newFileContent = currentFileContent.slice(0, insertAt) + "\n" + articleObject + currentFileContent.slice(insertAt);
      }

      await updateFileContent(config, newFileContent, sha, `Research: ${title}`);
      addLog(`$ git push origin main --verified`);
      addLog(`$ SUCCESS: Paper broadcasted.`);
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      addLog(`! FAILED: ${error.message}`);
      setIsPublishing(false); 
      if (error.message.includes('401')) {
          localStorage.removeItem('dan_papers_gh_session');
          alert("Session expired. Please reconnect.");
      }
    }
  };

  if (!ghSession) {
    return (
      <div className="max-w-screen-md mx-auto px-4 mt-24 text-center animate-in fade-in duration-700">
         <div className="bg-white dark:bg-[#0c0c0c] border border-gray-100 dark:border-zinc-800 rounded-[3rem] p-16 shadow-2xl">
            <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 dark:border-zinc-800 shadow-inner">
               <Lock size={48} className="text-gray-300 dark:text-zinc-700" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-black dark:text-white mb-4">Workspace Locked</h1>
            <p className="text-lg text-gray-500 dark:text-zinc-400 mb-10 max-w-sm mx-auto leading-relaxed font-serif">
               Authenticate via GitHub to access the research editor and publish to your personal repository.
            </p>
            <button 
              onClick={() => document.querySelector('button[title="Connect"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}
              className="bg-black dark:bg-white dark:text-black text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 mx-auto hover:scale-105 transition-all shadow-xl"
            >
               <Github size={18} /> Secure Login
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-md mx-auto px-4 mt-8 pb-32 font-sans relative z-10">
      {(isProcessingFile || isRefining) && (
        <div className="fixed inset-0 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Loader2 className="animate-spin text-black dark:text-white mb-6" size={64} />
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white">
             {isRefining ? "AI Architecting..." : "Reading Document..."}
          </h2>
        </div>
      )}

      <div className="mb-16 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-6">
        <Link to="/" className="text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-2 text-sm font-bold tracking-tight transition-colors">
          <ArrowLeft size={16} /> DASHBOARD
        </Link>
        
        <div className="flex gap-8 items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.md" />
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-500 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
            <Paperclip size={14} /> <span>Attach</span>
          </button>
          <button onClick={() => setIsPreview(!isPreview)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black dark:text-white">
            {isPreview ? <><Edit3 size={14} /> Edit</> : <><Eye size={14} /> Render</>}
          </button>
        </div>
      </div>

      {!isPreview ? (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
          <input 
            type="text" placeholder="Title of Publication" 
            className="text-4xl md:text-6xl font-sans font-bold border-none outline-none focus:ring-0 bg-transparent p-0 text-medium-black dark:text-white tracking-tighter"
            value={title} onChange={(e) => setTitle(e.target.value)}
          />
          <input 
            type="text" placeholder="Abstract Headline" 
            className="text-xl md:text-2xl font-serif text-gray-400 dark:text-zinc-500 border-none outline-none focus:ring-0 bg-transparent p-0 italic"
            value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
          />
          <textarea 
            placeholder="Research Body..." 
            className="w-full text-xl leading-relaxed font-serif text-medium-black/90 dark:text-zinc-200 border-none outline-none focus:ring-0 bg-transparent p-0 resize-none min-h-[60vh]"
            value={content} onChange={(e) => setContent(e.target.value)}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0c0c0c] p-8 md:p-16 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-sans font-bold mb-6 text-black dark:text-white">{title || 'Untitled'}</h1>
          <p className="text-xl text-gray-400 font-serif italic mb-12 border-l-4 border-black dark:border-white pl-8 py-2">{subtitle}</p>
          <div className="article-body">{renderArticleContent(content)}</div>
        </div>
      )}

      <div className="fixed bottom-12 right-12 z-50">
          <button 
              onClick={handlePublishToGitHub} disabled={!title || isPublishing}
              className="bg-black dark:bg-zinc-800 text-white font-sans font-bold px-10 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-20 transition-all flex items-center gap-4 group"
          >
              {isPublishing ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} className="group-hover:rotate-12 transition-transform" />}
              <span className="text-sm uppercase tracking-widest font-black">{isPublishing ? 'Broadcasting...' : 'Verify & Publish'}</span>
          </button>
      </div>

      {showTerminal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 z-[100]" onClick={() => !isPublishing && setShowTerminal(false)}>
            <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-3xl overflow-hidden border border-gray-800 font-mono text-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="bg-[#1a1a1a] p-4 flex justify-between items-center border-b border-gray-800">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <button onClick={() => setShowTerminal(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                </div>
                <div className="p-10 h-[300px] overflow-y-auto text-green-500">
                    {terminalLogs.map((log, i) => <div key={i} className="mb-2 whitespace-pre-wrap">{log}</div>)}
                    {isPublishing && <div className="animate-pulse bg-green-500 w-2 h-4 inline-block ml-2" />}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WritePage;
