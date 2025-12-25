import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ARTICLES, CURRENT_USER } from '../constants';
import { Share, MoreHorizontal, Trash2, AlertTriangle, Check } from 'lucide-react';
import { GitHubConfig, fetchFileContent, updateFileContent } from '../services/githubService';

export const parseInlineMarkdown = (text: string) => {
  let processed: React.ReactNode[] = text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-black">{part.slice(2, -2)}</strong>;
    }
    return part;
  });

  const italicParts: React.ReactNode[] = [];
  processed.forEach((part) => {
    if (typeof part === 'string') {
      const subParts = part.split(/(\*.*?\*)/g).map((sub, j) => {
        if (sub.startsWith('*') && sub.endsWith('*')) {
          return <em key={j} className="italic">{sub.slice(1, -1)}</em>;
        }
        return sub;
      });
      italicParts.push(...subParts);
    } else {
      italicParts.push(part);
    }
  });

  const linkedParts: React.ReactNode[] = [];
  italicParts.forEach((part) => {
    if (typeof part === 'string') {
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const subParts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(part)) !== null) {
        subParts.push(part.substring(lastIndex, match.index));
        subParts.push(
          <a 
            key={match.index} 
            href={match[2]} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-medium-black underline decoration-gray-300 hover:decoration-black transition-all"
          >
            {match[1]}
          </a>
        );
        lastIndex = match.index + match[0].length;
      }
      subParts.push(part.substring(lastIndex));
      linkedParts.push(...subParts);
    } else {
      linkedParts.push(part);
    }
  });

  return linkedParts;
};

