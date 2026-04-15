import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import TopNavBar from './components/layout/TopNavBar';
import MobileDrawer from './components/layout/MobileDrawer';
import Dashboard from './pages/Dashboard';
import ChatGuide from './pages/ChatGuide';
import MovieDetail from './pages/MovieDetail';
import ComingSoon from './pages/ComingSoon';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/chat"       element={<ChatGuide />} />
        <Route path="/movie/:id?" element={<MovieDetail />} />
        <Route path="/discover"   element={<ComingSoon />} />
        <Route path="/journal"    element={<ComingSoon />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      </div>
    </Router>
  );
}

export default App;
