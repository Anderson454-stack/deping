import React from 'react';
import { Link } from 'react-router-dom';

const TopNavBar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 glass-header flex justify-between items-center px-6 md:px-8 h-16 cinematic-shadow">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-2xl font-black tracking-tighter text-primary">Deeping</Link>
        <div className="hidden md:flex gap-6 items-center">
          <Link className="text-on-surface-variant hover:text-on-surface transition-all duration-300" to="/">Cinema</Link>
          <a className="text-on-surface-variant hover:text-on-surface transition-all duration-300" href="#">Discover</a>
          <a className="text-primary font-bold border-b-2 border-primary" href="#">Journal</a>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input 
            className="bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary w-64 transition-all" 
            placeholder="Search archives..." 
            type="text"
          />
        </div>
        <button className="p-2 hover:bg-surface-container rounded-full transition-all duration-300 active:scale-90">
          <span className="material-symbols-outlined text-primary">account_circle</span>
        </button>
      </div>
    </nav>
  );
};

export default TopNavBar;
