const MAX_TAGS = 5;
const MIN_TAGS = 1;
const FALLBACK_GENRE_TAG_SUFFIX = '중심';

const GENRE_ALIASES = {
  action: 'Action',
  '액션': 'Action',
  adventure: 'Adventure',
  '모험': 'Adventure',
  animation: 'Animation',
  '애니메이션': 'Animation',
  comedy: 'Comedy',
  '코미디': 'Comedy',
  crime: 'Crime',
  '범죄': 'Crime',
  documentary: 'Documentary',
  '다큐멘터리': 'Documentary',
  drama: 'Drama',
  '드라마': 'Drama',
  family: 'Family',
  '가족': 'Family',
  fantasy: 'Fantasy',
  '판타지': 'Fantasy',
  history: 'History',
  '역사': 'History',
  horror: 'Horror',
  '공포': 'Horror',
  '호러': 'Horror',
  music: 'Music',
  '음악': 'Music',
  mystery: 'Mystery',
  '미스터리': 'Mystery',
  romance: 'Romance',
  'romantic': 'Romance',
  '로맨스': 'Romance',
  '멜로': 'Romance',
  '멜로/로맨스': 'Romance',
  'sf': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  'science fiction': 'Science Fiction',
  'science-fiction': 'Science Fiction',
  '공상과학': 'Science Fiction',
  'science fiction ': 'Science Fiction',
  'sci fi': 'Science Fiction',
  '스릴러': 'Thriller',
  thriller: 'Thriller',
  war: 'War',
  '전쟁': 'War',
  western: 'Western',
  '서부': 'Western',
};

const GENRE_TAG_MAP = {
  Action: '강한 추진력',
  Adventure: '여정형 서사',
  Animation: '상상력 중심',
  Comedy: '가벼운 리듬',
  Crime: '범죄 서사',
  Documentary: '현실 밀착 시선',
  Drama: '감정선 중심',
  Family: '따뜻한 감성',
  Fantasy: '환상적 세계관',
  History: '시대성 있는 이야기',
  Horror: '불안한 긴장감',
  Music: '음악적 에너지',
  Mystery: '수수께끼형 전개',
  Romance: '관계 중심 서사',
  'Science Fiction': 'SF 상상력',
  'Sci-Fi': 'SF 상상력',
  Thriller: '긴장감 높은 전개',
  War: '강한 충돌 구조',
  Western: '거친 정조',
};

const GENRE_KO_MAP = {
  Action: '액션',
  Adventure: '어드벤처',
  Animation: '애니메이션',
  Comedy: '코미디',
  Crime: '범죄',
  Documentary: '다큐멘터리',
  Drama: '드라마',
  Family: '가족',
  Fantasy: '판타지',
  History: '역사',
  Horror: '호러',
  Music: '음악',
  Mystery: '미스터리',
  Romance: '로맨스',
  'Science Fiction': 'SF',
  'Sci-Fi': 'SF',
  Thriller: '스릴러',
  TVMovie: 'TV 영화',
  War: '전쟁',
  Western: '웨스턴',
};

const MOOD_KEYWORD_MAP = {
  '서늘한 정서': ['복수', '살인', '어둠', 'dark', 'revenge', 'murder', 'noir'],
  '따뜻한 감성': ['가족', '사랑', '우정', 'family', 'love', 'heart', 'warm'],
  '긴장감 높음': ['추격', '폭발', '위기', 'chase', 'bomb', 'crisis', 'escape'],
  '몽환적 분위기': ['꿈', '환상', '초현실', 'dream', 'surreal', 'fantasy'],
  '도시 감성': ['도시', '밤', '네온', 'city', 'urban', 'night', 'neon'],
  '인물 중심 서사': ['성장', '인생', '자전적', 'character', 'journey', 'life'],
};

const COMPLEXITY_TAG_MAP = {
  low: '직관적인 전개',
  medium: '균형 잡힌 전개',
  high: '복합적인 서사',
};

const PACING_TAG_MAP = {
  slow: '잔상형 호흡',
  medium: '안정적인 리듬',
  fast: '빠른 전개감',
};

