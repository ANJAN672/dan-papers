
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Github, Settings, Loader2, Paperclip, Eye, Edit3, Image as ImageIcon, X } from 'lucide-react';
import { CURRENT_USER, ARTICLES } from '../constants';
import { GitHubConfig, fetchFileContent, updateFileContent } from '../services/githubService';
import { renderArticleContent } from './ArticlePage';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const WritePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const editArticle = location.state?.editArticle;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);

  const FIXED_CONFIG = {
      owner: 'somdipto',
      repo: 'dan-papers',
      path: 'constants.ts',
      branch: 'main'
  };

  const [ghConfig, setGhConfig] = useState<GitHubConfig>({
    token: '',
    ...FIXED_CONFIG
  });

  useEffect(() => {
    if (editArticle) {
      setTitle(editArticle.title);
      setSubtitle(editArticle.subtitle);
      setTags(editArticle.tags.join(', '));
      setContent(editArticle.content);
      setImage(editArticle.image || '');
      setIsPreview(true);
    }
  }, [editArticle]);

  useEffect(() => {
    const stored = localStorage.getItem('dan_papers_gh_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      setGhConfig(prev => ({ ...prev, token: (parsed.token || '').trim() }));
    }
  }, []);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, msg]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    let rawText = '';

    try {
      const fileName = file.name.toLowerCase();
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
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        rawText = result.value;
      } else if (fileName.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/x-markdown') {
        rawText = await file.text();
      } else {
        throw new Error("Format not supported.");
      }

      if (rawText.startsWith('---')) {
        const parts = rawText.split('---');
        if (parts.length >= 3) {
          const frontmatter = parts[1];
          const lines = frontmatter.split('\n');
          lines.forEach(line => {
            if (line.toLowerCase().startsWith('title:')) setTitle(line.replace(/title:/i, '').trim().replace(/^["']|["']$/g, ''));
            if (line.toLowerCase().startsWith('subtitle:')) setSubtitle(line.replace(/subtitle:/i, '').trim().replace(/^["']|["']$/g, ''));
            if (line.toLowerCase().startsWith('tags:')) setTags(line.replace(/tags:/i, '').trim().replace(/^["']|["']$/g, ''));
            if (line.toLowerCase().startsWith('image:')) setImage(line.replace(/image:/i, '').trim().replace(/^["']|["']$/g, ''));
          });
          setContent(parts.slice(2).join('---').trim());
        }
      } else {
        setContent(rawText);
      }
      
      setIsPreview(true);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePublishToGitHub = async () => {
    const config = { ...ghConfig, token: ghConfig.token.trim() };
    if (!config.token) { 
        setShowSettings(true); 
        return; 
    }

    setShowTerminal(true);
    setTerminalLogs([]);
    setIsPublishing(true);
    
    const isEdit = !!editArticle;
    addLog(`$ git status`);
    addLog(`$ git commit -m "${isEdit ? 'Update' : 'Publish'}: ${title || 'Research Paper'}"`);

    try {
      const { content: currentFileContent, sha } = await fetchFileContent(config);
      
      const targetId = isEdit ? editArticle.id : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'paper-' + Date.now();
      const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
      const safeContent = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const articleObject = `
  {
    id: "${targetId}",
    title: "${title || 'Untitled'}",
    subtitle: "${subtitle || ''}",
    author: "${editArticle?.author || CURRENT_USER.name}",
    date: "${editArticle?.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}",
    readTime: ${readTime},
    tags: ${JSON.stringify(tagArray.length ? tagArray : ['Research'])},
    image: "${image}",
    content: \`
${safeContent}
    \`
  },`;

      let newFileContent = "";
      if (isEdit) {
        const searchStr = `id: "${targetId}"`;
        const idIndex = currentFileContent.indexOf(searchStr);
        if (idIndex === -1) throw new Error("Could not locate existing article.");

        let startIndex = idIndex;
        while (startIndex >= 0 && currentFileContent[startIndex] !== '{') startIndex--;
        
        let endIndex = idIndex;
        let braceCount = 0;
        while (endIndex < currentFileContent.length) {
            if (currentFileContent[endIndex] === '{') braceCount++;
            if (currentFileContent[endIndex] === '}') braceCount--;
            if (braceCount === 0 && currentFileContent[endIndex] === '}') break;
            endIndex++;
        }
        newFileContent = currentFileContent.slice(0, startIndex) + articleObject.trim() + currentFileContent.slice(endIndex + 1);
      } else {
        const marker = "export const ARTICLES: Article[] = [";
        const insertIndex = currentFileContent.indexOf(marker);
        newFileContent = currentFileContent.slice(0, insertIndex + marker.length) + "\n" + articleObject + currentFileContent.slice(insertIndex + marker.length);
      }

      // Fixed: Resolved syntax error in ternary operator template literal
      await updateFileContent(config, newFileContent, sha, { message: `${isEdit ? 'Update' : 'Publish'}: ${title}` });
      addLog(`$ git push origin main --verified`);
      addLog(`$ Success. Paper index updated.`);
      
      const localArticle = { id: targetId, title, subtitle, author: editArticle?.author || CURRENT_USER.name, date: editArticle?.date || 'Now', readTime, tags: tagArray, content, image };
      if (isEdit) {
        const idx = ARTICLES.findIndex(a => a.id === targetId);
        if (idx > -1) ARTICLES[idx] = localArticle;
      } else {
        ARTICLES.unshift(localArticle);
      }
      
      setTimeout(() => navigate(isEdit ? `/article/${targetId}` : '/'), 1500);
    } catch (error: any) {
      addLog(`! FAILED: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        addLog(`! ACTION REQUIRED: Token is invalid. Please update "Repository Identity" settings.`);
      }
      setIsPublishing(false); // Stop spinning on error
    } finally {
      // We keep isPublishing true unless an error occurred
    }
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 mt-8 pb-32 font-sans relative z-10">
      {isProcessingFile && (
        <div className="fixed inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-black dark:text-white mb-4" size={56} />
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">Extracting Document...</h2>
          <p className="text-gray-400 mt-2 text-sm">Processing local buffers.</p>
        </div>
      )}

      <div className="mb-16 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-6">
        <Link to={editArticle ? `/article/${editArticle.id}` : "/"} className="text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-2 text-sm font-bold tracking-tight">
          <ArrowLeft size={16} /> {editArticle ? 'CANCEL EDIT' : 'DASHBOARD'}
        </Link>
        
        <div className="flex gap-8 items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.md" />
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <Paperclip size={14} /> <span>{editArticle ? 'Replace Doc' : 'Upload doc'}</span>
          </button>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

          <button onClick={() => setIsPreview(!isPreview)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black dark:text-white hover:opacity-60 transition-opacity">
            {isPreview ? <><Edit3 size={14} /> Write</> : <><Eye size={14} /> View Render</>}
          </button>
          
          <button onClick={() => setShowSettings(true)} className="text-gray-300 dark:text-zinc-600 hover:text-black dark:hover:text-white"><Settings size={20} /></button>
        </div>
      </div>

      {!isPreview ? (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
          <div className="mb-4">
             {image ? (
               <div className="relative group rounded-3xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm max-h-[300px]">
                  <img src={image} alt="Cover Preview" className="w-full h-auto object-cover" />
                  <button onClick={() => setImage('')} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={20} />
                  </button>
               </div>
             ) : (
               <div className="flex flex-col gap-4">
                 <button onClick={() => imageInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-gray-300 dark:text-zinc-600 hover:border-black dark:hover:border-zinc-400 hover:text-black dark:hover:text-white transition-all group">
                    <ImageIcon size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Research Figure / Cover Image</span>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                 </button>
                 <div className="flex items-center gap-2 text-[10px] font-sans text-gray-400 dark:text-zinc-600 uppercase tracking-widest px-4">
                   <span>OR PASTE URL</span>
                   <input 
                      type="text" 
                      placeholder="https://..." 
                      className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-black dark:text-white placeholder-gray-200 dark:placeholder-zinc-800"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                   />
                 </div>
               </div>
             )}
          </div>

          <input 
            type="text" 
            placeholder="Full Paper Title" 
            className="text-4xl md:text-6xl font-sans font-bold placeholder-gray-100 dark:placeholder-zinc-900 border-none outline-none focus:ring-0 bg-transparent p-0 text-medium-black dark:text-white leading-[1.1] tracking-tighter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Abstract (One line summary)" 
            className="text-xl md:text-2xl font-serif text-gray-400 dark:text-zinc-500 placeholder-gray-100 dark:placeholder-zinc-900 border-none outline-none focus:ring-0 bg-transparent p-0 leading-relaxed italic"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
          <div className="flex items-center gap-4 text-[10px] font-sans text-gray-400 dark:text-zinc-600 uppercase tracking-[0.3em] font-black border-y border-gray-50 dark:border-zinc-900 py-4">
             <span>Keywords</span>
             <input 
                type="text" 
                placeholder="AI, SYSTEMS, RESEARCH" 
                className="flex-1 font-sans border-none outline-none focus:ring-0 bg-transparent p-0 text-black dark:text-white placeholder-gray-200 dark:placeholder-zinc-800"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
             />
          </div>
          <textarea 
            placeholder="Paper Content (Markdown supported)..." 
            className="w-full text-xl leading-relaxed font-serif text-medium-black/90 dark:text-zinc-200 placeholder-gray-100 dark:placeholder-zinc-900 border-none outline-none focus:ring-0 bg-transparent p-0 resize-none min-h-[60vh]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0c0c0c] p-8 md:p-16 rounded-[3rem] border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors duration-300">
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-sans font-bold text-medium-black dark:text-white mb-6 tracking-tight leading-tight">{title || 'Untitled Research'}</h1>
            <p className="text-xl text-gray-400 dark:text-zinc-500 font-serif leading-relaxed italic border-l-4 border-black dark:border-white pl-8">{subtitle || 'No abstract defined.'}</p>
          </header>
          {image && <img src={image} className="w-full h-auto rounded-2xl mb-12 shadow-sm" alt="Preview" />}
          <div className="article-body">
            {renderArticleContent(content || 'Start writing to see the rendered paper.')}
          </div>
        </div>
      )}

      <div className="fixed bottom-12 right-12 z-50">
          <button 
              onClick={handlePublishToGitHub}
              disabled={!title || !content || (isPublishing && showTerminal)}
              className="bg-black dark:bg-zinc-800 text-white font-sans font-bold px-10 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 disabled:opacity-20 transition-all flex items-center gap-4 group"
          >
              {isPublishing ? <Loader2 size={24} className="animate-spin" /> : <Github size={24} className="group-hover:rotate-12 transition-transform" />}
              <span className="text-sm uppercase tracking-widest">{isPublishing ? 'Pushing Paper...' : (editArticle ? 'Update Publication' : 'Verify & Publish')}</span>
          </button>
      </div>

      {showTerminal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 z-[100] cursor-pointer"
          onClick={() => {
              if (!isPublishing) setShowTerminal(false);
              else {
                  setShowTerminal(false);
                  setIsPublishing(false);
              }
          }}
        >
            <div 
              className="w-full max-w-2xl bg-[#0a0a0a] rounded-3xl overflow-hidden border border-gray-800 font-mono text-sm shadow-[0_0_100px_rgba(0,0,0,0.5)] cursor-default"
              onClick={e => e.stopPropagation()}
            >
                <div className="bg-[#1a1a1a] p-4 flex justify-between items-center border-b border-gray-800">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">git-deploy-process</div>
                    <button 
                      onClick={() => { setShowTerminal(false); setIsPublishing(false); }}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-10 h-[350px] overflow-y-auto text-green-500">
                    <div className="mb-4 text-xs opacity-50 uppercase tracking-widest">Repository Log Stream</div>
                    {terminalLogs.map((log, i) => (
                        <div key={i} className={`mb-3 flex gap-4 ${log.startsWith('!') ? 'text-red-400' : ''}`}>
                            <span className="opacity-30">[{i}]</span> 
                            <span className="whitespace-pre-wrap">{log}</span>
                        </div>
                    ))}
                    {isPublishing && <div className="animate-pulse bg-green-500 w-2 h-4 inline-block ml-2"></div>}
                </div>
                
                {!isPublishing && (
                    <div className="p-6 bg-[#1a1a1a] border-t border-gray-800 text-center">
                        <button 
                            onClick={() => { setShowTerminal(false); setIsPublishing(false); }}
                            className="bg-white text-black px-8 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            Exit Process
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-xl">
            <div className="bg-white dark:bg-[#0c0c0c] rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 font-sans border border-gray-100 dark:border-zinc-800">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 tracking-tight dark:text-white"><Github /> Repository Identity</h2>
                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-600 uppercase mb-3 tracking-widest">Personal Access Token</label>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-2">Required scopes: <code>repo</code></p>
                        <input 
                            type="password" 
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 text-sm focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-all font-mono dark:text-white"
                            placeholder="ghp_..."
                            value={ghConfig.token}
                            onChange={e => setGhConfig(prev => ({...prev, token: e.target.value}))}
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-12">
                    <button onClick={() => setShowSettings(false)} className="flex-1 py-4 text-gray-400 hover:text-black dark:hover:text-white font-bold uppercase text-xs tracking-widest">Discard</button>
                    <button onClick={() => { 
                        const cleanToken = ghConfig.token.trim();
                        localStorage.setItem('dan_papers_gh_config', JSON.stringify({...ghConfig, token: cleanToken})); 
                        setGhConfig(prev => ({...prev, token: cleanToken}));
                        setShowSettings(false); 
                    }} className="flex-1 bg-black dark:bg-zinc-800 text-white rounded-2xl font-bold py-4 shadow-xl shadow-gray-200 dark:shadow-none uppercase text-xs tracking-widest">Update Keys</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WritePage;
