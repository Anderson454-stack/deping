// ─────────────────────────────────────────────────────────────
// movieService.js
// FastAPI 백엔드 미준비 상태 → 전 함수 Mock 데이터로 동작
// 실 연동 시: 각 함수 본문을 apiClient 호출로 교체할 것
// ─────────────────────────────────────────────────────────────

// ── Mock 데이터 ────────────────────────────────────────────────

const MOCK_MOVIES = {
  1: {
    id: 1,
    tmdb_id: 157336,
    title: 'Interstellar',
    title_ko: '인터스텔라',
    image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    runtime: 169,
    year: 2014,
    overview_ko: '머지않은 미래, 지구는 극심한 식량난에 시달리고 있다. 전직 NASA 파일럿 쿠퍼는 딸 머피와 함께 살고 있다. 어느 날 정체불명의 신호를 발견한 쿠퍼는 비밀리에 운영 중인 NASA 기지를 찾게 된다.',
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    is_theater: false,
  },
  2: {
    id: 2,
    tmdb_id: 496243,
    title: 'Parasite',
    title_ko: '기생충',
    image: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    genres: ['Thriller', 'Drama', 'Comedy'],
    runtime: 132,
    year: 2019,
    overview_ko: '전원 백수로 살 길 막막하지만 사이좋은 기택 가족. 장남 기우가 친구의 소개로 부유한 박 사장 집에 영어 과외 선생님으로 들어가게 되면서 두 가족은 예상치 못한 만남을 갖게 된다.',
    overview: 'All unemployed, Ki-taek\'s family takes a peculiar interest in the wealthy and glamorous Park family.',
    is_theater: false,
  },
  3: {
    id: 3,
    tmdb_id: 545611,
    title: 'Everything Everywhere All at Once',
    title_ko: '에브리씽 에브리웨어 올 앳 원스',
    image: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    genres: ['Sci-Fi', 'Action', 'Comedy'],
    runtime: 139,
    year: 2022,
    overview_ko: '평범한 세탁소 주인 에블린은 어느 날 무한한 멀티버스를 탐험하며 삶의 가장 위대한 미스터리를 해결하기 위한 예상치 못한 여정을 시작한다.',
    overview: 'An aging Chinese immigrant is swept up in an insane adventure where she alone can save the world.',
    is_theater: false,
  },
};

// id를 못 찾으면 첫 번째 영화를 기본으로 반환
const findMovie = (id) => MOCK_MOVIES[id] ?? MOCK_MOVIES[1];

const MOCK_STREAMING = {
  flatrate: [
    { provider_name: 'Netflix' },
    { provider_name: 'Watcha' },
  ],
  buy: [],
  rent: [],
};

const MOCK_BOX_OFFICE = [
  {
    id: 10,
    tmdb_id: 822119,
    title: 'Captain America: Brave New World',
    title_ko: '캡틴 아메리카: 브레이브 뉴 월드',
    image: 'https://image.tmdb.org/t/p/w200/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg',
    audi_acc: 1820000,
  },
  {
    id: 11,
    tmdb_id: 1084736,
    title: 'Mickey 17',
    title_ko: '미키 17',
    image: 'https://image.tmdb.org/t/p/w200/7Bx3OBTMaBC1v31ghBFWiY9YQBR.jpg',
    audi_acc: 1340000,
  },
  {
    id: 12,
    tmdb_id: 762509,
    title: 'Mufasa: The Lion King',
    title_ko: '무파사: 라이온 킹',
    image: 'https://image.tmdb.org/t/p/w200/41uFUMWUBNGiSU3DVQT7LMt7qNl.jpg',
    audi_acc: 980000,
  },
  {
    id: 13,
    tmdb_id: 519182,
    title: 'Despicable Me 4',
    title_ko: '슈퍼 배드 4',
    image: 'https://image.tmdb.org/t/p/w200/wWba3TaojhK7NdycyUQENuzkZbi.jpg',
    audi_acc: 720000,
  },
  {
    id: 14,
    tmdb_id: 1241982,
    title: 'Moana 2',
    title_ko: '모아나 2',
    image: 'https://image.tmdb.org/t/p/w200/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg',
    audi_acc: 610000,
  },
];

// ── 서비스 객체 ────────────────────────────────────────────────

export const movieService = {
  /**
   * 영화 상세 정보 조회
   * @param {string|number} id
   */
  getMovieDetail: (id) =>
    Promise.resolve({ data: findMovie(Number(id)) }),

  /**
   * OTT 스트리밍 제공처 조회
   * @param {string|number} tmdbId
   */
  getStreamingInfo: (_tmdbId) =>
    Promise.resolve({ data: MOCK_STREAMING }),

  /**
   * 박스오피스 TOP 5 조회 (KOBIS)
   */
  getBoxOffice: () =>
    Promise.resolve({ data: MOCK_BOX_OFFICE }),
};
