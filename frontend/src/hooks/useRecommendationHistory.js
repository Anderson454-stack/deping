import { useState, useEffect } from 'react';

const STORAGE_KEY = 'deeping_rec_history';
const MAX_STORED = 10;    // 저장 최대 편수
const DISPLAY_COUNT = 3;  // 화면 표시 편수 (대시보드용)

/**
 * 추천 히스토리 관리 훅
 * 로컬 스토리지를 사용하여 최근 추천받은 영화를 저장하고 관리합니다.
 */
export function useRecommendationHistory() {
  const [history, setHistory] = useState([]);

  // 초기 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch (err) {
      console.error('Failed to load recommendation history:', err);
      setHistory([]);
    }
  }, []);

  /**
   * 새로운 추천 영화들을 히스토리에 저장
   * @param {Array} movies - 추천받은 영화 객체 배열
   */
  const saveRecommendations = (movies) => {
    if (!movies || movies.length === 0) return;

    const timestamp = new Date().toISOString();
    // 중복 제거 및 데이터 정제
    const newEntries = movies.map((m) => ({
      id: m.id,
      tmdb_id: m.tmdb_id || m.id,
      title: m.title,
      title_ko: m.title_ko || m.title,
      poster_path: m.poster_path,
      image: m.image || (m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null),
      savedAt: timestamp
    }));

    setHistory((prev) => {
      // 기존 히스토리와 합치고 중복 ID 제거 (최신 우선)
      const combined = [...newEntries, ...prev];
      const unique = combined.filter((movie, index, self) =>
        index === self.findIndex((m) => m.id === movie.id)
      );
      
      const updated = unique.slice(0, MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Agent 1(프로파일러)에게 주입할 컨텍스트 문자열 생성
   * FastAPI /api/chat 요청의 agent_context로 사용됩니다.
   */
  const getContextForAgent = () => {
    if (history.length === 0) return null;
    const recent = history.slice(0, DISPLAY_COUNT);
    const titles = recent.map((m) => m.title_ko || m.title).join(', ');
    return `사용자가 이전에 추천받은 영화: ${titles}. 대화 시 자연스럽게 참고하여 친근하게 대화하세요.`;
  };

  /**
   * 히스토리 전체 삭제
   */
  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return {
    history,
    recentHistory: history.slice(0, DISPLAY_COUNT),
    saveRecommendations,
    getContextForAgent,
    clearHistory,
  };
}
