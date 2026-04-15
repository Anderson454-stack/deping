import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import { movieService } from '../api/movieService';

// 데이터 출처가 다른 여러 카드의 필드명을 통일
function normalizeMovie(raw) {
  if (!raw) return null;
  return {
    tmdb_id:    raw.tmdb_id ?? raw.id,
    title:      raw.title_ko ?? raw.title ?? '제목 없음',
    year:       raw.year ?? raw.release_date?.slice(0, 4) ?? '',
    poster:     raw.poster_url ?? raw.image
                  ?? (raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null),
    overview:   raw.overview ?? raw.overview_ko ?? '',
    rating:     raw.vote_average != null ? Number(raw.vote_average).toFixed(1) : null,
    director:   raw.director ?? '',
    actors:     (raw.actors ?? []).slice(0, 4),
    genres:     raw.genres ?? [],
    keywords:   (raw.keywords ?? []).slice(0, 6),
    runtime:    raw.runtime ?? null,
  };
}

const MovieDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 카드 클릭으로 전달된 state가 있으면 즉시 사용 (API 호출 없음)
  const stateMovie = location.state?.movie ?? null;
  const [movie, setMovie] = useState(() => normalizeMovie(stateMovie));
  const [loading, setLoading] = useState(!stateMovie);

  useEffect(() => {
    // state로 데이터가 이미 있으면 API 호출 불필요
    if (stateMovie) return;
    if (!id) return;

    setLoading(true);
    movieService.getMovieDetail(id)
      .then(res => setMovie(normalizeMovie(res.data)))
      .catch(() => setMovie(null))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto py-12 px-6 flex items-center justify-center min-h-[50vh]">
          <div className="flex gap-2">
            {[0, 120, 240].map(delay => (
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
          <h2 className="text-2xl font-bold text-on-surface-variant">영화 정보를 찾을 수 없습니다.</h2>
          <button
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

          {/* ── 포스터 ─────────────────────────────── */}
          <div className="w-full lg:w-[320px] shrink-0">
            <div className="sticky top-24">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover rounded-3xl cinematic-shadow"
                />
              ) : (
                <div className="w-full aspect-[2/3] rounded-3xl bg-surface-container-high flex items-center justify-center cinematic-shadow">
                  <span className="material-symbols-outlined text-outline-variant text-6xl">movie</span>
                </div>
              )}

              {/* 평점 뱃지 */}
              {movie.rating && (
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
              )}
            </div>
          </div>

          {/* ── 정보 영역 ───────────────────────────── */}
          <div className="flex-1 space-y-8">

            {/* 제목 + 태그 */}
            <div>
              <span className="text-primary font-bold uppercase tracking-widest text-xs mb-3 block">
                Recommended by Deeping
              </span>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-2">
                {movie.year && (
                  <span className="px-3 py-1.5 bg-surface-container-low rounded-full text-sm font-semibold">
                    {movie.year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="px-3 py-1.5 bg-surface-container-low rounded-full text-sm font-semibold">
                    {movie.runtime}분
                  </span>
                )}
                {movie.genres.map(genre => (
                  <span key={genre} className="px-3 py-1.5 bg-surface-container-low rounded-full text-sm font-medium">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* 줄거리 */}
            {movie.overview && (
              <div className="space-y-2">
                <h3 className="text-base font-bold uppercase tracking-widest text-on-surface-variant/60">
                  Synopsis
                </h3>
                <p className="text-base lg:text-lg text-on-surface-variant leading-relaxed max-w-2xl">
                  {movie.overview}
                </p>
              </div>
            )}

            {/* 감독 / 출연진 */}
            {(movie.director || movie.actors.length > 0) && (
              <div className="space-y-4">
                {movie.director && (
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 w-14 pt-0.5 shrink-0">
                      감독
                    </span>
                    <span className="font-semibold text-on-surface">{movie.director}</span>
                  </div>
                )}
                {movie.actors.length > 0 && (
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 w-14 pt-0.5 shrink-0">
                      출연
                    </span>
                    <span className="text-on-surface-variant leading-relaxed">
                      {movie.actors.join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 키워드 태그 */}
            {movie.keywords.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-base font-bold uppercase tracking-widest text-on-surface-variant/60">
                  Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.keywords.map(kw => (
                    <span
                      key={kw}
                      className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full"
                      style={{ background: 'var(--color-primary-container, rgba(142,0,4,0.08))', color: 'var(--color-primary)' }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="pt-4 flex flex-wrap gap-4">
              <button className="ruby-gradient px-10 py-4 rounded-full text-on-primary font-bold cinematic-shadow hover:scale-105 transition-all">
                Add to Watchlist
              </button>
              <button className="px-10 py-4 rounded-full bg-surface-container text-on-surface font-bold hover:bg-surface-container-high transition-all">
                Rate this Film
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-4 rounded-full bg-surface-container text-on-surface-variant font-medium hover:bg-surface-container-high transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                돌아가기
              </button>
            </div>
          </div>

        </div>
      </div>
      </div>
    </PageTransition>
  );
};

export default MovieDetail;
