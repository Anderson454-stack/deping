import React from 'react';

const QuickButtons = ({ buttons, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 pl-11 mt-1 mb-3">
      {buttons.map((btn) => (
        <button
          key={btn}
          onClick={() => onSelect(btn)}
          className="transition-all hover:scale-[1.02] active:scale-95"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(142,0,4,0.22)',
            borderRadius: '20px',
            padding: '7px 18px',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-on-surface)',
            lineHeight: 1,
          }}
        >
          {btn}
        </button>
      ))}
    </div>
  );
};

export default QuickButtons;
