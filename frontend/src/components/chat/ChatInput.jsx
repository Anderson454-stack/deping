import React, { useState } from 'react';

/**
 * ChatInput
 *
 * props:
 *   onSend(text)           - 전송 콜백 (text가 빈 문자열일 수도 있음)
 *   isLoading              - 전송/분석 중 비활성화 여부
 *   placeholder            - 입력창 힌트 텍스트
 *   quickButtons           - 위에 표시할 버튼 목록: string[] | {label, maps?, action?}[]
 *   selectedButton         - 현재 선택된 버튼 객체 (선택 강조용)
 *   onQuickButtonClick(btn) - 버튼 클릭 콜백
 */
const ChatInput = ({
  onSend,
  isLoading = false,
  placeholder = "Tell me what you're craving...",
  quickButtons = [],
  selectedButton = null,
  onQuickButtonClick,
}) => {
  const [text, setText] = useState('');

  // 퀵버튼 선택됐거나 텍스트가 있으면 전송 가능
  const canSend = !!text.trim() || selectedButton !== null;

  const handleSend = () => {
    if (!canSend || isLoading) return;
    onSend?.(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="w-full"
      style={{
        background: 'var(--color-background)',
        padding: '0 12px 12px',
      }}
    >
      <div className="max-w-3xl mx-auto">

        {/* 퀵버튼 행 — 있을 때만 표시 */}
        {quickButtons.length > 0 && (
          <div className="flex flex-wrap gap-2 py-2">
            {quickButtons.map((btn) => {
              const label  = typeof btn === 'string' ? btn : btn.label;
              const isSelected =
                selectedButton !== null &&
                (typeof selectedButton === 'string'
                  ? selectedButton === label
                  : selectedButton.label === label);

              return (
                <button
                  key={label}
                  onClick={() => onQuickButtonClick?.(btn)}
                  disabled={isLoading}
                  className="transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    border: isSelected
                      ? '1px solid rgba(142,0,4,0.55)'
                      : '1px solid rgba(142,0,4,0.22)',
                    borderRadius: '20px',
                    padding: '7px 18px',
                    background: isSelected ? 'rgba(142,0,4,0.06)' : 'transparent',
                    cursor: isLoading ? 'default' : 'pointer',
                    color: isSelected ? '#8B1A1A' : 'var(--color-on-surface)',
                    lineHeight: 1,
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  {isSelected && '✓ '}{label}
                </button>
              );
            })}
          </div>
        )}

        {/* 입력창 */}
        <div
          className="relative group"
          style={{ paddingTop: quickButtons.length > 0 ? 0 : '8px' }}
        >
          <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div
            className="relative flex items-center p-2 cinematic-shadow chat-input-box"
            style={{
              borderRadius: '24px',
              background: 'var(--color-background)',
            }}
          >
            <button className="p-3 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-on-surface placeholder:text-on-surface-variant/60 font-medium"
              placeholder={placeholder}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !canSend}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white cinematic-shadow hover:bg-primary-container transition-all active:scale-95 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">
                {isLoading ? 'hourglass_empty' : 'send'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatInput;
