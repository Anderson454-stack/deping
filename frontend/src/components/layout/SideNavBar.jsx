import React from 'react';
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',         icon: 'theaters',  label: 'Cinema',   ready: true  },
  { to: '/discover', icon: 'explore',   label: 'Discover', ready: false },
  { to: '/journal',  icon: 'menu_book', label: 'Journal',  ready: false },
];

const SideNavBar = () => {
  return (
    <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 pt-20 flex-col gap-4 p-6 bg-surface-container z-40">
      <div className="mb-6 px-2">
        <h2 className="text-on-surface font-bold text-lg leading-tight">Taste Profiles</h2>
        <p className="text-on-surface-variant text-xs">Your curated identity</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon, label, ready }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-colors duration-200 group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-sm group-hover:text-primary transition-colors">
              {icon}
            </span>
            <span className="text-sm font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors flex-1">
              {label}
            </span>
            {!ready && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tight"
                style={{ background: 'rgba(142,0,4,0.08)', color: 'var(--color-primary)' }}
              >
                준비중
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          <span>Settings</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-sm">help_outline</span>
          <span>Help</span>
        </a>
      </div>
    </aside>
  );
};

export default SideNavBar;
