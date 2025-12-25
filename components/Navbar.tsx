
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare, X, Sun, Moon, Github, ShieldCheck, LogOut, Loader2, ExternalLink, Copy, Check, Fingerprint } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import { startDeviceFlow, pollForToken, getGitHubUser } from '../services/githubService';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isDarkMode, onToggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'linking' | 'polling' | 'success'>('idle');
  const [deviceData, setDeviceData] = useState<any>(null);
  const [ghUser, setGhUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Check for existing session
    const stored = localStorage.getItem('dan_papers_gh_session');
    if (stored) {
      const { token } = JSON.parse(stored);
      getGitHubUser(token)
        .then(user => setGhUser(user))
        .catch(() => localStorage.removeItem('dan_papers_gh_session'));
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, []);

  const handleConnect = async () => {
    setShowModal(true);
    setAuthStep('linking');
    try {
      const data = await startDeviceFlow();
      setDeviceData(data);
      setAuthStep('polling');
      
      // Start polling for the token
      pollingRef.current = window.setInterval(async () => {
        const result = await pollForToken(data.device_code);
        if (result.access_token) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          const user = await getGitHubUser(result.access_token);
          setGhUser(user);
          localStorage.setItem('dan_papers_gh_session', JSON.stringify({
            token: result.access_token,
            user
          }));
          setAuthStep('success');
          setTimeout(() => {
            setShowModal(false);
            setAuthStep('idle');
          }, 2000);
        } else if (result.error && !['authorization_pending', 'slow_down'].includes(result.error)) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          setAuthStep('idle');
        }
      }, (data.interval || 5) * 1000);
    } catch (e) {
      setAuthStep('idle');
      alert("GitHub API Connection Error.");
    }
  };

  const handleCopyAndOpen = () => {
    if (deviceData?.user_code) {
      navigator.clipboard.writeText(deviceData.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      window.open(deviceData.verification_uri, '_blank');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dan_papers_gh_session');
    setGhUser(null);
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md shadow-sm border-gray-200/50 dark:border-zinc-800/50' : 'bg-white/70 dark:bg-[#050505]/70 backdrop-blur-md border-transparent'}`}>
        <div className="max-w-screen-md mx-auto px-4 h-16 flex items-center justify-between font-sans">
          <Link to="/" className="text-2xl font-serif font-bold tracking-tight text-medium-black dark:text-white">
             Dan Papers
          </Link>

          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={onToggleTheme} className="p-2 text-medium-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {ghUser ? (
              <div className="flex items-center gap-3 bg-blue-500/10 dark:bg-blue-500/5 px-3 py-1.5 rounded-full border border-blue-500/20 group relative cursor-pointer">
                 <img src={ghUser.avatar_url} className="w-5 h-5 rounded-full shadow-sm" alt="GH" />
                 <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest hidden md:inline">{ghUser.login}</span>
                 <ShieldCheck size={14} className="text-blue-500" />
                 <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all translate-y-1 z-[100]">
                    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 min-w-[180px]">
                       <div className="mb-4 text-center">
                          <p className="text-xs font-bold text-black dark:text-white truncate px-2">{ghUser.name || ghUser.login}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">Verified Researcher</p>
                       </div>
                       <button onClick={handleLogout} className="w-full py-2 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                          <LogOut size={12} /> Disconnect
                       </button>
                    </div>
                 </div>
              </div>
            ) : (
              <button onClick={handleConnect} className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <Github size={20} />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Connect</span>
              </button>
            )}
            
            <Link to="/write" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              <PenSquare size={20} />
            </Link>

            <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden p-1 shadow-sm">
               <img src={ghUser?.avatar_url || CURRENT_USER.image} alt="User" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
        </div>
      </nav>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-[#0c0c0c] rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10 font-sans border border-gray-100 dark:border-zinc-800 relative text-center animate-in fade-in zoom-in duration-300">
              <button 
                onClick={() => {
                  if (pollingRef.current) window.clearInterval(pollingRef.current);
                  setShowModal(false);
                  setAuthStep('idle');
                }} 
                className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="mb-10">
                 <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-gray-100 dark:border-zinc-800 shadow-inner">
                    {authStep === 'success' ? <Check size={40} className="text-green-500" /> : <Fingerprint size={40} className="text-black dark:text-white" />}
                 </div>
                 <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight">
                    {authStep === 'success' ? 'Verified!' : 'Author Verification'}
                 </h2>
              </div>

              {authStep === 'linking' && (
                <div className="py-12 flex flex-col items-center gap-6">
                  <div className="relative">
                    <Loader2 size={48} className="animate-spin text-blue-500" />
                    <Github size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Generating secure link...</p>
                </div>
              )}

              {authStep === 'polling' && deviceData && (
                <div className="space-y-8">
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    A GitHub window will open. Use this code to verify your researcher identity:
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-3xl p-6 border-2 border-dashed border-gray-200 dark:border-zinc-800">
                     <span className="text-4xl md:text-5xl font-mono font-black tracking-[0.2em] text-black dark:text-white">
                       {deviceData.user_code}
                     </span>
                  </div>

                  <button 
                    onClick={handleCopyAndOpen}
                    className="w-full bg-black dark:bg-white dark:text-black text-white rounded-2xl font-bold py-5 uppercase text-[10px] tracking-[0.2em] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy & Authorize'}
                  </button>
                  
                  <div className="flex items-center justify-center gap-3 text-blue-500 bg-blue-50 dark:bg-blue-900/10 py-3 rounded-xl">
                     <Loader2 size={14} className="animate-spin" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Listening for GitHub...</span>
                  </div>
                </div>
              )}

              {authStep === 'success' && (
                <div className="py-12 flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                   <p className="text-sm text-gray-500 font-medium italic">Identity Confirmed. Access Granted.</p>
                </div>
              )}
           </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
