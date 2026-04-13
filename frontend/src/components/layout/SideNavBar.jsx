import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SideNavBar = () => {
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 pt-20 flex-col gap-4 p-6 bg-surface-container border-r border-outline-variant/10 z-40">
      <div className="mb-6 px-2">
        <h2 className="text-on-surface font-bold text-lg leading-tight">Taste Profiles</h2>
        <p className="text-on-surface-variant text-xs">Your curated identity</p>
      </div>

      <nav className="flex flex-col gap-1">
        <Link className="flex items-center gap-3 px-4 py-2 text-primary font-bold bg-surface-container-highest rounded-lg hover:translate-x-1 transition-transform duration-200" to="/">
          <span className="material-symbols-outlined text-sm">theaters</span>
          <span className="text-sm">Cinema</span>
        </Link>
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg hover:translate-x-1 transition-transform duration-200" href="#">
          <span className="material-symbols-outlined text-sm">explore</span>
          <span className="text-sm">Discover</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg hover:translate-x-1 transition-transform duration-200" href="#">
          <span className="material-symbols-outlined text-sm">menu_book</span>
          <span className="text-sm">Journal</span>
        </a>
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant/20 pt-4">
        <button 
          onClick={() => navigate('/chat')}
          className="w-full ruby-gradient text-on-primary py-3 rounded-xl font-bold text-sm mb-4 cinematic-shadow active:opacity-80 transition-all"
        >
          Analyze Mood
        </button>
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-sm" href="#">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-sm" href="#">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Help</span>
        </a>
      </div>
    </aside>
  );
};

export default SideNavBar;
