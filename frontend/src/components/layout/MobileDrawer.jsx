import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/',         icon: 'theaters',  label: 'Cinema',   ready: true  },
  { to: '/discover', icon: 'explore',   label: 'Discover', ready: false },
  { to: '/journal',  icon: 'menu_book', label: 'Journal',  ready: false },
];

const MobileDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleNav = (to) => {
    onClose();
    navigate(to);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* 슬라이드 드로어 */}
          <motion.aside
            key="drawer"
            className="fixed top-0 right-0 h-full w-72 z-[70] flex flex-col"
            style={{ background: 'var(--color-surface-container-lowest, #fafafa)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 h-16 shrink-0">
              <span
                className="text-xl font-black tracking-tighter"
                style={{ color: 'var(--color-primary)' }}
              >
                Deeping
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-container transition-colors"
                aria-label="메뉴 닫기"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            {/* 구분선 */}
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', flexShrink: 0 }} />

            {/* 네비게이션 */}
            <nav className="flex flex-col gap-1 px-4 py-4 flex-1 overflow-y-auto">
              {NAV_ITEMS.map(({ to, icon, label, ready }) => (
                <button
                  key={to}
                  onClick={() => handleNav(to)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-surface-container-high transition-colors w-full"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-xl">{icon}</span>
                  <span className="font-semibold text-on-surface flex-1">{label}</span>
                  {!ready && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight"
                      style={{ background: 'rgba(142,0,4,0.08)', color: 'var(--color-primary)' }}
                    >
                      준비중
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* 푸터 */}
            <div className="px-4 pb-8 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-surface-container-high transition-colors w-full text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">settings</span>
                <span className="font-medium">Settings</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-surface-container-high transition-colors w-full text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">help_outline</span>
                <span className="font-medium">Help</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
