import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, PenSquare, X, MessageSquare } from 'lucide-react';
import { CURRENT_USER } from '../constants';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-gray-200/50 ${scrolled ? 'bg-white/70 backdrop-blur-md shadow-sm' : 'bg-white/70 backdrop-blur-md'}`}>
        <div className="max-w-screen-md mx-auto px-4 h-16 flex items-center justify-between font-sans">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-3xl font-serif font-bold tracking-tight text-medium-black flex items-center gap-2">
               Dan Papers
            </Link>
          </div>

          <div className="flex items-center gap-6 text-medium-gray">
            <div className="hidden md:flex relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                className="bg-gray-100/50 border-none rounded-full py-1.5 pl-8 pr-4 text-sm text-gray-900 focus:ring-0 focus:bg-gray-100 w-40 transition-all placeholder-gray-400"
                placeholder="Search..." 
              />
            </div>
            
            <Link to="/write" className="flex items-center gap-2 hover:text-medium-black transition-colors" title="Write a new paper">
              <PenSquare size={20} />
            </Link>

            <button 
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
            >
               <img src={CURRENT_USER.image} alt="User" className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
            </button>
          </div>
        </div>
      </nav>

      {/* About Dan Modal */}
      {showAbout && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => setShowAbout(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100 relative border border-gray-100" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header / Banner */}
            <div className="bg-white text-medium-black p-8 text-center relative border-b border-gray-100">
               <button 
                 onClick={() => setShowAbout(false)} 
                 className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
               >
                 <X size={24} />
               </button>
               <div className="w-20 h-20 mx-auto mb-4 bg-gray-50 rounded-full p-1 shadow-inner">
                  <img src={CURRENT_USER.image} alt="Dan Logo" className="w-full h-full rounded-full object-cover" />
               </div>
               <h2 className="text-2xl font-serif font-bold tracking-tight">Dan Papers</h2>
               <p className="text-gray-400 font-sans text-xs tracking-widest uppercase mt-2">Est. 2024</p>
            </div>

            {/* Content */}
            <div className="p-8 font-serif text-lg leading-relaxed text-gray-600 space-y-6 text-center">
              <p>
                This is an open community for <strong className="text-black">Dan researchers</strong>.
              </p>
              
              <p className="text-base text-gray-500">
                We are a collective of AI product builders and research engineers filtering for signal in a world of noise. We are looking for the cracked ones.
              </p>
              
              <p className="text-sm text-gray-400 italic">
                No fake researchers.
              </p>

              <a 
                href="https://discord.com" 
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#5865F2] text-white font-sans font-medium py-3 rounded-lg hover:bg-[#4752C4] transition-colors mt-6 flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                Join Discord Community
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;