import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import ViewingDNA from '../components/dashboard/ViewingDNA';
import GlobalCinemaFeed from '../components/dashboard/GlobalCinemaFeed';
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

  // 신규 사용자용 예시 데이터 (Community DNA)
  const communityDna = [
    { id: 101, tmdb_id: 27205, title: 'Inception', title_ko: '인셉션', image: 'https://image.tmdb.org/t/p/w500/edv5CZvjR79upO8Ox6Y6Z8HQoQ.jpg', savedAt: new Date().toISOString() },
    { id: 102, tmdb_id: 155, title: 'The Dark Knight', title_ko: '다크 나이트', image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDp9QmSbmrK5S2vVv9S.jpg', savedAt: new Date().toISOString() },
    { id: 103, tmdb_id: 603, title: 'The Matrix', title_ko: '매트릭스', image: 'https://image.tmdb.org/t/p/w500/f89U3Y9S7egpq971ghYvU4db12W.jpg', savedAt: new Date().toISOString() },
  ];

  const displayHistory = recentHistory.length > 0 ? recentHistory : communityDna;
  const isNewUser = recentHistory.length === 0;

  // 박스오피스 데이터 페칭 (Task H)
  useEffect(() => {
    movieService.getBoxOffice()
      .then(res => {
        // 응답 데이터에서 상위 6개 추출 (3열 배치를 위해)
        const top6 = Array.isArray(res.data) ? res.data.slice(0, 6) : [];
        setBoxOffice(top6);
      })
      .catch(err => {
        console.error('Failed to load box office data:', err);
        setBoxOffice([]); 
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

        {/* --- 추천 섹션 --- */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                {isNewUser ? 'Community DNA' : 'Recommended Previously'}
              </h2>
              <p className="text-on-surface-variant text-xs mt-1 font-medium tracking-tight uppercase opacity-60">
                {isNewUser ? 'Popular choices from fellow cinephiles' : 'Reflecting your past dialogues'}
              </p>
            </div>
          </div>
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayHistory.map((movie) => (
              <StaggerListItem key={movie.id}>
                <RecentMovieCard movie={movie} />
              </StaggerListItem>
            ))}
          </StaggerList>
        </section>

        {/* Global Cinema Feed */}
        <GlobalCinemaFeed />

        {/* Visual "Curated For You" Stack */}
        <StaggeredStack />

        {/* --- 박스오피스 섹션 --- */}
        {boxOffice.length > 0 && (
          <section className="mt-24 pt-16 border-t border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold italic tracking-tight">지금 극장에서</h2>
                <p className="text-on-surface-variant text-[10px] mt-1 font-bold uppercase tracking-widest opacity-40">
                  Current Box Office Highlights
                </p>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/40">KOBIS API REALTIME</span>
            </div>
            <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
