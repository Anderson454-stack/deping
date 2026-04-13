import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 박스오피스 TOP 5 카드 컴포넌트 (Task H)
 * 보조적인 UI로서 작고 심플한 디자인 적용
 * 디자인 규칙: No-Line Rule, Cinematic Shadow 배지 적용
 */
const BoxOfficeCard = ({ movie, rank }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/movie/${movie.tmdb_id || movie.id}`)}
      className="group relative bg-surface-container-low rounded-3xl p-4 cinematic-shadow cursor-pointer hover:bg-surface-container-high transition-all h-full flex flex-col"
    >
      {/* 순위 배지 (Cinematic Style) */}
      <div className="absolute top-6 left-6 z-10 w-10 h-10 ruby-gradient text-white text-lg font-black rounded-full flex items-center justify-center shadow-xl border-2 border-white/10 group-hover:scale-110 transition-transform">
        {rank}
      </div>

      {/* 대형 포스터 */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl mb-4 bg-surface-container-highest">
        {(movie.image || movie.poster_path) ? (
          <img 
            src={movie.image || `https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
            alt={movie.title_ko || movie.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-outline-variant text-4xl">movie</span>
          </div>
        )}
        
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* 영화 정보 */}
      <div className="px-2 pb-2">
        <h4 className="font-bold text-lg text-on-surface truncate mb-1 group-hover:text-primary transition-colors">
          {movie.title_ko || movie.title}
        </h4>
        <div className="flex items-center justify-between">
          <p className="text-xs text-on-surface-variant/80 font-medium">
            {movie.audi_acc ? `누적 ${Number(movie.audi_acc).toLocaleString()}명` : '상영 중'}
          </p>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
            TOP {rank}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BoxOfficeCard;
