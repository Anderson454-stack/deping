import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import ViewingDNA from '../components/dashboard/ViewingDNA';
import RecentMovieCard from '../components/dashboard/RecentMovieCard';
import BoxOfficeCarousel from '../components/dashboard/BoxOfficeCarousel';
import { StaggerList, StaggerListItem } from '../components/motion/PageTransition';
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';
import { movieService } from '../api/movieService';

// ViewingDNA 태그 → API 키워드 변환 테이블
const DNA_TAG_TO_KEYWORDS = {
  'Noir Minimalism':      'noir,crime,detective',
  '90s Hong Kong':        'hong kong,martial arts,crime',
  'Surrealist Narrative': 'surrealism,dream,psychological',
  'Technicolor Epics':    'epic,historical,war,adventure',
};

// ViewingDNA 태그 배열을 키워드 문자열로 변환
function tagsToKeywords(tags) {
  const kws = tags.flatMap(tag => (DNA_TAG_TO_KEYWORDS[tag] ?? tag.toLowerCase()).split(','));
  return [...new Set(kws)].join(',');
}

// 현재 DNA 태그 (ViewingDNA 컴포넌트와 동일한 값)
const CURRENT_DNA_TAGS = ['Noir Minimalism', '90s Hong Kong', 'Surrealist Narrative', 'Technicolor Epics'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { recentHistory } = useRecommendationHistory();
  const [boxOffice, setBoxOffice] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [community, setCommunity] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  const isNewUser = recentHistory.length === 0;

  // ── 박스오피스 (마운트 1회) ───────────────────────────────
  useEffect(() => {
    movieService.getBoxOffice()
      .then(res => setBoxOffice(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBoxOffice([]));
  }, []);

  // ── 오늘의 추천: 마운트 + 15분마다 갱신 ─────────────────
  const fetchFeatured = useCallback(() => {
    setFeaturedLoading(true);
    movieService.getFeaturedMovies(8)
      .then(res => setFeatured(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFeatured([]))
      .finally(() => setFeaturedLoading(false));
  }, []);

  useEffect(() => {
    fetchFeatured();
    const interval = setInterval(fetchFeatured, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFeatured]);

  // ── Community DNA: DNA 태그 기반 키워드 추천 ────────────
  useEffect(() => {
    if (!isNewUser) { setCommunityLoading(false); return; }
    const keywords = tagsToKeywords(CURRENT_DNA_TAGS);
    setCommunityLoading(true);
    movieService.getCommunityMovies(keywords, 6)
      .then(res => setCommunity(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCommunity([]))
      .finally(() => setCommunityLoading(false));
  }, [isNewUser]);

  // 신규 사용자: API 결과 or fallback 하드코딩 카드
  const fallbackCommunity = [
    { id: 101, tmdb_id: 27205, title_ko: '인셉션',    poster_url: 'https://image.tmdb.org/t/p/w500/edv5CZvjR79upO8Ox6Y6Z8HQoQ.jpg', savedAt: new Date().toISOString() },
    { id: 102, tmdb_id: 155,   title_ko: '다크 나이트', poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDp9QmSbmrK5S2vVv9S.jpg', savedAt: new Date().toISOString() },
    { id: 103, tmdb_id: 603,   title_ko: '매트릭스',   poster_url: 'https://image.tmdb.org/t/p/w500/f89U3Y9S7egpq971ghYvU4db12W.jpg', savedAt: new Date().toISOString() },
  ];

  const communityDisplay = community.length > 0 ? community : fallbackCommunity;

  // RecentMovieCard가 `image` 필드를 사용하므로 community 데이터 정규화
  const normalizeForCard = (m) => ({
    ...m,
    image: m.poster_url ?? m.image,
    title_ko: m.title_ko ?? m.title,
    savedAt: m.savedAt ?? new Date().toISOString(),
  });

  const SectionSpinner = () => (
    <div className="flex items-center justify-center py-16 gap-2">
      {[0, 120, 240].map(d => (
        <span key={d} className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  );

  const EmptyNotice = ({ text }) => (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-on-surface-variant/50 font-medium">{text}</p>
    </div>
  );

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto pb-12">

        {/* ── 히어로: 중앙 CTA ─────────────────────────── */}
        <section
          className="relative mb-16 text-center py-20 md:py-28 px-6"
          style={{
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, rgba(240,232,232,0.95) 0%, rgba(248,245,242,0.7) 55%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 95% 90% at 50% 50%, black 40%, transparent 82%)',
            maskImage:       'radial-gradient(ellipse 95% 90% at 50% 50%, black 40%, transparent 82%)',
          }}
        >
          {/* 레드 글로우 레이어 */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(142,0,4,0.10) 0%, transparent 65%)',
            }}
          />

          <p className="text-primary font-bold uppercase tracking-[0.3em] text-xs mb-6">
            AI Cinema Guide · Deeping
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6">
            오늘 밤, 당신에게<br />
            <span style={{ color: 'var(--color-primary)' }}>딱 맞는 영화</span>는?
          </h1>

          <p className="text-on-surface-variant text-base sm:text-lg md:text-xl max-w-lg mx-auto mb-10 leading-relaxed">
            AI와 대화하면 당신의 취향과 기분에 맞는<br className="hidden sm:block" />
            영화 3편을 골라드려요.
          </p>

          <button
            onClick={() => navigate('/chat')}
            className="group inline-flex items-center gap-3 ruby-gradient px-10 py-5 rounded-full text-white text-lg font-bold cinematic-shadow hover:scale-105 active:scale-95 transition-all duration-300"
          >
            대화 시작하기
            <span className="material-symbols-outlined text-xl group-hover:translate-x-1.5 transition-transform duration-200">
              arrow_forward
            </span>
          </button>

          <p className="text-[11px] text-on-surface-variant/35 mt-5 font-medium tracking-widest uppercase">
            No signup required · 3 picks per session
          </p>
        </section>

        {/* ── My Deeping: Viewing DNA ───────────────────── */}
        <section className="mb-16">
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">My Deeping</h2>
            <p className="text-on-surface-variant text-sm mt-1 opacity-60">
              A mirror of your cinematic soul.
            </p>
          </div>
          <ViewingDNA />
        </section>

        {/* ── Community DNA / 추천 기록 ─────────────────── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                {isNewUser ? '오직 당신을 위해 준비한 영화!' : 'Recommended Previously'}
              </h2>
              <p className="text-on-surface-variant text-xs mt-1 font-medium tracking-tight uppercase opacity-60">
                {isNewUser ? 'Curated by Deeping · For only you' : 'Reflecting your past dialogues'}
              </p>
            </div>
          </div>

          {isNewUser && communityLoading ? (
            <SectionSpinner />
          ) : isNewUser && communityDisplay.length === 0 ? (
            <EmptyNotice text="영화를 가져오는 중입니다. 백엔드 서버를 확인해 주세요." />
          ) : isNewUser ? (
            <StaggerList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {communityDisplay.map((movie) => (
                <StaggerListItem key={movie.tmdb_id ?? movie.id}>
                  <div
                    onClick={() => navigate(`/movie/${movie.tmdb_id ?? movie.id}`, { state: { movie } })}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-surface-container-low cinematic-shadow hover:scale-[1.03] transition-all duration-300"
                  >
                    <div className="relative aspect-[2/3]">
                      {(movie.poster_url ?? movie.image) ? (
                        <img
                          src={movie.poster_url ?? movie.image}
                          alt={movie.title_ko ?? movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                          <span className="material-symbols-outlined text-outline-variant text-4xl">movie</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                        {movie.title_ko ?? movie.title}
                      </p>
                      {movie.year && (
                        <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{movie.year}</p>
                      )}
                    </div>
                  </div>
                </StaggerListItem>
              ))}
            </StaggerList>
          ) : (
            <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentHistory.map((movie) => (
                <StaggerListItem key={movie.id}>
                  <RecentMovieCard movie={normalizeForCard(movie)} />
                </StaggerListItem>
              ))}
            </StaggerList>
          )}
        </section>

        {/* ── 박스오피스 캐러셀 ─────────────────────────── */}
        {boxOffice.length > 0 && (
          <section className="mt-16 pt-16" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold italic tracking-tight">박스오피스</h2>
                <p className="text-on-surface-variant text-[10px] mt-1 font-bold uppercase tracking-widest opacity-40">
                  Current Box Office · Daily Updated
                </p>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">KOBIS Realtime</span>
            </div>
            <BoxOfficeCarousel movies={boxOffice} />
          </section>
        )}

        {/* ── 오늘의 추천 (15분마다 갱신) ──────────────── */}
        <section className="mt-24 pt-16" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold italic tracking-tight">디핑이 직접 선별한 영화</h2>
              <p className="text-on-surface-variant text-[10px] mt-1 font-bold uppercase tracking-widest opacity-40">
                Curated From Our Cinema Archive · Refreshes Every 15 min
              </p>
            </div>
            <button
              onClick={fetchFeatured}
              disabled={featuredLoading}
              className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant/60 hover:text-primary transition-colors disabled:opacity-40"
            >
              <span className={`material-symbols-outlined text-base ${featuredLoading ? 'animate-spin' : ''}`}>refresh</span>
              새로고침
            </button>
          </div>

          {featuredLoading ? (
            <SectionSpinner />
          ) : featured.length === 0 ? (
            <EmptyNotice text="백엔드 서버에 연결할 수 없습니다. 서버를 실행 후 새로고침 해주세요." />
          ) : (
            <StaggerList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featured.slice(0, 8).map((movie) => (
                <StaggerListItem key={movie.tmdb_id}>
                  <div
                    onClick={() => navigate(`/movie/${movie.tmdb_id}`, { state: { movie } })}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-surface-container-low cinematic-shadow hover:scale-[1.03] transition-all duration-300"
                  >
                    <div className="relative aspect-[2/3]">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                          <span className="material-symbols-outlined text-outline-variant text-4xl">movie</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                        {movie.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-on-surface-variant/60">{movie.year}</span>
                        {movie.vote_average && (
                          <>
                            <span className="text-on-surface-variant/30 text-[10px]">·</span>
                            <span className="text-[10px] text-primary font-bold">★ {Number(movie.vote_average).toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </StaggerListItem>
              ))}
            </StaggerList>
          )}
        </section>

      </div>
    </PageTransition>
  );
};

export default Dashboard;