export const renderArticleContent = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      
      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        const alignmentRow = tableLines[1].split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        const alignments = alignmentRow.map(cell => {
          const c = cell.trim();
          if (c.startsWith(':') && c.endsWith(':')) return 'center';
          if (c.endsWith(':')) return 'right';
          return 'left';
        });

        const bodyRows = tableLines.slice(2).map(row => 
          row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        );

        elements.push(
          <div key={`table-${i}`} className="my-10 overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-left border-collapse font-sans text-sm min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {headerRow.map((cell, idx) => (
                    <th key={idx} className={`p-4 border-b border-gray-200 font-bold text-black uppercase tracking-wider text-[11px] whitespace-nowrap`} style={{ textAlign: alignments[idx] as any }}>
                      {parseInlineMarkdown(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50/50 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={`p-4 text-medium-black leading-relaxed`} style={{ textAlign: alignments[cellIdx] as any }}>
                        {parseInlineMarkdown(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++; 
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <div key={`code-container-${i}`} className="relative my-10 group">
          <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-8 rounded-2xl overflow-x-auto font-mono text-sm leading-6 border border-gray-800 shadow-xl">
            <code className="block whitespace-pre">{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-3xl md:text-4xl font-bold mt-16 mb-8 font-sans text-medium-black tracking-tight leading-tight border-b border-gray-100 pb-4">{parseInlineMarkdown(line.replace('# ', ''))}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold mt-12 mb-6 font-sans text-medium-black tracking-tight">{parseInlineMarkdown(line.replace('## ', ''))}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xl font-bold mt-8 mb-4 font-sans text-medium-black tracking-tight">{parseInlineMarkdown(line.replace('### ', ''))}</h3>);
    } else if (line.startsWith('* ')) {
      elements.push(<li key={i} className="ml-6 list-disc mb-4 text-xl leading-relaxed text-medium-black/90 font-serif pl-2">{parseInlineMarkdown(line.replace('* ', ''))}</li>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="border-l-4 border-black pl-8 italic my-12 text-2xl text-gray-500 font-serif leading-relaxed py-2">{parseInlineMarkdown(line.replace('> ', ''))}</blockquote>);
    } else if (line.trim().length > 0) {
      elements.push(<p key={i} className="mb-6 text-xl leading-relaxed text-medium-black/90 font-serif tracking-tight">{parseInlineMarkdown(line)}</p>);
    } else {
      elements.push(<div key={i} className="h-4" />);
    }
    
    i++;
  }
  
  return elements;
};

const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const article = ARTICLES.find(a => a.id === id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteToken, setDeleteToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const stored = localStorage.getItem('dan_papers_gh_config');
    if (stored) {
        setGhConfig(JSON.parse(stored));
    }
  }, [id]);

  if (!article) {
    return (
      <div className="max-w-screen-md mx-auto mt-20 text-center font-sans">
        <h1 className="text-2xl font-bold text-gray-400">Paper not found</h1>
        <Link to="/" className="text-black underline mt-4 block">Return home</Link>
      </div>
    );
  }

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.subtitle,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const handleEdit = () => {
    navigate('/write', { state: { editArticle: article } });
  };

  const handleDelete = async () => {
    if (!ghConfig || !deleteToken) return;
    setIsDeleting(true);
    try {
        const configWithToken = { ...ghConfig, token: deleteToken };
        const { content: fileContent, sha } = await fetchFileContent(configWithToken);
        const searchStr = `id: "${article.id}"`;
        const idIndex = fileContent.indexOf(searchStr);
        if (idIndex === -1) throw new Error("ID not found");

        let startIndex = idIndex;
        while (startIndex >= 0 && fileContent[startIndex] !== '{') startIndex--;
        
        let endIndex = idIndex;
        let braceCount = 0;
        while (endIndex < fileContent.length) {
            if (fileContent[endIndex] === '{') braceCount++;
            if (fileContent[endIndex] === '}') braceCount--;
            if (braceCount === 0 && fileContent[endIndex] === '}') break;
            endIndex++;
        }

        const newContent = fileContent.slice(0, startIndex) + fileContent.slice(endIndex + 2);
        await updateFileContent(configWithToken, newContent, sha, { message: `Delete: ${article.title}` });
        const idx = ARTICLES.findIndex(a => a.id === article.id);
        if (idx > -1) ARTICLES.splice(idx, 1);
        navigate('/');
    } catch (e: any) {
        alert("Error: " + e.message);
    } finally {
        setIsDeleting(false);
        setShowDeleteModal(false);
    }
  };

  return (
    <article className="max-w-screen-md mx-auto mt-12 mb-20 px-4 relative z-[5]">
      {showShareToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-black text-white px-6 py-3 rounded-full text-xs font-bold font-sans shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={14} className="text-green-400" /> LINK COPIED TO CLIPBOARD
        </div>
      )}

      <div className="bg-white px-6 md:px-16 py-12 md:py-20 rounded-[3rem] shadow-sm border border-gray-50 overflow-hidden">
          <header className="mb-12 relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold text-medium-black leading-[1.1] mb-8 font-sans tracking-tight pt-8">
              {article.title}
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-serif leading-relaxed italic border-l-4 border-black pl-8 py-2">
              {article.subtitle}
            </p>
          </header>

          <div className="flex items-center justify-between mb-16 border-b border-gray-100 pb-12">
            <div className="flex items-center gap-5">
              <img src={CURRENT_USER.image} alt="Author" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" />
              <div className="font-sans">
                <span className="font-bold text-medium-black block text-base tracking-tight">{article.author}</span>
                <div className="text-xs text-medium-gray flex items-center gap-3 mt-1">
                  <span className="bg-gray-100 px-2 py-0.5 rounded uppercase font-bold text-[9px]">{article.date}</span>
                  <span className="opacity-30">·</span>
                  <span className="font-medium">{article.readTime} min read</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8 text-gray-400">
              {ghConfig && (
                <button onClick={() => setShowDeleteModal(true)} title="Delete Paper" className="hover:text-red-500 transition-colors p-2">
                    <Trash2 size={22} />
                </button>
              )}
              <button onClick={handleShare} title="Share Link" className="hover:text-black transition-colors p-2">
                <Share size={22} />
              </button>
              <button onClick={handleEdit} title="Edit Paper" className="hover:text-black transition-colors p-2">
                <MoreHorizontal size={22} />
              </button>
            </div>
          </div>

          {article.image && (
            <div className="mb-16 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              <img src={article.image} alt="Cover" className="w-full h-auto max-h-[500px] object-cover" />
            </div>
          )}

          <div className="article-body">
            {renderArticleContent(article.content)}
          </div>

          <div className="flex flex-wrap gap-3 mt-16 pt-10 border-t border-gray-100">
            {article.tags.map(tag => (
              <span key={tag} className="bg-white border border-gray-200 text-gray-400 px-6 py-2 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.25em] shadow-sm">
                {tag}
              </span>
            ))}
          </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-xl">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-12 font-sans border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                        <AlertTriangle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3 tracking-tight">Revoke Publication?</h3>
                    <p className="text-sm text-gray-500 mb-10 leading-relaxed">This will permanently remove the research from the global repository. Identity verification required.</p>
                </div>
                <input 
                    type="password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-black/5 outline-none mb-8 transition-all font-mono"
                    placeholder="GPG Token ID"
                    value={deleteToken}
                    onChange={(e) => setDeleteToken(e.target.value)}
                />
                <div className="flex flex-col gap-4">
                    <button onClick={handleDelete} disabled={isDeleting} className="w-full py-5 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-2xl shadow-red-200 hover:bg-red-700 transition-all">
                        {isDeleting ? 'Processing...' : 'Verify & Delete'}
                    </button>
                    <button onClick={() => setShowDeleteModal(false)} className="w-full py-5 text-gray-400 hover:text-black text-sm font-bold">Cancel</button>
                </div>
            </div>
        </div>
      )}
    </article>
  );
};

export default ArticlePage;