import React, { useState } from 'react';

const ReasoningLog = ({ logs }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ margin: '2px 0 12px 44px', maxWidth: 480 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          color: 'var(--color-on-surface-variant)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          opacity: 0.6,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
        디핑의 생각 보기
      </button>

      {open && (
        <div
          style={{
            marginTop: 6,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--color-surface-container)',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 12,
            lineHeight: 1.8,
            color: 'var(--color-on-surface)',
          }}
        >
          {logs.map((log, i) => (
            <div key={i}>
              <span
                style={{
                  fontWeight: 700,
                  color: log.verdict === 'accept' ? '#16a34a' : '#dc2626',
                }}
              >
                {log.verdict === 'accept' ? '✓' : '✕'}
              </span>{' '}
              <span style={{ fontWeight: 700 }}>{log.movie}</span>
              {' — '}
              <span style={{ opacity: 0.75 }}>{log.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReasoningLog;
