import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 최근 추천 영화 카드 컴포넌트 (Task F)
 * 디자인 규칙: No-Line Rule, Cinematic Shadow 적용
 */
const RecentMovieCard = ({ movie }) => {
  const navigate = useNavigate();

  // 날짜 계산 (예: 2일 전)
  const getDaysAgo = (dateStr) => {
    const savedDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - savedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '오늘 추천' : `${diffDays - 1}일 전 추천`;
  };

  return (
    <div 
      onClick={() => navigate(`/movie/${movie.tmdb_id || movie.id}`, { state: { movie } })}
      className="group bg-surface-raised p-3 rounded-2xl cinematic-shadow cursor-pointer transition-all hover:scale-[1.02]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl mb-3">
        {movie.image ? (
          <img 
            src={movie.image} 
            alt={movie.title_ko || movie.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-outline-variant">movie</span>
          </div>
        )}
      </div>
      <div className="px-1">
        <h4 className="font-bold text-sm text-on-surface truncate mb-1">
          {movie.title_ko || movie.title}
        </h4>
        <p className="text-[10px] text-on-surface-variant/60 font-medium tracking-tight">
          {getDaysAgo(movie.savedAt)}
        </p>
      </div>
    </div>
  );
};

export default RecentMovieCard;
