import React, { useState } from 'react';

const ChatInput = ({ onSend, isLoading, placeholder = "Tell me what you're craving..." }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
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
        padding: '8px 12px 12px',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Main Input Bar */}
        <div className="relative group">
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
              disabled={isLoading || !text.trim()}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white cinematic-shadow hover:bg-primary-container transition-all active:scale-95 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">{isLoading ? 'hourglass_empty' : 'send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
