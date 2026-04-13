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
      className="group flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl cursor-pointer transition-all hover:bg-surface-container-high"
    >
      {/* 작은 포스터 썸네일 */}
      <div className="relative shrink-0 w-16 h-24 overflow-hidden rounded-xl bg-surface-container-highest">
        {(movie.image || movie.poster_path) ? (
          <img 
            src={movie.image || `https://image.tmdb.org/t/p/w200${movie.poster_path}`} 
            alt={movie.title_ko || movie.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-outline-variant text-sm">movie</span>
          </div>
        )}
        {/* 순위 배지 (24px 원형) */}
        <div className="absolute top-1 left-1 w-6 h-6 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center cinematic-shadow">
          {rank}
        </div>
      </div>

      {/* 영화 정보 */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="font-bold text-xs text-on-surface truncate mb-1">
          {movie.title_ko || movie.title}
        </h4>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-on-surface-variant/60 font-medium tracking-tight">
            {movie.audi_acc ? `누적 ${Number(movie.audi_acc).toLocaleString()}명` : '상영 중'}
          </p>
          <p className="text-[9px] text-on-surface-variant/40 font-medium uppercase tracking-tighter">
            Box Office TOP {rank}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BoxOfficeCard;
