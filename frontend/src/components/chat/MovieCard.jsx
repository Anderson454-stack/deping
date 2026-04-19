import React from 'react';

const BarRow = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span
      style={{
        fontSize: 11,
        color: 'var(--color-on-surface-variant)',
        width: 34,
        flexShrink: 0,
        opacity: 0.7,
      }}
    >
      {label}
    </span>
    <div
      style={{
        flex: 1,
        height: 4,
        borderRadius: 2,
        background: 'var(--color-surface-container-highest)',
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          borderRadius: 2,
          background: color,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
    <span
      style={{
        fontSize: 11,
        color: 'var(--color-on-surface-variant)',
        width: 28,
        textAlign: 'right',
        opacity: 0.7,
      }}
    >
      {value}%
    </span>
  </div>
);

const CHIPS = ['More like this', 'Slower pace', 'Surprise me'];

const MovieCard = ({
  tmdb_id,
  title,
  year,
  genre,
  runtime,
  rating,
  reason,
  complexity,
  visual,
  poster_url,
  posterColor,
  isSaved = false,
  onToggleSave,
  onChipClick,
}) => {
  const handleSaveClick = (event) => {
    event.stopPropagation();
    onToggleSave?.();
  };

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--color-surface-container-lowest)',
        borderRadius: 16,
        overflow: 'hidden',
        maxWidth: 480,
        margin: '6px 0 6px 44px',
        boxShadow: 'var(--shadow-cinematic)',
      }}
    >
      <button
        type="button"
        onClick={handleSaveClick}
        aria-label={isSaved ? `${title} 저장 취소` : `${title} 저장`}
        aria-pressed={isSaved}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 36,
          height: 36,
          border: 'none',
          borderRadius: 999,
          background: 'var(--color-surface-raised)',
          color: isSaved ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1,
          boxShadow: 'var(--shadow-cinematic)',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
        >
          favorite
        </span>
      </button>

      <div style={{ display: 'flex', gap: 14, padding: '16px 16px 10px' }}>
        <div
          style={{
            width: 54,
            height: 76,
            borderRadius: 8,
            background: poster_url ? 'var(--color-surface-container-highest)' : posterColor,
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {poster_url ? (
            <img src={poster_url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: 20, opacity: 0.6 }}
            >
              movie
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
              paddingRight: 36,
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-on-surface)',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </h4>
              {tmdb_id ? (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 10,
                    color: 'var(--color-on-surface-variant)',
                    opacity: 0.6,
                  }}
                >
                  TMDB #{tmdb_id}
                </p>
              ) : null}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}
            >
              ★ {rating}
            </span>
          </div>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 11,
              color: 'var(--color-on-surface-variant)',
              opacity: 0.7,
            }}
          >
            {genre} · {runtime} · {year}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: 'var(--color-on-surface)',
              lineHeight: 1.55,
            }}
          >
            {reason}
          </p>
        </div>
      </div>

      <div style={{ padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <BarRow label="복잡도" value={complexity} color="var(--color-primary)" />
        <BarRow label="영상미" value={visual} color="var(--color-primary)" />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', flexWrap: 'wrap' }}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChipClick?.(chip)}
            style={{
              fontSize: 12,
              border: 'none',
              borderRadius: 12,
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
    </div>
  );
};

export default MovieCard;
