import React from 'react';
import { useRecommendationHistory } from '../../hooks/useRecommendationHistory';

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
  const { hasHistory } = useRecommendationHistory();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {/* DNA Summary Card */}
      <div
        className="md:col-span-2 p-8 rounded-3xl cinematic-shadow relative overflow-hidden"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">Current Profile</span>

          {hasHistory ? (
            <>
              <h3 className="text-2xl font-bold mb-6">Your Viewing DNA</h3>
              <div className="flex flex-wrap gap-3">
                {['Noir Minimalism', '90s Hong Kong', 'Surrealist Narrative', 'Technicolor Epics'].map((tag) => (
                  <span key={tag} className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-8 text-on-surface-variant italic leading-relaxed">
                "You seem to be gravitating towards high-contrast visual storytelling with a preference for non-linear timelines and isolationist character arcs."
              </p>
            </>
          ) : (
            <CardEmptyState
              title="아직 데이터가 없어요!"
              description={"챗봇과 대화 이후\n당신의 데이터를 보여드릴게요~!"}
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
          {hasHistory && <h3 className="text-2xl font-bold">Curation Score</h3>}
        </div>

        {hasHistory ? (
          <>
            <div className="py-4">
              <div className="text-6xl font-black text-primary tracking-tighter">
                84<span className="text-2xl opacity-50">%</span>
              </div>
              <p className="text-on-surface-variant text-sm mt-2">Alignment with critical consensus</p>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-[84%]"></div>
            </div>
          </>
        ) : (
          <CardEmptyState
            title="아직 데이터가 없어요!"
            description={"챗봇과 대화 이후에\n당신의 데이터를 보여드릴게요!"}
          />
        )}
      </div>
    </div>
  );
};

export default ViewingDNA;
