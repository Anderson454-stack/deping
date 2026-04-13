import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import ViewingDNA from '../components/dashboard/ViewingDNA';
import SessionHistory from '../components/dashboard/SessionHistory';
import StaggeredStack from '../components/dashboard/StaggeredStack';
import RecentMovieCard from '../components/dashboard/RecentMovieCard';
import BoxOfficeCard from '../components/dashboard/BoxOfficeCard';
import { StaggerList, StaggerListItem } from '../components/motion/PageTransition';
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';
import { movieService } from '../api/movieService';

const Dashboard = () => {
  const navigate = useNavigate();
  const { recentHistory } = useRecommendationHistory();
  const [boxOffice, setBoxOffice] = useState([]);

  // 박스오피스 데이터 페칭 (Task H)
  useEffect(() => {
    movieService.getBoxOffice()
      .then(res => {
        // 응답 데이터에서 상위 5개만 추출
        const top5 = Array.isArray(res.data) ? res.data.slice(0, 5) : [];
        setBoxOffice(top5);
      })
      .catch(err => {
        console.error('Failed to load box office data:', err);
        setBoxOffice([]); // 실패 시 빈 배열로 설정하여 섹션 숨김
      });
  }, []);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Hero: Viewing DNA */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold tracking-tight mb-2">My Deeping</h1>
              <p className="text-on-surface-variant text-lg max-w-xl">
                A mirror of your cinematic soul. Refined daily through your dialogue with the craft.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <button 
                onClick={() => navigate('/chat')}
                className="group flex items-center gap-3 ruby-gradient px-8 py-4 rounded-full text-on-primary font-bold cinematic-shadow hover:scale-105 transition-all"
              >
                <span>Start a new conversation</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Bento DNA Summary */}
          <ViewingDNA />
        </section>

        {/* --- 지난 추천 섹션 (Task F) --- */}
        {recentHistory.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Recommended Previously</h2>
                <p className="text-on-surface-variant text-xs mt-1 font-medium tracking-tight uppercase opacity-60">
                  Reflecting your past dialogues
                </p>
              </div>
            </div>
            <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentHistory.map((movie) => (
                <StaggerListItem key={movie.id}>
                  <RecentMovieCard movie={movie} />
                </StaggerListItem>
              ))}
            </StaggerList>
          </section>
        )}

        {/* Sessions by Mood */}
        <SessionHistory />

        {/* Visual "Curated For You" Stack */}
        <StaggeredStack />

        {/* --- 박스오피스 섹션: 지금 극장에서 (Task H) --- */}
        {boxOffice.length > 0 && (
          <section className="mt-24 pt-16 border-t border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold italic tracking-tight">지금 극장에서</h2>
                <p className="text-on-surface-variant text-[10px] mt-1 font-bold uppercase tracking-widest opacity-40">
                  Current Box Office TOP 5
                </p>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/40">KOBIS API REALTIME</span>
            </div>
            <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {boxOffice.map((movie, idx) => (
                <StaggerListItem key={movie.id || idx}>
                  <BoxOfficeCard movie={movie} rank={idx + 1} />
                </StaggerListItem>
              ))}
            </StaggerList>
          </section>
        )}
      </div>
    </PageTransition>
  );
};

export default Dashboard;
