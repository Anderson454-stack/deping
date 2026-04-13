import { useState, useCallback } from 'react';
import { chatService } from '../api/chatService';

// Mock 응답 목록
const MOCK_RESPONSES = [
  "Based on your DNA profile, I've analyzed thousands of titles to find your perfect match. The tension and emotional depth you're seeking points to something quite specific.",
  "Your Auteur DNA leans toward atmospheric storytelling. I'm detecting a strong affinity for films that balance kinetic energy with emotional resonance.",
  "Interesting calibration. With those settings, I'd steer you toward something that operates on multiple frequencies simultaneously — intellectually stimulating yet viscerally engaging.",
  "Your profile shows a preference for non-linear narrative structures paired with high production value. Let me refine my search accordingly.",
];

// Mock 스트리밍 타이핑 효과
async function* streamMockResponse(text) {
  const words = text.split(' ');
  for (const word of words) {
    yield word + ' ';
    await new Promise((res) => setTimeout(res, 60 + Math.random() * 40));
  }
}

let mockResponseIndex = 0;

/**
 * Deeping 채팅 훅
 * Mock 모드와 실 API 모드를 지원합니다.
 * @param {object} options
 * @param {boolean} options.useMock - Mock 모드 사용 여부 (VITE_API_BASE_URL 무시)
 * @param {object} options.dnaProfile - 현재 DNA 설정값 ({ tension, emotion, artistry })
 */
export function useChat({ useMock = true, dnaProfile = null } = {}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 메시지 전송 함수
   * @param {string} text - 사용자 입력 텍스트
   * @param {string} context - 이전 추천 히스토리 등 추가 컨텍스트 (Task F 대비)
   */
  const sendMessage = useCallback(
    async (text, context = null) => {
      if (!text.trim()) return;

      // 사용자 메시지 추가
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      if (useMock) {
        // --- Mock 스트리밍 모드 ---
        const responseText = MOCK_RESPONSES[mockResponseIndex % MOCK_RESPONSES.length];
        mockResponseIndex += 1;

        const aiMessageId = Date.now() + 1;
        // 빈 AI 메시지 먼저 추가 (스트리밍 상태)
        setMessages((prev) => [
          ...prev,
          {
            id: aiMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isStreaming: true,
          },
        ]);

        // 스트리밍 타이핑 효과 시뮬레이션
        let accumulated = '';
        try {
          for await (const chunk of streamMockResponse(responseText)) {
            accumulated += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: accumulated } : m
              )
            );
          }
          // 스트리밍 완료 처리
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, isStreaming: false } : m
            )
          );
        } catch (err) {
          setError("Mock streaming failed");
        } finally {
          setIsLoading(false);
        }
      } else {
        // --- 실 API 모드 (FastAPI 연동) ---
        try {
          const response = await chatService.sendMessage(text, dnaProfile, context);
          const data = response.data;

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: 'assistant',
              content: data.message || data.content || '',
              recommendations: data.recommendations || [], // 추천 목록 포함 (Task G 대비)
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isStreaming: false,
            },
          ]);
        } catch (err) {
          console.error('Deeping API Connection Error:', err);
          
          // 에러 메시지를 어시스턴트 버블로 표시 (Task E 작업 2)
          const errorMessage = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
          
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: 'assistant',
              content: errorMessage,
              isError: true, // 에러 플래그 추가
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          
          setError(err.message || "Failed to connect to server");
        } finally {
          setIsLoading(false);
        }
      }
    },
    [useMock, dnaProfile]
  );

  return { messages, isLoading, error, sendMessage };
}
