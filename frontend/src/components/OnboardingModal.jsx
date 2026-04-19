import React, { useState } from 'react';
import CardSelector from './chat/CardSelector';

const PHASES = [
  {
    key: 'movies',
    type: 'movie',
    title: '좋아하는 영화를 선택하세요',
    subtitle: '많이 고를수록 추천이 더 정확해져요',
  },
  {
    key: 'actors',
    type: 'actor',
    title: '좋아하는 배우를 선택하세요',
    subtitle: '선택하지 않아도 괜찮아요',
  },
  {
    key: 'directors',
    type: 'director',
    title: '좋아하는 감독을 선택하세요',
    subtitle: '선택하지 않아도 괜찮아요',
  },
];

const OnboardingModal = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [selections, setSelections] = useState({ movies: [], actors: [], directors: [] });
  const [closing, setClosing] = useState(false);

  const current = PHASES[phase];
  const isLastPhase = phase === PHASES.length - 1;

  // CardSelector "선택 완료" → 다음 단계 or 전체 완료
  const handlePhaseComplete = (names) => {
    const newSelections = { ...selections, [current.key]: names };
    setSelections(newSelections);

    if (!isLastPhase) {
      setPhase((p) => p + 1);
    } else {
      setClosing(true);
      setTimeout(() => onComplete(newSelections), 200);
    }
  };

  // 건너뛰기 — 현재 단계 선택 없이 진행
  const handleSkip = () => {
    if (!isLastPhase) {
      setPhase((p) => p + 1);
    } else {
      setClosing(true);
      setTimeout(() => onComplete(selections), 200);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          width: 'min(680px, 95vw)',
          maxHeight: '90vh',
          background: 'var(--color-surface)',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px -8px rgba(0,0,0,0.28)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ─────────────────────────────────────────── */}
        <div style={{ padding: '28px 24px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            {PHASES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background:
                    i === phase
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-container-highest)',
                  transition: 'background 0.25s',
                }}
              />
            ))}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              lineHeight: 1.3,
            }}
          >
            {current.title}
          </h3>
          <p
            style={{
              margin: '5px 0 0',
              fontSize: 13,
              color: 'var(--color-on-surface-variant)',
              opacity: 0.65,
            }}
          >
            {current.subtitle}
          </p>
        </div>

        {/* ── CardSelector ─────────────────────────────────── */}
        {/* key={phase}: 페이즈 전환 시 CardSelector 상태(선택·노출목록) 초기화 */}
        <div
          className="hide-scrollbar"
          style={{ flex: 1, overflowY: 'auto', padding: '0 24px 8px' }}
        >
          <CardSelector
            key={phase}
            type={current.type}
            onComplete={handlePhaseComplete}
          />
        </div>

        {/* ── 건너뛰기 ─────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 24px 24px',
          }}
        >
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--color-on-surface-variant)',
              opacity: 0.5,
              padding: '6px 12px',
            }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
