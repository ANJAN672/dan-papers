import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col font-serif">
      <Navbar />
      <main className="flex-grow pt-16">
        {children}
      </main>
    </div>
  );
};

export default Layout;