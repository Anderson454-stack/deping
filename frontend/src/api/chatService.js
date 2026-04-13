import apiClient from './client';

/**
 * Deeping API 서비스
 * FastAPI 백엔드 엔드포인트와 통신합니다.
 */
export const chatService = {
  /**
   * 사용자 메시지를 전송하고 Agent 응답을 수신합니다. (Agent 1)
   * @param {string} text - 사용자 입력 텍스트
   * @param {object} dnaProfile - 사용자의 현재 DNA 설정값
   * @param {string} context - 이전 추천 히스토리 등 추가 컨텍스트 (Task F)
   */
  sendMessage: (text, dnaProfile, context = null) => {
    const payload = { 
      message: text, 
      dna_profile: dnaProfile,
      agent_context: context 
    };
    return apiClient.post('/api/chat', payload);
  },

  /**
   * DNA 프로필을 바탕으로 최종 추천 3편을 요청합니다. (Agent 2, 3)
   * @param {object} dnaProfile - 완성된 DNA 프로필
   */
  getRecommendations: (dnaProfile) => {
    return apiClient.post('/api/recommend', { dna_profile: dnaProfile });
  },

  /**
   * 특정 영화의 상세 정보를 조회합니다. (Task F/G 대비)
   * @param {string|number} id - TMDB ID 또는 내부 ID
   */
  getMovieDetail: (id) => {
    return apiClient.get(`/api/movies/${id}`);
  },

  /**
   * 현재 상영 중인 영화 목록을 조회합니다. (Task H 대비)
   * @param {number} limit - 조회할 개수
   */
  getNowPlaying: (limit = 10) => {
    return apiClient.get('/api/movies/now-playing', { params: { limit } });
  }
};
