import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecommendationHistory } from '../../hooks/useRecommendationHistory';

const ACTION_CHIPS = ['More like this', 'Slower pace', 'Surprise me'];

const RecommendationCard = ({ movie, onChipClick }) => {
  const navigate = useNavigate();
  const { isMovieSaved, toggleJournalMovie } = useRecommendationHistory();
  const saved = isMovieSaved(movie.tmdb_id ?? movie.id);

  const handleToggleSave = (event) => {
    event.stopPropagation();
    const nextSaved = toggleJournalMovie(movie);
    window.dispatchEvent(new CustomEvent('deping:toast', {
      detail: { message: nextSaved ? '저장되었어요!' : '저장을 취소했어요.' },
    }));
  };

  return (
    <div
      onClick={() => navigate(`/movie/${movie.tmdb_id ?? movie.id ?? 1}`, { state: { movie } })}
      className="ml-12 mt-4 grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-surface-container-lowest rounded-xl cinematic-shadow group transition-all hover:scale-[1.02] max-w-xl cursor-pointer"
    >
      <div className="h-64 md:h-full relative overflow-hidden">
        {movie.image ? (
          <img
            src={movie.image}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">movie</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter"
            style={{ background: 'var(--color-surface-raised)', color: 'var(--color-primary)' }}
          >
            New Entry
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleSave}
          aria-label={saved ? `${movie.title} 저장 취소` : `${movie.title} 저장`}
          aria-pressed={saved}
          className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--color-surface-raised)',
            color: saved ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
            boxShadow: 'var(--shadow-cinematic)',
          }}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
      </div>
      <div className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2 gap-3">
            <h4 className="text-xl font-bold tracking-tight text-on-surface">{movie.title}</h4>
            <div className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="text-xs font-bold">{movie.rating}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {(movie.tags || []).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-on-surface-variant px-2 py-1 rounded uppercase"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-on-surface-variant leading-snug line-clamp-3">
            {movie.description}
          </p>
          {movie.overview_ko && (
            <p
              className="text-xs leading-relaxed mt-2 line-clamp-3"
              style={{ color: 'var(--color-text-primary)', opacity: 0.5 }}
            >
              {movie.overview_ko}
            </p>
          )}
        </div>
        <div className="pt-4 flex items-center gap-3">
          <button
            type="button"
            className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-container transition-colors"
          >
            Watch Trailer
          </button>
          <button
            type="button"
            onClick={handleToggleSave}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--color-surface-raised)' }}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{
                color: saved ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              favorite
            </span>
          </button>
        </div>

        {onChipClick && (
          <div
            className="flex flex-wrap gap-2 mt-3"
            onClick={(event) => event.stopPropagation()}
          >
            {ACTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipClick(chip)}
                style={{
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  background: 'var(--color-surface-raised)',
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
