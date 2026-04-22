import React from 'react';
import { useRecommendationHistory } from '../../hooks/useRecommendationHistory';
import { analyzeViewingDNA } from '../../utils/viewingDnaAnalyzer';

function CardEmptyState({ title, description }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        gap: '8px',
        minHeight: '140px',
      }}
    >
      <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: 0, fontSize: '15px' }}>
        {title}
      </p>
      <p style={{ color: 'var(--color-text-primary)', opacity: 0.45, fontSize: '13px', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
        {description}
      </p>
    </div>
  );
}

const ViewingDNA = () => {
  const { dashboardSource } = useRecommendationHistory();
  const { movies, tags, summary, pulse } = analyzeViewingDNA(dashboardSource.movies);
  const hasAnyData = movies.length > 0;
  const hasEnoughData = movies.length >= 3;
  const pulseWidth = pulse.score ?? 0;
  const sourceLabel = dashboardSource.source === 'journal_fallback'
    ? 'Saved History'
    : 'Recommendation History';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {/* DNA Summary Card */}
      <div
        className="md:col-span-2 p-8 rounded-3xl cinematic-shadow relative overflow-hidden"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">{sourceLabel}</span>

          {hasAnyData ? (
            <>
              <h3 className="text-2xl font-bold mb-6">Your Viewing DNA</h3>
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <span key={tag} className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-8 text-on-surface-variant leading-relaxed">
                {summary}
              </p>
              {!hasEnoughData && (
                <p className="mt-3 text-xs text-on-surface-variant/60">
                  추천 데이터가 더 쌓이면 태그와 설명이 더 안정적으로 정리됩니다.
                </p>
              )}
            </>
          ) : (
            <CardEmptyState
              title="아직 추천 데이터가 없어요"
              description={"챗봇과 대화를 시작하면\n추천 패턴을 바탕으로 취향을 요약해드릴게요."}
            />
          )}
        </div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Curation Score Card */}
      <div
        className="p-8 rounded-3xl cinematic-shadow flex flex-col justify-between"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">Active Pulse</span>
          {hasAnyData && <h3 className="text-2xl font-bold">최근 추천 성향 응집도</h3>}
        </div>

        {hasAnyData ? (
          <>
            <div className="py-4">
              <div className="text-6xl font-black text-primary tracking-tighter">
                {pulse.score ?? '--'}
                {pulse.score != null && <span className="text-2xl opacity-50">%</span>}
              </div>
              <p className="text-on-surface-variant text-sm mt-2">{pulse.label}</p>
              <p className="text-on-surface-variant/70 text-xs mt-2 leading-relaxed">{pulse.description}</p>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${pulseWidth}%` }}
              />
            </div>
          </>
        ) : (
          <CardEmptyState
            title="아직 패턴을 읽을 데이터가 없어요"
            description={"최근 추천이 쌓이면\n취향 축의 선명도를 계산해드릴게요."}
          />
        )}
      </div>
    </div>
  );
};

export default ViewingDNA;