function countOccurrences(values) {
  return values.reduce((acc, value) => {
    if (!value) return acc;
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePersonName(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function uniqueBy(items, selector) {
  const seen = new Set();
  return items.filter((item) => {
    const key = selector(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractOverviewText(movie) {
  return [
    movie?.overview,
    movie?.overview_ko,
    movie?.reason,
    movie?.description,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeGenre(genre) {
  const normalized = normalizeText(genre)
    .replace(/\s+/g, ' ')
    .replace(/·/g, '')
    .trim();

  if (!normalized) return '';

  const aliasKey = normalized.toLowerCase();
  return GENRE_ALIASES[aliasKey] ?? normalized;
}

function classifyMood(movie) {
  const text = extractOverviewText(movie);
  if (!text) return null;

  const matches = Object.entries(MOOD_KEYWORD_MAP)
    .map(([tag, keywords]) => ({
      tag,
      score: keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.tag ?? null;
}

function getTopEntries(counts, minCount = 1) {
  return Object.entries(counts)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1]);
}

function toDisplayGenre(genre) {
  return GENRE_KO_MAP[genre] ?? genre;
}

function extractMovieId(movie, index) {
  return movie?.tmdb_id ?? movie?.id ?? `${movie?.title ?? movie?.title_ko ?? 'movie'}-${index}`;
}

export function extractRecommendedMovies(sourceData) {
  if (!Array.isArray(sourceData)) return [];

  return uniqueBy(
    sourceData
      .filter(Boolean)
      .map((movie, index) => {
        const genres = Array.isArray(movie?.genres)
          ? movie.genres.map(normalizeGenre).filter(Boolean)
          : [];
        const actors = Array.isArray(movie?.actors)
          ? movie.actors
          : Array.isArray(movie?.cast)
          ? movie.cast
          : [];

        return {
          ...movie,
          id: extractMovieId(movie, index),
          tmdb_id: movie?.tmdb_id ?? movie?.id ?? null,
          title: movie?.title ?? movie?.title_ko ?? '',
          title_ko: movie?.title_ko ?? movie?.title ?? '',
          genres,
          director: normalizePersonName(movie?.director),
          actors: actors.map(normalizePersonName).filter(Boolean),
          cast: actors.map(normalizePersonName).filter(Boolean),
          overview: normalizeText(movie?.overview ?? movie?.overview_ko ?? movie?.description ?? ''),
          source: movie?.source ?? null,
          savedAt: movie?.savedAt ?? movie?.saved_at ?? null,
          pacing: normalizeText(movie?.pacing).toLowerCase() || null,
          plot_complexity: normalizeText(movie?.plot_complexity).toLowerCase() || null,
        };
      }),
    (movie) => String(movie.tmdb_id ?? movie.id)
  ).sort((a, b) => new Date(b.savedAt ?? 0) - new Date(a.savedAt ?? 0));
}

export function generateViewingDNATags(movies) {
  if (!Array.isArray(movies) || movies.length === 0) return [];

  const tags = [];
  const minimumMatchCount = movies.length >= 3 ? 2 : 1;
  const allGenres = movies.flatMap((movie) => movie.genres ?? []);
  const genreCounts = countOccurrences(allGenres);
  const topGenres = getTopEntries(genreCounts, minimumMatchCount).slice(0, 2);

  topGenres.forEach(([genre]) => {
    const tag = GENRE_TAG_MAP[genre];
    if (tag) {
      tags.push(tag);
      return;
    }

    const displayGenre = toDisplayGenre(genre);
    if (displayGenre) {
      tags.push(`${displayGenre} ${FALLBACK_GENRE_TAG_SUFFIX}`);
    }
  });

  const directors = getTopEntries(
    countOccurrences(movies.map((movie) => movie.director).filter(Boolean)),
    minimumMatchCount
  );
  if (directors.length > 0) {
    tags.push(
      minimumMatchCount >= 2
        ? `${directors[0][0]} 반복 추천`
        : `${directors[0][0]} 계열`
    );
  }

  const actorCounts = countOccurrences(
    movies.flatMap((movie) => (movie.actors ?? []).slice(0, 3)).filter(Boolean)
  );
  const repeatedActors = getTopEntries(actorCounts, minimumMatchCount);
  if (repeatedActors.length > 0) {
    tags.push(
      minimumMatchCount >= 2
        ? `${repeatedActors[0][0]} 연결`
        : `${repeatedActors[0][0]} 인상`
    );
  }

  const moodCounts = countOccurrences(movies.map(classifyMood).filter(Boolean));
  getTopEntries(moodCounts, minimumMatchCount)
    .slice(0, 2)
    .forEach(([tag]) => tags.push(tag));

  const pacingCounts = countOccurrences(movies.map((movie) => PACING_TAG_MAP[movie.pacing]).filter(Boolean));
  const complexityCounts = countOccurrences(movies.map((movie) => COMPLEXITY_TAG_MAP[movie.plot_complexity]).filter(Boolean));

  const topPacing = getTopEntries(pacingCounts, minimumMatchCount)[0]?.[0];
  const topComplexity = getTopEntries(complexityCounts, minimumMatchCount)[0]?.[0];
  if (topPacing) tags.push(topPacing);
  if (topComplexity) tags.push(topComplexity);

  const uniqueTags = [...new Set(tags)].filter(Boolean);
  return uniqueTags.slice(0, Math.max(MIN_TAGS, Math.min(MAX_TAGS, uniqueTags.length)));
}

export function generateViewingSummary(movies, tags) {
  if (!Array.isArray(movies) || movies.length === 0) {
    return '아직 추천 데이터가 없어 성향을 분석할 수 없어요.';
  }

  if (movies.length < 3) {
    const previewTags = tags.slice(0, 2).join(', ');
    return previewTags
      ? `최근 추천에서 ${previewTags} 흐름이 보이지만, 아직 데이터가 충분하진 않습니다.`
      : '추천 기록이 아직 적어서 성향을 단정하기보다 흐름만 가볍게 보여드리고 있어요.';
  }

  const allGenres = movies.flatMap((movie) => movie.genres ?? []);
  const topGenres = getTopEntries(countOccurrences(allGenres), 2).slice(0, 2).map(([genre]) => toDisplayGenre(genre));
  const moodCounts = getTopEntries(countOccurrences(movies.map(classifyMood).filter(Boolean)), 2);
  const primaryMood = moodCounts[0]?.[0] ?? null;

  const sentences = [];

  if (tags.length > 0) {
    sentences.push(`최근 추천은 ${tags.slice(0, 2).join(', ')} 축으로 모이는 경향이 있습니다.`);
  }

  if (topGenres.length > 0) {
    sentences.push(`장르적으로는 ${topGenres.join('와 ')}가 반복됩니다.`);
  }

  if (primaryMood) {
    sentences.push(`${primaryMood} 분위기가 함께 감지됩니다.`);
  }

  return sentences.slice(0, 2).join(' ');
}

export function calculateActivePulse(movies) {
  if (!Array.isArray(movies) || movies.length === 0) {
    return {
      score: null,
      label: '데이터 없음',
      description: '추천 이력이 쌓이면 최근 추천 패턴의 선명도를 보여드릴게요.',
    };
  }

  if (movies.length < 3) {
    return {
      score: null,
      label: '추천 데이터 부족',
      description: '추천이 조금 더 쌓이면 일관된 취향 축을 더 정확하게 읽을 수 있어요.',
    };
  }

  let score = 0;
  const weights = { genre: 40, director: 20, mood: 20, diversityPenalty: 20 };

  const allGenres = movies.flatMap((movie) => movie.genres ?? []);
  const genreCounts = countOccurrences(allGenres);
  const genreValues = Object.values(genreCounts);
  const topGenreRatio = allGenres.length > 0 && genreValues.length > 0
    ? Math.max(...genreValues) / allGenres.length
    : 0;
  score += topGenreRatio * weights.genre;

  const directorCounts = countOccurrences(movies.map((movie) => movie.director).filter(Boolean));
  const hasRepeatDirector = Object.values(directorCounts).some((count) => count >= 2);
  score += hasRepeatDirector ? weights.director : weights.director * 0.3;

  const moodTags = movies.map(classifyMood).filter(Boolean);
  const moodCounts = countOccurrences(moodTags);
  const moodValues = Object.values(moodCounts);
  const topMoodRatio = moodTags.length > 0 && moodValues.length > 0
    ? Math.max(...moodValues) / moodTags.length
    : 0.5;
  score += topMoodRatio * weights.mood;

  const uniqueGenreRatio = allGenres.length > 0
    ? Object.keys(genreCounts).length / allGenres.length
    : 1;
  score += (1 - uniqueGenreRatio) * weights.diversityPenalty;

  if (movies.length <= 4) score *= 0.7;
  else if (movies.length <= 5) score *= 0.85;

  const rounded = Math.round(Math.min(Math.max(score, 0), 100));
  const label = rounded >= 80
    ? '매우 선명한 방향성'
    : rounded >= 60
    ? '비교적 일관됨'
    : rounded >= 40
    ? '혼합 성향'
    : '패턴이 아직 약함';

  const description = rounded >= 80
    ? '최근 추천이 비슷한 장르와 정서 축으로 강하게 수렴하고 있어요.'
    : rounded >= 60
    ? '최근 추천에서 반복되는 취향 축이 비교적 또렷하게 보입니다.'
    : rounded >= 40
    ? '공통점은 보이지만 아직 여러 방향의 추천이 함께 섞여 있습니다.'
    : '아직은 추천 패턴이 넓게 퍼져 있어 선호 축이 약하게 보입니다.';

  return { score: rounded, label, description };
}

export function analyzeViewingDNA(sourceData) {
  const movies = extractRecommendedMovies(sourceData);
  const tags = generateViewingDNATags(movies);
  const summary = generateViewingSummary(movies, tags);
  const pulse = calculateActivePulse(movies);

  return {
    movies,
    tags,
    summary,
    pulse,
  };
}
