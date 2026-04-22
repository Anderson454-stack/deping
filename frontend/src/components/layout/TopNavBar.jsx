import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',         label: 'Cinema',   ready: true  },
  { to: '/discover', label: 'Discover', ready: false },
  { to: '/journal',  label: 'Journal',  ready: true  },
];

const TopNavBar = ({ onMenuToggle }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-[68px]"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* 좌측: 로고 */}
      <Link
        to="/"
        className="text-2xl font-black tracking-tighter shrink-0"
        style={{ color: 'var(--color-primary)' }}
      >
        Deeping
      </Link>

      {/* 중앙: 데스크톱 메뉴 */}
      <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
        {NAV_ITEMS.map(({ to, label, ready }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'relative flex items-center gap-1.5 text-base font-medium tracking-[0.01em] pb-0.5 transition-colors duration-200',
                isActive
                  ? 'text-primary border-b-2'
                  : 'text-on-surface-variant hover:text-on-surface',
              ].join(' ')
            }
            style={({ isActive }) =>
              isActive
                ? { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' }
                : {}
            }
          >
            {label}
            {!ready && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tight leading-none"
                style={{ background: 'rgba(142,0,4,0.08)', color: 'var(--color-primary)' }}
              >
                준비중
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 우측: 판 아이콘 + 모바일 햄버거 */}
      <div className="flex items-center gap-1">
        {/* 판 아이콘 드롭다운 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full hover:bg-surface-container transition-colors duration-200 active:scale-90 flex items-center justify-center"
            aria-label="메뉴 열기"
            aria-expanded={dropdownOpen}
          >
            <span
              className="text-base font-black tracking-tighter"
              style={{ color: 'var(--color-primary)' }}
            >
              판
            </span>
          </button>

          {/* 드롭다운 패널 */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-44 rounded-xl py-1 z-[80]"
              style={{
                background: '#ffffff',
                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)',
              }}
            >
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left">
                <span className="material-symbols-outlined text-base text-on-surface-variant">settings</span>
                Settings
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left">
                <span className="material-symbols-outlined text-base text-on-surface-variant">help_outline</span>
                Help
              </button>
              <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left">
                <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
                Search archives
              </button>
            </div>
          )}
        </div>

        {/* 햄버거 버튼 (모바일 전용) */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-full hover:bg-surface-container transition-colors duration-200 active:scale-90"
          aria-label="메뉴 열기"
        >
          <span className="material-symbols-outlined text-on-surface">menu</span>
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;
