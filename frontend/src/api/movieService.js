// ─────────────────────────────────────────────────────────────
// movieService.js
// - getBoxOffice / getFeaturedMovies / getCommunityMovies: 실 API, 실패 시 빈 배열
// - getMovieDetail: 실 API 기반 상세 조회
// ─────────────────────────────────────────────────────────────

import { buildApiUrl } from './baseUrl';

// ── 공통 fetch 유틸 ────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(buildApiUrl(path), { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 서비스 객체 ────────────────────────────────────────────────

export const movieService = {
  /**
   * 영화 상세 정보
   * 실 API(/api/movies/{tmdb_id})
   */
  getMovieDetail: async (id) => apiFetch(`/api/movies/${id}`),

  /**
   * 박스오피스 TOP 10
   * 실 API(/api/boxoffice/daily) → 실패 시 빈 배열 (섹션 자체 숨김)
   */
  getBoxOffice: async () => {
    try {
      // 타임아웃 10s — 백엔드가 캐시 만료 시 KOBIS 직접 호출할 수 있으므로
      const res = await fetch(buildApiUrl('/api/boxoffice/daily'), {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { data: Array.isArray(data) ? data : [] };
    } catch (err) {
      console.warn('getBoxOffice 실패:', err.message);
      return { data: [] };
    }
  },

  /**
   * Viewing DNA 키워드 기반 커뮤니티 추천
   * 실 API(/api/movies/community) → 실패 시 빈 배열
   */
  getCommunityMovies: async (keywords = '', count = 6) => {
    try {
      const params = new URLSearchParams({ count });
      if (keywords) params.set('keywords', keywords);
      const data = await apiFetch(`/api/movies/community?${params}`);
      return { data: Array.isArray(data) ? data : [] };
    } catch (err) {
      console.error('getCommunityMovies 실패:', err);
      return { data: [] };
    }
  },

  /**
   * 오늘의 추천 영화 (매 호출마다 랜덤)
   * 실 API(/api/movies/featured) → 실패 시 빈 배열 (섹션 자체 숨김)
   */
  getFeaturedMovies: async (count = 7) => {
    try {
      const data = await apiFetch(`/api/movies/featured?count=${count}`);
      return { data: Array.isArray(data) ? data : [] };
    } catch (err) {
      console.error('getFeaturedMovies 실패:', err);
      return { data: [] };
    }
  },

  /**
   * 월별 테마 영화
   * 실 API(/api/movies/theme) → 실패 시 빈 구조 반환
   */
  getMonthlyTheme: async (month) => {
    try {
      const suffix = typeof month === 'number' ? `?month=${month}` : '';
      const data = await apiFetch(`/api/movies/theme${suffix}`);
      return {
        data: {
          month: data?.month ?? null,
          title: data?.title ?? null,
          message: data?.message ?? null,
          emoji: data?.emoji ?? null,
          movies: Array.isArray(data?.movies) ? data.movies : [],
        },
      };
    } catch (err) {
      console.error('getMonthlyTheme 실패:', err);
      return {
        data: { month: month ?? null, title: null, message: null, emoji: null, movies: [] },
      };
    }
  },
};

// ── 온보딩 카드 선택용 fetch 함수 ─────────────────────────────

export async function fetchMovieCards() {
  try {
    const data = await apiFetch('/api/movies/cards');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('fetchMovieCards 실패:', err);
    return [];
  }
}

export async function fetchDirectorCards() {
  try {
    const data = await apiFetch('/api/directors/cards');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('fetchDirectorCards 실패:', err);
    return [];
  }
}

export async function fetchActorCards() {
  try {
    const data = await apiFetch('/api/actors/cards');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('fetchActorCards 실패:', err);
    return [];
  }
}
