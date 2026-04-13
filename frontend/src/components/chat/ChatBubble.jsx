import React from 'react';

const ChatBubble = ({ role, message, time }) => {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} gap-2 mb-8`}>
      <div className="flex items-start gap-4 w-full">
        {isAssistant && (
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
          </div>
        )}
        <div 
          className={`
            px-5 py-3.5 rounded-xl cinematic-shadow max-w-[85%] md:max-w-[70%] leading-relaxed text-[1rem]
            ${isAssistant 
              ? 'bg-surface-container-high text-on-surface rounded-bl-sm' 
              : 'bg-primary text-on-primary rounded-br-sm'
            }
          `}
        >
          {message}
        </div>
      </div>
      <span className={`text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold ${isAssistant ? 'px-12' : 'px-1'}`}>
        {isAssistant ? 'Assistant' : 'Sent'} • {time}
      </span>
    </div>
  );
};

export default ChatBubble;
