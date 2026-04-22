import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import TopNavBar from './components/layout/TopNavBar';
import MobileDrawer from './components/layout/MobileDrawer';
import Dashboard from './pages/Dashboard';
import ChatGuide from './pages/ChatGuide';
import MovieDetail from './pages/MovieDetail';
import ComingSoon from './pages/ComingSoon';
import Journal from './pages/Journal';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/chat"       element={<ChatGuide />} />
        <Route path="/chatguide"  element={<ChatGuide />} />
        <Route path="/movie/:id?" element={<MovieDetail />} />
        <Route path="/discover"   element={<ComingSoon />} />
        <Route path="/journal"    element={<Journal />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let timerId;

    const handleToast = (event) => {
      const nextMessage = event.detail?.message;
      if (!nextMessage) return;
      setToast(nextMessage);
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => setToast(''), 1800);
    };

    window.addEventListener('deping:toast', handleToast);
    return () => {
      window.removeEventListener('deping:toast', handleToast);
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <Router>
      <div className="h-screen overflow-hidden flex flex-col bg-background text-on-background font-body">
        {/* 상단 GNB */}
        <TopNavBar onMenuToggle={() => setDrawerOpen((prev) => !prev)} />

        {/* 모바일 슬라이드 드로어 */}
        <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* 메인 콘텐츠 — 각 페이지가 자체 스크롤/패딩 관리 */}
        <main className="flex-1 overflow-hidden pt-[68px]">
          <AnimatedRoutes />
        </main>

        {toast ? (
          <div className="pointer-events-none fixed left-1/2 bottom-6 -translate-x-1/2 z-[120]">
            <div
              className="px-5 py-3 rounded-full text-sm font-bold text-on-surface"
              style={{
                background: 'var(--color-surface-raised)',
                boxShadow: 'var(--shadow-cinematic)',
              }}
            >
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </Router>
  );
}

export default App;
