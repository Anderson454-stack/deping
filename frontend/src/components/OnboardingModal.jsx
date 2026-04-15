import React, { useState } from 'react';
import { MOVIES, ACTORS, DIRECTORS } from '../data/cardSelectorData';

// 단계별 설정
const PHASES = [
  {
    key: 'movies',
    title: '좋아하는 영화를 선택하세요',
    subtitle: '많이 고를수록 추천이 더 정확해져요',
    items: MOVIES,
    icon: 'movie',
  },
  {
    key: 'actors',
    title: '좋아하는 배우를 선택하세요',
    subtitle: '선택하지 않아도 괜찮아요',
    items: ACTORS,
    icon: 'person',
  },
  {
    key: 'directors',
    title: '좋아하는 감독을 선택하세요',
    subtitle: '선택하지 않아도 괜찮아요',
    items: DIRECTORS,
    icon: 'movie_creation',
  },
];

// ── 개별 선택 카드 ─────────────────────────────────────────────
const SelectableCard = ({ item, icon, isSelected, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
    }}
  >
    {/* 원형 이미지 영역 */}
    <div style={{ position: 'relative' }}>
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: item.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: isSelected ? '2.5px solid #8B1A1A' : '2.5px solid transparent',
          outlineOffset: 2,
          transition: 'outline 0.15s, transform 0.1s',
          transform: isSelected ? 'scale(1.04)' : 'scale(1)',
        }}
      >
        {/*
          TODO: TMDB 이미지 연결 시 아래 img 태그로 교체
          <img
            src={`https://image.tmdb.org/t/p/w185${item.profile_path}`}
            alt={item.name}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        */}
        <span
          className="material-symbols-outlined"
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22 }}
        >
          {icon}
        </span>
      </div>

      {/* 선택 체크 뱃지 */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#8B1A1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 11,
              color: 'white',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            check
          </span>
        </div>
      )}
    </div>

    {/* 이름 텍스트 */}
    <span
      style={{
        fontSize: 12,
        textAlign: 'center',
        color: 'var(--color-on-surface)',
        lineHeight: 1.35,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        width: '100%',
        wordBreak: 'keep-all',
      }}
    >
      {item.name}
    </span>
  </div>
);

// ── 메인 모달 컴포넌트 ─────────────────────────────────────────
const OnboardingModal = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [selections, setSelections] = useState({ movies: [], actors: [], directors: [] });
  const [closing, setClosing] = useState(false);

  const current = PHASES[phase];

  // 카드 선택 토글 (이전 단계 선택 유지)
  const toggleItem = (id) => {
    setSelections((prev) => {
      const list = prev[current.key];
      return {
        ...prev,
        [current.key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });
  };

  // 다음 단계 or 완료
  const handleNext = () => {
    if (phase < PHASES.length - 1) {
      setPhase((p) => p + 1);
    } else {
      handleComplete();
    }
  };

  // 건너뛰기 (현재 선택 비우고 다음으로)
  const handleSkip = () => {
    if (phase < PHASES.length - 1) {
      setPhase((p) => p + 1);
    } else {
      handleComplete();
    }
  };

  // 완료: fade-out 후 콜백 실행
  const handleComplete = () => {
    setClosing(true);
    setTimeout(() => onComplete(selections), 200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
      // 외부 dim 클릭 시 닫히지 않음 (실수 방지)
    >
      <div
        style={{
          width: 'min(820px, 94vw)',
          maxHeight: '92vh',
          background: 'var(--color-background)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px -8px rgba(0,0,0,0.28)',
        }}
        // 내부 클릭이 외부로 전파되지 않도록 (dim 클릭 방지용)
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더: 스텝 인디케이터 + 타이틀 ─────────────────── */}
        <div style={{ padding: '36px 40px 0', flexShrink: 0 }}>
          {/* 스텝 인디케이터 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {PHASES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === phase ? '#8B1A1A' : 'var(--color-surface-container-highest)',
                  transition: 'background 0.25s',
                }}
              />
            ))}
          </div>

          {/* 타이틀 */}
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              lineHeight: 1.3,
            }}
          >
            {current.title}
          </h3>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 13,
              color: 'var(--color-on-surface-variant)',
              opacity: 0.65,
            }}
          >
            {current.subtitle}
          </p>
        </div>

        {/* ── 카드 그리드 (스크롤 가능) ──────────────────────── */}
        <div
          className="hide-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 40px 16px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '20px 12px',
            }}
          >
            {current.items.map((item) => (
              <SelectableCard
                key={item.id}
                item={item}
                icon={current.icon}
                isSelected={selections[current.key].includes(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </div>

        {/* ── 하단 버튼 ─────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            padding: '12px 40px 28px',
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
              opacity: 0.55,
              padding: '8px 4px',
            }}
          >
            건너뛰기
          </button>
          <button
            onClick={handleNext}
            style={{
              background: '#8B1A1A',
              color: 'white',
              border: 'none',
              borderRadius: 20,
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {phase === PHASES.length - 1 ? '선택 완료 →' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
