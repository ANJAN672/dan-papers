import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Terminal, Github, Settings, Loader2, ExternalLink, AlertCircle, Wifi, Lock } from 'lucide-react';
import { CURRENT_USER, ARTICLES } from '../constants'; // Import ARTICLES to push to memory
import { GitHubConfig, fetchFileContent, updateFileContent } from '../services/githubService';

const WritePage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // GitHub Integration State
  const [showSettings, setShowSettings] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Terminal Logic
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  
  // Test Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Hardcoded Configuration for Dan Papers
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

  // Load config from local storage (Token only effectively)
  useEffect(() => {
    const stored = localStorage.getItem('dan_papers_gh_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Enforce fixed config, only allow token to be loaded
      setGhConfig(prev => ({ 
          ...prev, 
          token: parsed.token || ''
      }));
    }
  }, []);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, msg]);
  };

  const getCleanConfig = () => {
    // Always return fixed config with current token
    return {
        ...FIXED_CONFIG,
        token: ghConfig.token.trim()
    };
  };

  const saveConfig = () => {
    const cleanConfig = getCleanConfig();
    setGhConfig(cleanConfig);
    localStorage.setItem('dan_papers_gh_config', JSON.stringify(cleanConfig));
    setShowSettings(false);
    setTestStatus('idle');
  };

  const handleTestConnection = async () => {
    const config = getCleanConfig();
    if (!config.token) {
        setTestStatus('error');
        return;
    }
    
    setIsTesting(true);
    setTestStatus('idle');
    
    try {
        await fetchFileContent(config);
        setTestStatus('success');
    } catch (e) {
        console.error(e);
        setTestStatus('error');
    } finally {
        setIsTesting(false);
    }
  };

  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  // Helper to generate the raw JS Object string
  const generateArticleObjectString = () => {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled-paper';
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    // Robust escaping for template literal
    const safeContent = content
        .replace(/\\/g, '\\\\')    // Escape backslashes first
        .replace(/`/g, '\\`')      // Escape backticks
        .replace(/\$/g, '\\$');    // Escape dollar signs (for ${})

    return `
  {
    id: "${id}",
    title: "${title || 'Untitled'}",
    subtitle: "${subtitle || ''}",
    author: "${CURRENT_USER.name}",
    date: "${date}",
    readTime: ${readTime},
    tags: ${JSON.stringify(tagArray.length ? tagArray : ['Research'])},
    image: "https://picsum.photos/800/400?grayscale",
    content: \`
${safeContent}
    \`
  },`;
  };

  const handleGenerateCode = () => {
    setGeneratedCode(generateArticleObjectString());
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handlePublishToGitHub = async () => {
    const config = getCleanConfig();
    if (!config.token) {
      setShowSettings(true);
      return;
    }

    setShowTerminal(true);
    setTerminalLogs([]);
    setIsPublishing(true);
    
    addLog(`$ Initializing Dan Papers environment...`);
    await new Promise(r => setTimeout(r, 600));

    try {
      addLog(`$ git remote set-url origin https://github.com/${config.owner}/${config.repo}.git`);
      await new Promise(r => setTimeout(r, 600));

      addLog(`$ git fetch origin ${config.branch}`);
      
      // 1. Fetch current file
      const { content: currentFileContent, sha } = await fetchFileContent(config);
      addLog(`> Fetching contents... OK (${sha.substring(0, 7)})`);
      await new Promise(r => setTimeout(r, 400));

      // 2. Insert new article
      const marker = "export const ARTICLES: Article[] = [";
      const insertIndex = currentFileContent.indexOf(marker);

      if (insertIndex === -1) {
        throw new Error("Could not find 'ARTICLES' array in constants.ts.");
      }

      const newArticleCode = generateArticleObjectString();
      const newFileContent = currentFileContent.slice(0, insertIndex + marker.length) + 
                             "\n" + newArticleCode + 
                             currentFileContent.slice(insertIndex + marker.length);

      addLog(`$ git add constants.ts`);
      await new Promise(r => setTimeout(r, 500));
      
      const commitMsg = `Publish: ${title || 'New Article'}`;
      addLog(`$ git commit -S -m "${commitMsg}"`);
      addLog(`> GPG signing with token identity... OK`);
      await new Promise(r => setTimeout(r, 800));

      // 3. Push update
      addLog(`$ git push origin ${config.branch}`);
      await updateFileContent(
        config, 
        newFileContent, 
        sha, 
        { message: commitMsg }
      );
      
      addLog(`> To https://github.com/${config.owner}/${config.repo}.git`);
      addLog(`>    ${sha.substring(0, 7)}..${Math.random().toString(16).substring(2, 9)}  ${config.branch} -> ${config.branch}`);
      addLog(`$ Success.`);

      setPublishStatus('success');

      // Update Local Memory for immediate UX
      const tempArticle = {
         id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled-paper',
         title: title || 'Untitled',
         subtitle: subtitle || '',
         author: CURRENT_USER.name,
         date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
         readTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
         tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
         content: content,
         image: "https://picsum.photos/800/400?grayscale"
      };
      // Use unshift to add to top of list
      ARTICLES.unshift(tempArticle); 

      // Redirect after short delay
      setTimeout(() => {
          navigate('/');
      }, 1500);
      
    } catch (error: any) {
      console.error(error);
      addLog(`Error: ${error.message}`);
      setPublishStatus('error');
      setStatusMessage(error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 mt-8 pb-32 relative">
      <div className="mb-8 flex justify-between items-center">
        <Link to="/" className="text-gray-400 hover:text-black flex items-center gap-2 text-sm font-sans">
          <ArrowLeft size={16} /> Back to papers
        </Link>
        
        <button 
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-black flex items-center gap-2 text-sm font-sans"
        >
          <Settings size={16} /> Settings
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <input 
          type="text" 
          placeholder="Title" 
          className="text-4xl md:text-5xl font-serif font-bold placeholder-gray-300 border-none outline-none focus:ring-0 bg-transparent p-0 text-medium-black leading-tight"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        
        <input 
          type="text" 
          placeholder="Subtitle (optional)" 
          className="text-xl md:text-2xl font-serif text-gray-500 placeholder-gray-300 border-none outline-none focus:ring-0 bg-transparent p-0 leading-snug"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />

        <div className="flex items-center gap-2 mt-2 mb-8">
           <span className="text-gray-400 text-sm font-sans">Tags:</span>
           <input 
              type="text" 
              placeholder="Research, AI, Systems (comma separated)" 
              className="flex-1 font-sans text-sm border-none outline-none focus:ring-0 bg-transparent p-0 text-gray-600 placeholder-gray-300"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
           />
        </div>

        <textarea 
          ref={textareaRef}
          placeholder="Tell your story..." 
          className="w-full text-xl leading-8 font-serif text-medium-black/90 placeholder-gray-300 border-none outline-none focus:ring-0 bg-transparent p-0 resize-none min-h-[40vh]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50">
        <div className="flex gap-2">
            <button 
                onClick={handleGenerateCode}
                className="bg-gray-100 text-gray-700 font-sans px-4 py-2 rounded-full shadow hover:bg-gray-200 transition-all flex items-center gap-2"
                title="Generate manual code snippet"
            >
                <Terminal size={18} />
                <span className="hidden md:inline">Generate Code</span>
            </button>
            
            <button 
                onClick={handlePublishToGitHub}
                disabled={!title || !content || isPublishing}
                className="bg-black text-white font-sans px-6 py-2 rounded-full shadow-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
                {isPublishing ? <Loader2 size={18} className="animate-spin" /> : <Github size={18} />}
                <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
            </button>
        </div>
      </div>

      {/* Terminal Overlay */}
      {showTerminal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <div className="w-full max-w-2xl bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-800 font-mono text-sm">
                <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-800">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-gray-500 text-xs">dan-shell — bash</span>
                </div>
                <div className="p-6 h-[400px] overflow-y-auto text-green-400">
                    {terminalLogs.map((log, i) => (
                        <div key={i} className="mb-2 break-all">{log}</div>
                    ))}
                    {isPublishing && (
                        <div className="animate-pulse">_</div>
                    )}
                </div>
                {publishStatus === 'error' && (
                    <div className="p-4 border-t border-gray-800 bg-red-900/20 text-red-400 flex justify-between items-center">
                        <span>Push Failed. Check settings.</span>
                        <button onClick={() => setShowTerminal(false)} className="text-white hover:underline">Close</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Code Snippet Modal (Manual Fallback) */}
      {generatedCode && !showTerminal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold font-sans text-medium-black flex items-center gap-2">
                  <Terminal size={20} />
                  Manual Commit
                </h3>
                <p className="text-sm text-gray-500 mt-1 font-sans">
                  Copy this snippet and paste it into the <code>ARTICLES</code> array in <code>constants.ts</code>.
                </p>
              </div>
              <button onClick={() => setGeneratedCode(null)} className="text-gray-400 hover:text-black">
                ✕
              </button>
            </div>
            
            <div className="relative bg-gray-900 p-6 overflow-auto">
              <pre className="text-xs md:text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
                {generatedCode}
              </pre>
              <button 
                onClick={copyToClipboard}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors"
                title="Copy code"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 font-sans max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Github /> Configure GPG Access
                </h2>
                
                <div className="text-sm text-blue-800 bg-blue-50 p-4 rounded mb-6 border border-blue-100">
                    <h3 className="font-bold mb-2 flex items-center gap-2"><AlertCircle size={14}/> Authentication Required</h3>
                    <p className="mb-2">Enter your GPG Token ID (GitHub Personal Access Token) to authenticate commits to <strong>dan-papers</strong>.</p>
                    <ul className="list-disc ml-4 space-y-1 text-xs mb-3">
                        <li><strong>Scope:</strong> Must have <code>repo</code> scope.</li>
                        <li><strong>SSO:</strong> If using an organization account, ensure SSO is authorized.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">Repository URL <Lock size={10}/></label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-sm text-gray-500 cursor-not-allowed"
                            value="https://github.com/somdipto/dan-papers"
                            disabled
                            readOnly
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">File Path <Lock size={10}/></label>
                            <input 
                                type="text" 
                                className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-sm text-gray-500 cursor-not-allowed"
                                value={FIXED_CONFIG.path}
                                disabled
                                readOnly
                            />
                        </div>
                         <div className="w-1/3">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">Branch <Lock size={10}/></label>
                            <input 
                                type="text" 
                                className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-sm text-gray-500 cursor-not-allowed"
                                value={FIXED_CONFIG.branch}
                                disabled
                                readOnly
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-black uppercase mb-1">GPG Token ID (GitHub PAT)</label>
                        <input 
                            type="password" 
                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-black outline-none"
                            placeholder="ghp_..."
                            value={ghConfig.token}
                            onChange={e => setGhConfig(prev => ({...prev, token: e.target.value}))}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-8 border-t pt-4">
                    <button 
                        onClick={handleTestConnection}
                        disabled={isTesting || !ghConfig.token}
                        className={`text-sm flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                            testStatus === 'success' ? 'text-green-600 bg-green-50' : 
                            testStatus === 'error' ? 'text-red-600 bg-red-50' : 
                            'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {isTesting ? <Loader2 size={14} className="animate-spin"/> : <Wifi size={14}/>}
                        {testStatus === 'success' ? 'Connected!' : testStatus === 'error' ? 'Failed' : 'Test GPG'}
                    </button>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowSettings(false)}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-black"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveConfig}
                            className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800"
                        >
                            Save Keys
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WritePage;