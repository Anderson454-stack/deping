import React, { useState, useRef, useEffect } from 'react';
import { PageTransition } from '../components/motion/PageTransition';
import { useChat } from '../hooks/useChat';
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';
import ChatBubble from '../components/chat/ChatBubble';
import RecommendationCard from '../components/chat/RecommendationCard';
import ChatInput from '../components/chat/ChatInput';
import DNACalibration from '../components/chat/DNACalibration';

const ChatGuide = () => {
  const [dnaProfile, setDnaProfile] = useState({
    tension: 50,
    emotion: 50,
    artistry: 50,
  });

  const { saveRecommendations, getContextForAgent } = useRecommendationHistory();

  const { messages, isLoading, sendMessage } = useChat({
    useMock: true,
    dnaProfile,
  });

  const messagesEndRef = useRef(null);

  // 새 메시지 도착 시 하단 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI 응답 수신 시 추천 영화 히스토리에 저장 (Task F)
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && !lastMsg.isStreaming && lastMsg.recommendations?.length > 0) {
      saveRecommendations(lastMsg.recommendations);
    }
  }, [messages]);

  /**
   * 메시지 전송 핸들러
   * 히스토리 컨텍스트를 함께 전달합니다.
   */
  const handleSend = (text) => {
    const context = getContextForAgent(); // 이전 추천 기록 요약 (null일 수 있음)
    sendMessage(text, context);
  };

  const movieData = {
    title: 'The Neon Labyrinth',
    rating: '8.4',
    tags: ['Sci-Fi', 'Thriller', '98 min'],
    description: 'In a city that never sleeps, a digital courier must navigate a deadly maze of corporate espionage to deliver a secret that could collapse the net.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAk5JilJvlyrvqos6DPpheXhn9e7r7Wke4EckRzShufLAPQr3bbYdGR7vvOrS8WakoCm2MpA6iA8f8TBwHIP_NafCpvXlV36eORLkuT2XixkApABpoMPhNGuP70rCFLsHQBrUfrSzmDtj2L2pakUsUS46PPrhlbsXI8A_jTtvd0hW5nnKypce8KtnfFrgCYcILfuBgxn2cDpyvMqm-BwfSGJYAQHGhEZZcbojuT085zHxy9B2vE2gUkiD5d_RsZvTMUh2Fo9gWsr0'
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-8rem)] relative">
        {/* Chat Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0 custom-scrollbar">
          <div className="max-w-3xl mx-auto py-10">
            {/* Header */}
            <div className="flex flex-col items-center mb-16 text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center cinematic-shadow mb-4">
                <span className="material-symbols-outlined text-white text-3xl">movie_filter</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-on-surface mb-2">AI Cinema Guide</h1>
              <p className="text-on-surface-variant max-w-sm">Crafting your evening through editorial-grade film curation.</p>
            </div>

            {/* 고정 예시 대화 */}
            <ChatBubble
              role="user"
              message="I'm in the mood for something intense but not too complex. Fast pacing is a must."
              time="2:14 PM"
            />

            <div className="space-y-4">
              <ChatBubble
                role="assistant"
                message={
                  <>
                    Got it. You prefer high-tension with linear plots. Based on your <span className="text-primary font-bold">Auteur DNA</span>, I recommend <span className="italic">'The Neon Labyrinth'</span>. It's a sci-fi thriller with relentless momentum.
                  </>
                }
                time="2:15 PM"
              />
              <RecommendationCard movie={movieData} />
            </div>

            <div className="h-12" />

            <div className="space-y-4">
              <ChatBubble
                role="assistant"
                message="Understood. Logical complexity elevated. Let's calibrate the 'Visual Poetics'. How much weight should I give to abstract visual storytelling versus narrative directness?"
                time="2:16 PM"
              />
              <DNACalibration
                value={dnaProfile}
                onChange={(key, val) =>
                  setDnaProfile((prev) => ({ ...prev, [key]: val }))
                }
              />
            </div>

            <div className="h-8" />

            {/* useChat으로 전송된 실시간 메시지 */}
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <ChatBubble
                  role={msg.role}
                  message={msg.content}
                  time={msg.timestamp}
                  isError={msg.isError}
                />
                {/* AI 응답에 추천 영화가 포함되어 있으면 카드 렌더링 (Task G에서 고도화 예정) */}
                {msg.recommendations?.map((movie) => (
                  <RecommendationCard key={movie.id} movie={movie} />
                ))}
              </React.Fragment>
            ))}

            {isLoading && (
              <div className="flex gap-2 ml-4 mt-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} className="h-24" />
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="sticky bottom-0 left-0 w-full z-10">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </PageTransition>
  );
};

export default ChatGuide;
