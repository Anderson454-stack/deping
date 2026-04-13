import React from 'react';

const DNACalibration = ({ value, onChange }) => {
  // artistry(예술성) 슬라이더 — Visual Poetics 대응
  const artistry = value?.artistry ?? 50;

  const handleChange = (e) => {
    onChange?.('artistry', Number(e.target.value));
  };

  const fillPercent = artistry;

  return (
    <div className="ml-12 mt-6 space-y-6 w-full max-w-2xl">
      <div className="bg-surface-container-low p-8 rounded-2xl">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-6">
          <span>Literal Narrative</span>
          <span>Abstract Poetics</span>
        </div>
        <div className="relative h-1 w-full bg-surface-container-highest rounded-full">
          {/* Progress fill */}
          <div
            className="absolute left-0 h-full bg-primary rounded-full transition-all"
            style={{ width: `${fillPercent}%` }}
          />
          {/* 숨겨진 range input — 실제 드래그 처리 */}
          <input
            type="range"
            min={0}
            max={100}
            value={artistry}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* 시각적 썸 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full cinematic-shadow cursor-pointer transition-transform hover:scale-110 pointer-events-none"
            style={{ left: `${fillPercent}%`, borderWidth: 4, borderStyle: 'solid', borderColor: 'var(--color-primary)' }}
          />
        </div>
        <div className="mt-6 flex items-center gap-2 text-on-surface-variant italic text-sm">
          <span className="material-symbols-outlined text-sm">info</span>
          <span>
            {artistry < 30
              ? 'Your setting leans towards "Direct Storytelling"'
              : artistry < 70
              ? 'Your setting leans towards "Atmospheric Pacing"'
              : 'Your setting leans towards "Abstract Poetics"'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DNACalibration;
