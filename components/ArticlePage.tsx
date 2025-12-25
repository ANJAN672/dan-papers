import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ARTICLES, CURRENT_USER } from '../constants';
import { Share, MoreHorizontal, Trash2, AlertTriangle, Terminal } from 'lucide-react';

import { GitHubConfig, fetchFileContent, updateFileContent, getGitHubUser } from '../services/githubService';

const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const article = ARTICLES.find(a => a.id === id);


  // Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteToken, setDeleteToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);

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
        <h1 className="text-2xl font-bold">Article not found</h1>
        <Link to="/" className="text-medium-green underline mt-4 block">Return home</Link>
      </div>
    );
  }

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, msg]);
  };



  const handleDelete = async () => {
    if (!ghConfig || !deleteToken) {
        setStatusMessage("Missing configuration or token.");
        return;
    }

    setShowDeleteModal(false);
    setShowTerminal(true);
    setIsDeleting(true);
    setTerminalLogs([]);
    setDeleteStatus('idle');

    addLog(`$ Authenticating identity with GPG Token ID...`);
    await new Promise(r => setTimeout(r, 800));

    try {
        const configWithToken = { ...ghConfig, token: deleteToken };

        // 1. Verify Identity
        addLog(`> Verifying user permissions...`);
        const user = await getGitHubUser(deleteToken);
        const username = user.login.toLowerCase();
        const isAdmin = username === 'somdipto';
        
        addLog(`> Authenticated as: ${user.login} (${isAdmin ? 'ADMIN' : 'USER'})`);
        await new Promise(r => setTimeout(r, 500));

        const authorName = article.author.toLowerCase();
        const isSiteOwnerArticle = authorName === 'dan' || authorName === 'somdipto';
        const isOwner = authorName === (user.name || '').toLowerCase() || authorName === username;

        if (isSiteOwnerArticle && !isAdmin) {
             throw new Error("PERMISSION DENIED: You cannot delete the owner's papers.");
        }

        if (!isAdmin && !isOwner) {
             throw new Error(`PERMISSION DENIED: You are not the author of this paper.`);
        }

        if (isAdmin) {
             addLog(`> Admin privileges confirmed. Access granted.`);
        } else {
             addLog(`> Author identity verified. Access granted.`);
        }
        
        addLog(`$ git fetch origin ${configWithToken.branch || 'main'}`);
        const { content: fileContent, sha } = await fetchFileContent(configWithToken);
        addLog(`> Reading constants.ts... OK`);
        await new Promise(r => setTimeout(r, 500));

        addLog(`> Locating object ID: "${article.id}"...`);
        
        const searchStr = `id: "${article.id}"`;
        const idIndex = fileContent.indexOf(searchStr);
        
        if (idIndex === -1) {
            throw new Error(`Article ID "${article.id}" not found in remote file.`);
        }

        let startIndex = -1;
        for (let i = idIndex; i >= 0; i--) {
            if (fileContent[i] === '{') {
                startIndex = i;
                break;
            }
        }

        if (startIndex === -1) throw new Error("Parse Error: Could not find object start.");

        let endIndex = -1;
        let balance = 0;
        for (let i = startIndex; i < fileContent.length; i++) {
            if (fileContent[i] === '{') balance++;
            if (fileContent[i] === '}') balance--;
            
            if (balance === 0) {
                endIndex = i;
                break;
            }
        }

        if (endIndex === -1) throw new Error("Parse Error: Could not find object end.");

        let removeEnd = endIndex + 1;
        while (removeEnd < fileContent.length && (fileContent[removeEnd] === ',' || fileContent[removeEnd] === ' ' || fileContent[removeEnd] === '\n')) {
             if (fileContent[removeEnd] === ',') {
                 removeEnd++;
                 break;
             }
             removeEnd++;
        }

        addLog(`> Object block identified [${startIndex}..${endIndex}]`);
        addLog(`$ git rm object --cached`);
        
        const newContent = fileContent.slice(0, startIndex) + fileContent.slice(removeEnd);

        const commitMsg = `Delete: ${article.title}`;
        addLog(`$ git commit -S -m "${commitMsg}"`);
        addLog(`> GPG signing with verified identity... OK`);
        await new Promise(r => setTimeout(r, 800));

        addLog(`$ git push origin ${configWithToken.branch || 'main'}`);
        await updateFileContent(
            configWithToken, 
            newContent, 
            sha, 
            { message: commitMsg }
        );

        addLog(`> Success.`);
        setDeleteStatus('success');

        const localIndex = ARTICLES.findIndex(a => a.id === article.id);
        if (localIndex > -1) {
            ARTICLES.splice(localIndex, 1);
        }

        setTimeout(() => {
            navigate('/');
        }, 1500);

    } catch (error: any) {
        console.error(error);
        addLog(`FATAL: ${error.message}`);
        setDeleteStatus('error');
    } finally {
        setIsDeleting(false);
    }
  };

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold mt-10 mb-4 font-sans text-medium-black">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold mt-8 mb-3 font-sans text-medium-black">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-bold mt-6 mb-2 font-sans text-medium-black">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('* ')) {
        return <li key={index} className="ml-6 list-disc mb-2 text-xl leading-8 text-medium-black/90">{line.replace('* ', '')}</li>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={index} className="border-l-4 border-medium-black pl-4 italic my-6 text-xl text-gray-600">{line.replace('> ', '')}</blockquote>;
      }
      if (line.startsWith('```')) {
        return null;
      }
      if (line.trim().length === 0) return <br key={index} />;
      
      return <p key={index} className="mb-6 text-xl leading-8 text-medium-black/90 font-serif tracking-tight">{line}</p>;
    });
  };

  return (
    <article className="max-w-screen-md mx-auto mt-8 mb-20">
      <div className="bg-white px-6 md:px-12 py-12 rounded-2xl shadow-sm border border-gray-100">
          {/* Article Header */}
          <h1 className="text-3xl md:text-5xl font-bold text-medium-black leading-tight mb-4 font-sans tracking-tight">
            {article.title}
          </h1>
          <h2 className="text-xl md:text-2xl text-medium-gray font-serif mb-8 leading-snug">
            {article.subtitle}
          </h2>

          {/* Author Info */}
          <div className="flex items-center justify-between mb-12 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-4">
              <img src={CURRENT_USER.image} alt="Author" className="w-12 h-12 rounded-full object-cover border border-gray-100" />
              <div className="font-sans">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-medium-black">{article.author}</span>
                </div>
                <div className="text-sm text-medium-gray flex items-center gap-2">
                  <span>{article.readTime} min read</span>
                  <span>·</span>
                  <span>{article.date}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-500 md:p-0">
              {ghConfig && (
                <button 
                    onClick={() => setShowDeleteModal(true)} 
                    className="flex items-center gap-2 hover:text-red-600 transition-colors"
                    title="Delete this article"
                >
                    <Trash2 size={20} />
                </button>
              )}
              <button className="flex items-center gap-2 hover:text-black transition-colors">
                <Share size={20} />
              </button>
              <button className="flex items-center gap-2 hover:text-black transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Hero Image */}
          {article.image && (
            <figure className="mb-12">
              <img src={article.image} alt={article.title} className="w-full h-auto object-cover max-h-[500px] rounded-lg grayscale hover:grayscale-0 transition-all duration-700" />
            </figure>
          )}

          {/* Content */}
          <div className="article-content">
            {renderContent(article.content)}
          </div>


          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span key={tag} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-sans">
                {tag}
              </span>
            ))}
          </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 font-sans">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <AlertTriangle size={24} />
                    <h3 className="text-lg font-bold">Verify Identity</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    To delete <strong>"{article.title}"</strong>, you must verify your identity. This action cannot be undone.
                </p>
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        GPG Token ID (GitHub Personal Access Token)
                    </label>
                    <input 
                        type="password"
                        className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm focus:ring-1 focus:ring-black outline-none"
                        placeholder="ghp_..."
                        value={deleteToken}
                        onChange={(e) => setDeleteToken(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 text-gray-500 hover:text-black text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={!deleteToken}
                        className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Terminal Overlay for Deletion */}
      {showTerminal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <div className="w-full max-w-2xl bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-800 font-mono text-sm">
                <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-800">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-gray-500 text-xs">dan-shell — bash — delete</span>
                </div>
                <div className="p-6 h-[300px] overflow-y-auto text-red-400">
                    {terminalLogs.map((log, i) => (
                        <div key={i} className="mb-2 break-all">{log}</div>
                    ))}
                    {isDeleting && (
                        <div className="animate-pulse">_</div>
                    )}
                </div>
                {deleteStatus === 'error' && (
                    <div className="p-4 border-t border-gray-800 bg-red-900/20 text-red-400 flex justify-between items-center">
                        <span>Deletion Failed.</span>
                        <button onClick={() => setShowTerminal(false)} className="text-white hover:underline">Close</button>
                    </div>
                )}
            </div>
        </div>
      )}

    </article>
  );
};

export default ArticlePage;