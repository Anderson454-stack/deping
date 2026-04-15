import React from 'react';
import { useNavigate } from 'react-router-dom';

const ACTION_CHIPS = ['More like this', 'Slower pace', 'Surprise me'];

const RecommendationCard = ({ movie, onChipClick }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/movie/${movie.tmdb_id ?? movie.id ?? 1}`, { state: { movie } })}
      className="ml-12 mt-4 grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-surface-container-lowest rounded-xl cinematic-shadow group transition-all hover:scale-[1.02] max-w-xl cursor-pointer"
    >
      <div className="h-64 md:h-full relative overflow-hidden">
        <img 
          src={movie.image} 
          alt={movie.title} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span className="bg-primary-container text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
            New Entry
          </span>
        </div>
      </div>
      <div className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-xl font-bold tracking-tight text-on-surface">{movie.title}</h4>
            <div className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="text-xs font-bold">{movie.rating}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {movie.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-on-surface-variant leading-snug line-clamp-3">
            {movie.description}
          </p>
        </div>
        <div className="pt-4 flex items-center gap-3">
          <button className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-container transition-colors">
            Watch Trailer
          </button>
          <button className="p-2 border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">bookmark</span>
          </button>
        </div>

        {/* 기능 칩 */}
        {onChipClick && (
          <div
            className="flex flex-wrap gap-2 mt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {ACTION_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => onChipClick(chip)}
                style={{
                  fontSize: '12px',
                  border: '0.5px solid rgba(0,0,0,0.15)',
                  borderRadius: '12px',
                  padding: '4px 12px',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationCard;
