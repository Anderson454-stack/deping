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
        background: 'rgba(0,0,0,0.08)',
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
  title,
  year,
  genre,
  runtime,
  rating,
  reason,
  complexity,
  visual,
  posterColor,
  onChipClick,
}) => {
  return (
    <div
      style={{
        background: 'var(--color-surface-container-lowest)',
        borderRadius: 16,
        overflow: 'hidden',
        maxWidth: 480,
        margin: '6px 0 6px 44px',
        boxShadow: 'var(--shadow-cinematic)',
      }}
    >
      {/* 상단: 포스터 + 정보 */}
      <div style={{ display: 'flex', gap: 14, padding: '16px 16px 10px' }}>
        {/* 포스터 */}
        <div
          style={{
            width: 54,
            height: 76,
            borderRadius: 8,
            background: posterColor,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: 'rgba(255,255,255,0.35)', fontSize: 20 }}
          >
            movie
          </span>
        </div>

        {/* 텍스트 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
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

      {/* 복잡도 / 영상미 바 */}
      <div style={{ padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <BarRow label="복잡도" value={complexity} color="#e05c5c" />
        <BarRow label="영상미" value={visual} color="var(--color-primary)" />
      </div>

      {/* 기능 칩 */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', flexWrap: 'wrap' }}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onChipClick?.(chip)}
            style={{
              fontSize: 12,
              border: '0.5px solid rgba(0,0,0,0.15)',
              borderRadius: 12,
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
    </div>
  );
};

export default MovieCard;
