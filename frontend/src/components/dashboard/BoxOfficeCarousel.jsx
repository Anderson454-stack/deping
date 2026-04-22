import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { getTheaterLinks } from '../../utils/theaterLinks';

/**
 * 박스오피스 캐러셀 (CVG 스타일)
 * - 중앙 카드 scale(1.05) + 그림자 강조
 * - 양옆 카드 scale(0.92) + 투명도 낮춤
 * - 드래그 + 좌우 화살표 네비게이션
 */
const BoxOfficeCarousel = ({ movies }) => {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: true,
    dragFree: false,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [wishlist, setWishlist] = useState({});

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const toggleWishlist = (e, id) => {
    e.stopPropagation();
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative select-none">
      {/* 좌측 화살표 */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high cinematic-shadow hover:scale-110 transition-transform -translate-x-1/2"
        aria-label="이전"
      >
        <span className="material-symbols-outlined text-on-surface text-xl">chevron_left</span>
      </button>

      {/* 우측 화살표 */}
      <button
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high cinematic-shadow hover:scale-110 transition-transform translate-x-1/2"
        aria-label="다음"
      >
        <span className="material-symbols-outlined text-on-surface text-xl">chevron_right</span>
      </button>

      {/* 캐러셀 트랙 */}
      <div ref={emblaRef} className="overflow-hidden px-8">
        <div className="flex items-end">
          {movies.map((movie, idx) => {
            const isActive = idx === selectedIndex;
            const movieId = movie.tmdb_id || movie.id || idx;
            const theaterLinks = getTheaterLinks(movie.title_ko || movie.title);
            return (
              <div
                key={movieId}
                className="flex-none w-[240px] sm:w-[260px] px-3 pb-4"
              >
                <div
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    transform: isActive ? 'scale(1.05)' : 'scale(0.92)',
                    opacity: isActive ? 1 : 0.65,
                  }}
                  onClick={() => navigate(`/movie/${movieId}`, { state: { movie } })}
                >
                  {/* 카드 본체 */}
                  <div
                    className="rounded-2xl overflow-hidden bg-surface-container-low"
                    style={{
                      boxShadow: isActive
                        ? '0 20px 48px -8px rgba(142, 0, 4, 0.28)'
                        : '0 8px 24px -4px rgba(0,0,0,0.12)',
                    }}
                  >
                    {/* 포스터 영역 */}
                    <div className="relative aspect-[2/3]">
                      {/* 순위 배지 */}
                      <div className="absolute top-3 left-3 z-10 w-9 h-9 ruby-gradient text-white text-base font-black rounded-full flex items-center justify-center shadow-lg">
                        {movie.rank || idx + 1}
                      </div>

                      {/* 찜 버튼 */}
                      <button
                        onClick={(e) => toggleWishlist(e, movieId)}
                        className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:scale-110 transition-transform"
                        aria-label="찜하기"
                      >
                        <span
                          className="material-symbols-outlined text-lg"
                          style={{
                            color: wishlist[movieId] ? '#ef4444' : '#ffffff',
                            fontVariationSettings: wishlist[movieId]
                              ? "'FILL' 1"
                              : "'FILL' 0",
                          }}
                        >
                          favorite
                        </span>
                      </button>

                      {/* 포스터 이미지 */}
                      {movie.poster_url || movie.image ? (
                        <img
                          src={movie.poster_url || movie.image}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                          <span className="material-symbols-outlined text-outline-variant text-5xl">movie</span>
                        </div>
                      )}

                      {/* 하단 그라데이션 오버레이 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    </div>

                    {/* 카드 하단 정보 */}
                    <div className="px-4 pt-3 pb-4 bg-surface-container-low">
                      {/* 제목 + 연령 등급 */}
                      <div className="flex items-start gap-2 mb-2">
                        <h4 className="font-bold text-sm text-on-surface leading-tight flex-1 line-clamp-2">
                          {movie.title}
                        </h4>
                      </div>

                      {/* 관객 수 */}
                      <div className="flex items-center gap-1 mb-3">
                        <span className="text-[10px] text-primary font-bold">🔥</span>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          누적{' '}
                          <span className="text-on-surface font-bold">
                            {movie.audience_acc
                              ? Number(movie.audience_acc).toLocaleString()
                              : movie.audi_acc
                              ? Number(movie.audi_acc).toLocaleString()
                              : '—'}
                          </span>
                          명
                        </span>
                        {(movie.audience_today || movie.audi_today) && (
                          <span className="text-[10px] text-on-surface-variant/50 ml-1">
                            (+{Number(movie.audience_today || movie.audi_today).toLocaleString()})
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/movie/${movieId}`, { state: { movie } });
                          }}
                          className="w-full py-2 rounded-xl ruby-gradient text-white text-[11px] font-bold tracking-wide hover:opacity-90 transition-opacity"
                        >
                          상세 보기
                        </button>
                        <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                          {theaterLinks.map((link) => (
                            <a
                              key={link.name}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                              style={{
                                background: 'var(--color-surface-container-high)',
                                color: 'var(--color-on-surface)',
                              }}
                            >
                              {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 도트 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-4">
        {movies.map((_, idx) => (
          <button
            key={idx}
            onClick={() => emblaApi?.scrollTo(idx)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: idx === selectedIndex ? '20px' : '6px',
              height: '6px',
              background: idx === selectedIndex
                ? 'var(--color-primary)'
                : 'var(--color-outline-variant, rgba(0,0,0,0.2))',
            }}
            aria-label={`${idx + 1}번째 슬라이드`}
          />
        ))}
      </div>
    </div>
  );
};

export default BoxOfficeCarousel;
