import React from 'react';

const ChatBubble = ({ role, message, time }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex flex-col gap-2 mb-8 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* AI 아바타 (AI 메시지일 때만) */}
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
          </div>
        )}

        {/* 말풍선 */}
        <div
          className={`
            px-5 py-3.5 rounded-xl cinematic-shadow
            max-w-[80%] md:max-w-[68%]
            leading-relaxed text-[1rem]
            break-words overflow-wrap-anywhere
            ${isUser
              ? 'bg-primary text-on-primary rounded-br-sm'
              : 'bg-surface-container-high text-on-surface rounded-bl-sm'
            }
          `}
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {message}
        </div>
      </div>

      {/* 시간 표시 */}
      <span
        className={`text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold ${
          isUser ? 'pr-1' : 'pl-11'
        }`}
      >
        {isUser ? 'Sent' : 'Assistant'} • {time}
      </span>
    </div>
  );
};

export default ChatBubble;
