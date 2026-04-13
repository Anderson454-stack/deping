import React, { useState } from 'react';

const ChatInput = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const suggestions = ["More like this", "Slower pace", "Analyze my mood", "Surprise me"];

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
    <div className="w-full bg-gradient-to-t from-background via-background/90 to-transparent pt-10 pb-8 px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map(chip => (
            <button
              key={chip}
              onClick={() => onSend?.(chip)}
              disabled={isLoading}
              className="px-4 py-1.5 rounded-full border border-outline-variant/20 bg-surface-container-lowest text-xs font-semibold text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Main Input Bar */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-surface-container-lowest rounded-full p-2 cinematic-shadow" style={{ border: '1px solid color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
            <button className="p-3 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-on-surface placeholder:text-on-surface-variant/60 font-medium"
              placeholder="Tell me what you're craving..."
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
        <p className="text-[10px] text-center text-on-surface-variant/40 font-medium tracking-wide">
          Deeping AI uses curated data to refine your cinematic DNA.
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
