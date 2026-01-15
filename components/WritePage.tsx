
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Github, Loader2, Paperclip, Eye, Edit3, X, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from '../src/context/AuthContext';
import { renderArticleContent } from './ArticlePage';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const WritePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuth();

  const generateStructure = useMutation(api.functions.ai.structureArticle);
  const publishArticle = useMutation(api.functions.articles.create);

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
      const structured = await generateStructure({ rawText });
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

  const handlePublish = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    setIsPublishing(true);

    try {
      const articleId = await publishArticle({
        title,
        subtitle,
        authorId: user.userId,
        authorName: user.name,
        authorImage: user.image,
        image: image || undefined, // No default image - matches seed article design
        content,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      });

      // Navigate to home after success
      setIsPublishing(false);
      navigate('/');
    } catch (error: any) {
      alert(`Publishing failed: ${error.message}`);
      setIsPublishing(false);
    }
  };

  if (!user) {
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
            onClick={signIn}
            className="bg-black dark:bg-white dark:text-black text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 mx-auto hover:scale-105 transition-all shadow-xl"
          >
            <Github size={18} /> Secure Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-md mx-auto px-4 mt-8 pb-32 font-sans relative z-10 transition-colors duration-300">
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
            className="text-4xl md:text-6xl font-sans font-bold border-none outline-none focus:ring-0 bg-transparent p-0 text-medium-black dark:text-white tracking-tighter placeholder:text-gray-300 dark:placeholder:text-zinc-800"
            value={title} onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text" placeholder="Abstract Headline"
            className="text-xl md:text-2xl font-serif text-gray-400 dark:text-zinc-500 border-none outline-none focus:ring-0 bg-transparent p-0 italic"
            value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
          />
          <input
            type="url" placeholder="Cover Image URL (Optional)"
            className="text-base font-sans text-gray-400 dark:text-zinc-500 border-none outline-none focus:ring-0 bg-transparent p-0 placeholder:text-gray-300 dark:placeholder:text-zinc-700"
            value={image} onChange={(e) => setImage(e.target.value)}
          />
          <textarea
            placeholder="Research Body..."
            className="w-full text-xl leading-relaxed font-serif text-medium-black/90 dark:text-zinc-200 border-none outline-none focus:ring-0 bg-transparent p-0 resize-none min-h-[60vh] placeholder:text-gray-200 dark:placeholder:text-zinc-800"
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
          onClick={handlePublish} disabled={!title || isPublishing}
          className="bg-black dark:bg-zinc-800 text-white font-sans font-bold px-10 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-20 transition-all flex items-center gap-4 group"
        >
          {isPublishing ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} className="group-hover:rotate-12 transition-transform" />}
          <span className="text-sm uppercase tracking-widest font-black">{isPublishing ? 'Broadcasting...' : 'Verify & Publish'}</span>
        </button>
      </div>
    </div>
  );
};

export default WritePage;
