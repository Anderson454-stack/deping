import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import TopNavBar from './components/layout/TopNavBar';
import SideNavBar from './components/layout/SideNavBar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import Dashboard from './pages/Dashboard';
import ChatGuide from './pages/ChatGuide';
import MovieDetail from './pages/MovieDetail';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<ChatGuide />} />
        <Route path="/movie/:id?" element={<MovieDetail />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-on-background font-body">
        {/* 상단 네비게이션 */}
        <TopNavBar />

        {/* 사이드바 (데스크톱 전용) */}
        <SideNavBar />

        {/* 메인 컨텐츠 영역 */}
        <main className="lg:pl-64 pt-16 min-h-screen pb-24 lg:pb-12">
          <div className="px-6 md:px-12 py-8">
            <AnimatedRoutes />
          </div>
        </main>

        {/* 하단 네비게이션 (모바일 전용) */}
        <MobileBottomNav />
      </div>
    </Router>
  );
}

export default App;
