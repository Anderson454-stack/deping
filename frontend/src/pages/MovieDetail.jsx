import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import { movieService } from '../api/movieService';
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';
import { getTheaterLinks, isLikelyNowPlaying } from '../utils/theaterLinks';
import { getOttLinks } from '../utils/ottLinks';

function normalizeMovie(raw) {
  if (!raw) return null;

  const cast = Array.isArray(raw.cast)
    ? raw.cast
    : Array.isArray(raw.actors)
    ? raw.actors
    : [];
  const genres = Array.isArray(raw.genres) ? raw.genres : [];
  const keywords = Array.isArray(raw.keywords) ? raw.keywords : [];

  return {
    tmdb_id: raw.tmdb_id ?? raw.id ?? null,
    title: raw.title ?? raw.title_ko ?? '제목 없음',
    title_ko: raw.title_ko ?? raw.title ?? '제목 없음',
    year: raw.year ?? raw.release_date?.slice(0, 4) ?? '',
    release_date: raw.release_date ?? '',
    poster_path: raw.poster_path ?? null,
    poster_url: raw.poster_url ?? raw.image ?? null,
    overview: raw.overview ?? raw.overview_ko ?? '',
    vote_average: raw.vote_average ?? raw.rating ?? null,
    rating: raw.vote_average != null ? Number(raw.vote_average).toFixed(1) : null,
    director: raw.director ?? '',
    actors: cast.slice(0, 5),
    genres,
    keywords: keywords.slice(0, 6),
    runtime: raw.runtime ?? null,
    trailerUrl: raw.trailer_url ?? null,
    source: raw.source ?? null,
    watchProviders: raw.watch_providers ?? null,
  };
}

function resolvePoster(movie) {
  if (!movie) return null;
  if (movie.poster_url) {
    if (movie.poster_url.startsWith('http://') || movie.poster_url.startsWith('https://')) {
      return movie.poster_url;
    }
    if (movie.poster_url.startsWith('/')) {
      return `https://image.tmdb.org/t/p/w500${movie.poster_url}`;
    }
  }
  return movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
}

function mergeMovies(primary, fallback) {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;

  return {
    ...fallback,
    ...primary,
    tmdb_id: primary.tmdb_id ?? fallback.tmdb_id,
    title: primary.title || fallback.title,
    title_ko: primary.title_ko || fallback.title_ko,
    year: primary.year || fallback.year,
    release_date: primary.release_date || fallback.release_date,
    poster_path: primary.poster_path || fallback.poster_path,
    poster_url: primary.poster_url || fallback.poster_url,
    overview: primary.overview || fallback.overview,
    vote_average: primary.vote_average ?? fallback.vote_average,
    rating: primary.rating ?? fallback.rating,
    director: primary.director || fallback.director,
    actors: primary.actors?.length ? primary.actors : fallback.actors,
    genres: primary.genres?.length ? primary.genres : fallback.genres,
    keywords: primary.keywords?.length ? primary.keywords : fallback.keywords,
    runtime: primary.runtime ?? fallback.runtime,
    trailerUrl: primary.trailerUrl || fallback.trailerUrl,
    source: primary.source || fallback.source,
    watchProviders: primary.watchProviders ?? fallback.watchProviders ?? null,
  };
}

function normalizeProviderName(name) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (lower.includes('netflix')) return 'Netflix';
  if (lower === 'watcha') return 'Watcha';
  if (lower === 'wavve') return 'wavve';
  if (lower === 'tving') return 'TVING';
  if (lower.includes('google play')) return 'Google Play Movies';
  return trimmed;
}

const MovieDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { journalMovies, isMovieSaved, toggleJournalMovie, rateMovie } = useRecommendationHistory();

  const stateMovie = useMemo(() => normalizeMovie(location.state?.movie ?? null), [location.state]);
  const journalFallbackMovie = useMemo(
    () => normalizeMovie(journalMovies.find((entry) => Number(entry.tmdb_id) === Number(id))),
    [journalMovies, id]
  );
  const fallbackMovie = useMemo(
    () => mergeMovies(stateMovie, journalFallbackMovie),
    [stateMovie, journalFallbackMovie]
  );

  const [movie, setMovie] = useState(() => fallbackMovie);
  const [loading, setLoading] = useState(!fallbackMovie);
  const [error, setError] = useState('');
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setMovie((prev) => mergeMovies(prev, fallbackMovie));
  }, [fallbackMovie]);

  useEffect(() => {
    setPosterFailed(false);
  }, [movie?.tmdb_id, movie?.poster_url, movie?.poster_path]);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    setLoading(!fallbackMovie);
    setError('');

    movieService.getMovieDetail(id)
      .then((data) => {
        if (cancelled) return;
        setMovie((prev) => mergeMovies(normalizeMovie(data), prev ?? fallbackMovie));
      })
      .catch(() => {
        if (cancelled) return;
        if (!fallbackMovie) {
          setMovie(null);
          setError('영화 상세 정보를 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackMovie, id]);

  const showToast = (message) => {
    window.dispatchEvent(new CustomEvent('deping:toast', { detail: { message } }));
  };

  const saved = movie ? isMovieSaved(movie.tmdb_id) : false;
  const savedMovie = useMemo(
    () => journalMovies.find((entry) => Number(entry.tmdb_id) === Number(movie?.tmdb_id)),
    [journalMovies, movie?.tmdb_id]
  );
  const currentRating = savedMovie?.rating ?? 0;
  const posterSrc = !posterFailed ? resolvePoster(movie) : null;
  const isTheaterMovie = isLikelyNowPlaying(movie);
  const theaterLinks = useMemo(
    () => (movie ? getTheaterLinks(movie.title_ko ?? movie.title ?? '') : []),
    [movie]
  );
  const curatedOttLinks = useMemo(
    () => (movie ? getOttLinks(movie) : []),
    [movie]
  );
  const watchProviders = movie?.watchProviders ?? null;
  const streamingProviders = useMemo(
    () => [
      ...(watchProviders?.flatrate ?? []),
      ...(watchProviders?.rent ?? []),
      ...(watchProviders?.buy ?? []),
    ].reduce((uniqueProviders, provider) => {
      if (!provider?.provider_name) return uniqueProviders;

      const normalizedName = normalizeProviderName(provider.provider_name);
      if (!normalizedName) return uniqueProviders;

      const exists = uniqueProviders.some((candidate) => candidate.provider_name === normalizedName);
      if (exists) return uniqueProviders;

      return [...uniqueProviders, { ...provider, provider_name: normalizedName }];
    }, []),
    [watchProviders]
  );

  const handleToggleWatchlist = () => {
    if (!movie) return;
    const nextSaved = toggleJournalMovie(movie);
    if (!nextSaved) {
      setShowRatingPicker(false);
    }
    showToast(nextSaved ? '저장되었어요!' : '저장을 취소했어요.');
  };

  const handleRateSelect = (ratingValue) => {
    if (!movie) return;

    if (!saved) {
      toggleJournalMovie(movie);
    }

    const updated = rateMovie(movie.tmdb_id, ratingValue);
    if (updated) {
      setShowRatingPicker(true);
      showToast(`평점 ${ratingValue}점을 남겼어요.`);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto py-12 px-6 flex items-center justify-center min-h-[50vh]">
          <div className="flex gap-2">
            {[0, 120, 240].map((delay) => (
              <span
                key={delay}
                className="w-3 h-3 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!movie) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto py-12 px-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-on-surface-variant">
            {error || '영화 정보를 찾을 수 없습니다.'}
          </h2>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-primary font-bold text-sm hover:underline"
          >
            ← 돌아가기
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="h-full">
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto py-12 px-6">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="w-full lg:w-[320px] shrink-0">
              <div className="sticky top-24">
                {posterSrc ? (
                  <img
                    src={posterSrc}
                    alt={movie.title_ko}
                    className="w-full aspect-[2/3] object-cover rounded-3xl cinematic-shadow"
                    onError={() => setPosterFailed(true)}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-3xl bg-surface-container-high flex items-center justify-center cinematic-shadow">
                    <span className="material-symbols-outlined text-outline-variant text-6xl">movie</span>
                  </div>
                )}

                {movie.rating ? (
                  <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-container-low cinematic-shadow">
                    <span
                      className="material-symbols-outlined text-primary text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="text-2xl font-black text-on-surface">{movie.rating}</span>
                    <span className="text-xs text-on-surface-variant font-medium">/ 10</span>
                  </div>
                ) : null}

                {currentRating > 0 ? (
                  <div
                    className="mt-4 rounded-2xl px-5 py-4"
                    style={{
                      background: 'var(--color-surface-raised)',
                      boxShadow: 'var(--shadow-cinematic)',
                    }}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-2">
                      Your Rating
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, index) => {
                        const starValue = index + 1;
                        return (
                          <span
                            key={starValue}
                            className="material-symbols-outlined text-lg"
                            style={{
                              color: starValue <= currentRating ? 'var(--color-primary)' : 'var(--color-surface-container-highest)',
                              fontVariationSettings: starValue <= currentRating ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex-1 space-y-8">
              <div>
                <span className="text-primary font-bold uppercase tracking-widest text-xs mb-3 block">
                  Recommended by Deeping
                </span>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                  {movie.title_ko}
                </h1>

                <div className="flex flex-wrap gap-2">
                  {movie.year ? (
                    <span className="px-3 py-1.5 bg-surface-container-low rounded-full text-sm font-semibold">
                      {movie.year}
                    </span>
                  ) : null}
                  {movie.runtime ? (
                    <span className="px-3 py-1.5 bg-surface-container-low rounded-full text-sm font-semibold">
                      {movie.runtime}분
                    </span>
                  ) : null}
                  {movie.genres.map((genre) => (
                    <span key={genre} className="px-3 py-1.5 bg-surface-container-low rounded-full text-sm font-medium">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {movie.overview ? (
                <div className="space-y-2">
                  <h3 className="text-base font-bold uppercase tracking-widest text-on-surface-variant/60">
                    Synopsis
                  </h3>
                  <p className="text-base lg:text-lg text-on-surface-variant leading-relaxed max-w-2xl">
                    {movie.overview}
                  </p>
                </div>
              ) : null}

              {(movie.director || movie.actors.length > 0) ? (
                <div className="space-y-4">
                  {movie.director ? (
                    <div className="flex items-start gap-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 w-14 pt-0.5 shrink-0">
                        감독
                      </span>
                      <span className="font-semibold text-on-surface">{movie.director}</span>
                    </div>
                  ) : null}
                  {movie.actors.length > 0 ? (
                    <div className="flex items-start gap-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 w-14 pt-0.5 shrink-0">
                        출연
                      </span>
                      <span className="text-on-surface-variant leading-relaxed">
                        {movie.actors.join(' · ')}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {movie.keywords.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-base font-bold uppercase tracking-widest text-on-surface-variant/60">
                    Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full"
                        style={{
                          background: 'var(--color-surface-raised)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                className="rounded-[28px] p-6 md:p-7"
                style={{
                  background: 'var(--color-surface-raised)',
                  boxShadow: 'var(--shadow-cinematic)',
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary mb-2">
                      {isTheaterMovie ? '예매하기' : '감상하기'}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {isTheaterMovie ? '현재 상영 중인 작품으로 보여 영화관 링크를 표시합니다.' : curatedOttLinks.length > 0 ? '해당 작품은 아래에서 감상하실 수 있어요!' : 'TMDB 기준으로 스트리밍 서비스를 보여드려요!'}
                    </p>
                  </div>
                  {movie.trailerUrl ? (
                    <a
                      href={movie.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 rounded-full text-sm font-bold"
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      예고편 보기
                    </a>
                  ) : null}
                </div>
                {isTheaterMovie ? (
                  <div className="flex flex-wrap gap-3">
                    {theaterLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-full text-sm font-bold"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-on-surface)',
                        }}
                      >
                        {link.name}
                      </a>
                    ))}
                  </div>
                ) : curatedOttLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {curatedOttLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-full text-sm font-bold"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-on-surface)',
                        }}
                      >
                        {link.name}
                      </a>
                    ))}
                  </div>
                ) : streamingProviders.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      {streamingProviders.map((provider) => (
                        <span
                          key={provider.provider_name}
                          className="px-4 py-2.5 rounded-full text-sm font-bold"
                          style={{
                            background: 'var(--color-surface)',
                            color: 'var(--color-on-surface)',
                          }}
                        >
                          {provider.provider_name}
                        </span>
                      ))}
                    </div>
                    {watchProviders?.link ? (
                      <a
                        href={watchProviders.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex px-4 py-2.5 rounded-full text-sm font-bold"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        TMDB에서 감상처 보기
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">
                    TMDB 기준으로 확인된 감상처가 아직 없어요.
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  className={`px-10 py-4 rounded-full font-bold cinematic-shadow transition-all ${saved ? 'text-primary' : 'text-on-primary'}`}
                  style={{
                    background: saved ? 'var(--color-surface-raised)' : 'var(--color-primary)',
                  }}
                >
                  {saved ? 'Added ✓' : 'Add to Watchlist'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRatingPicker((prev) => !prev)}
                  className="px-10 py-4 rounded-full bg-surface-container text-on-surface font-bold hover:bg-surface-container-high transition-all"
                >
                  {currentRating > 0 ? `Rate this Film · ${currentRating}/5` : 'Rate this Film'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-4 rounded-full bg-surface-container text-on-surface-variant font-medium hover:bg-surface-container-high transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  돌아가기
                </button>
              </div>

              {showRatingPicker || currentRating > 0 ? (
                <div
                  className="rounded-[28px] p-6"
                  style={{
                    background: 'var(--color-surface-raised)',
                    boxShadow: 'var(--shadow-cinematic)',
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary mb-3">
                    Your Rating
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: 5 }, (_, index) => {
                      const starValue = index + 1;
                      const active = starValue <= currentRating;

                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => handleRateSelect(starValue)}
                          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:-translate-y-0.5"
                          style={{ background: 'var(--color-surface)' }}
                          aria-label={`${starValue}점 주기`}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{
                              color: active ? 'var(--color-primary)' : 'var(--color-surface-container-highest)',
                              fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-on-surface-variant mt-4">
                    평점은 Journal 저장 영화에 함께 기록됩니다.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default MovieDetail;
