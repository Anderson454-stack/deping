// ─────────────────────────────────────────────────────────────
// movieService.js
// - getBoxOffice / getFeaturedMovies / getCommunityMovies: 실 API, 실패 시 빈 배열
// - getMovieDetail: 실 API → 실패 시 하드코딩 3편 fallback (상세 페이지 전용)
// ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Mock (상세 페이지 fallback 전용 — 목록 API에는 사용 안 함) ─

const MOCK_MOVIES = {
  157336: { tmdb_id: 157336, title: '인터스텔라', title_ko: '인터스텔라',
    image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    genres: ['Sci-Fi', 'Drama'], runtime: 169, year: 2014,
    overview: '머지않은 미래, 지구는 극심한 식량난에 시달리고 있다.' },
  496243: { tmdb_id: 496243, title: '기생충', title_ko: '기생충',
    image: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    genres: ['Thriller', 'Drama'], runtime: 132, year: 2019,
    overview: '전원 백수로 살 길 막막하지만 사이좋은 기택 가족.' },
};

const findMovieFallback = (id) => MOCK_MOVIES[id] ?? MOCK_MOVIES[157336];

// ── 공통 fetch 유틸 ────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── 서비스 객체 ────────────────────────────────────────────────

export const movieService = {
  /**
   * 영화 상세 정보
   * 실 API(/api/movies/{tmdb_id}) → 실패 시 최소 fallback
   */
  getMovieDetail: async (id) => {
    try {
      const data = await apiFetch(`/api/movies/${id}`);
      return { data };
    } catch {
      return { data: findMovieFallback(Number(id)) };
    }
  },

  /**
   * 박스오피스 TOP 10
   * 실 API(/api/boxoffice/daily) → 실패 시 빈 배열 (섹션 자체 숨김)
   */
  getBoxOffice: async () => {
    try {
      const data = await apiFetch('/api/boxoffice/daily');
      return { data: Array.isArray(data) ? data : [] };
    } catch (err) {
      console.error('getBoxOffice 실패:', err);
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
};
