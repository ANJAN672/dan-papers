
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare, X, Sun, Moon, Github, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import { useAuth } from '../src/context/AuthContext';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isDarkMode, onToggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const { user, signIn, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md shadow-sm border-gray-200/50 dark:border-zinc-800/50' : 'bg-white/70 dark:bg-[#050505]/70 backdrop-blur-md border-transparent'}`}>
      <div className="max-w-screen-md mx-auto px-4 h-16 flex items-center justify-between font-sans">
        <Link to="/" className="text-2xl font-serif font-bold tracking-tight text-medium-black dark:text-white">
          Dan Papers
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={onToggleTheme} className="p-2 text-medium-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-900 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3 bg-blue-500/10 dark:bg-blue-500/5 px-3 py-1.5 rounded-full border border-blue-500/20 group relative cursor-pointer">
              <img src={user.image} className="w-5 h-5 rounded-full shadow-sm" alt="GH" />
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest hidden md:inline">{user.name}</span>
              <ShieldCheck size={14} className="text-blue-500" />
              <div className="absolute top-full right-0 pt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100]">
                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 min-w-[180px]">
                  <div className="mb-4 text-center">
                    <p className="text-xs font-bold text-black dark:text-white truncate px-2">{user.name}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-black">Verified Researcher</p>
                  </div>
                  <button onClick={signOut} className="w-full py-2 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                    <LogOut size={12} /> Disconnect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={signIn} className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              <Github size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Connect</span>
            </button>
          )}

          <Link to="/write" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <PenSquare size={20} />
          </Link>

          <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden p-1 shadow-sm">
            <img src={user?.image || CURRENT_USER.image} alt="User" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
