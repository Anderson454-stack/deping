import React from 'react';

const MobileBottomNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest/95 backdrop-blur-md flex justify-around items-center h-16 z-50 cinematic-shadow border-t border-outline-variant/10">
      <button className="flex flex-col items-center justify-center gap-1 text-primary">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>theaters</span>
        <span className="text-[10px] font-bold">Cinema</span>
      </button>
      <button className="flex flex-col items-center justify-center gap-1 text-on-surface-variant">
        <span className="material-symbols-outlined">explore</span>
        <span className="text-[10px]">Discover</span>
      </button>
      <button className="flex flex-col items-center justify-center gap-1 text-on-surface-variant">
        <span className="material-symbols-outlined">menu_book</span>
        <span className="text-[10px]">Journal</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
