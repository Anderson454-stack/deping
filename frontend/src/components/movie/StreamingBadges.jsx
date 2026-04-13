import React, { useState, useEffect } from 'react';
import { movieService } from '../../api/movieService';

/**
 * OTT 및 극장 정보를 보여주는 배지 섹션
 * @param {string|number} tmdbId - TMDB ID (OTT 조회용)
 * @param {string} title - 영화 제목 (극장 검색용)
 * @param {boolean} isTheater - 현재 상영 여부 (FastAPI 응답 기반)
 */
const StreamingBadges = ({ tmdbId, title, isTheater = false }) => {
  const [streaming, setStreaming] = useState(null);
  const [loading, setLoading] = useState(true);

  // 극장 검색 패턴 (TASK-G)
  const THEATER_LINKS = {
    cgv:   (t) => `https://www.cgv.co.kr/search/?query=${encodeURIComponent(t)}`,
    lotte: (t) => `https://www.lottecinema.co.kr/NLCHS/Movie/MovieList?searchText=${encodeURIComponent(t)}`,
    mega:  (t) => `https://www.megabox.co.kr/movie?searchText=${encodeURIComponent(t)}`,
  };

  // 주요 OTT 브랜드 컬러 (border 금지, 배경색 활용)
  const OTT_COLORS = {
    'Netflix': '#E50914',
    'Watcha': '#FF0558',
    'Wavve': '#0055FB',
    'Disney Plus': '#006E99',
    'Apple TV': '#000000',
    'Coupang Play': '#1077FF',
    'Tving': '#FF153C',
  };

  useEffect(() => {
    if (!tmdbId) return;

    setLoading(true);
    movieService.getStreamingInfo(tmdbId)
      .then(res => {
        setStreaming(res.data); // { flatrate: [], buy: [], rent: [] } 형태 가정
      })
      .catch(() => setStreaming(null))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-4">
      <span className="text-[10px] font-bold text-on-surface-variant/40 animate-pulse">
        AVAILABILITY CHECKING...
      </span>
    </div>
  );

  const flatrate = streaming?.flatrate || [];

  return (
    <div className="flex flex-col gap-6 py-6 border-t border-outline-variant/10">
      {/* 1. OTT 섹션 */}
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em] mb-3">
          Stream on
        </p>
        <div className="flex flex-wrap gap-2">
          {flatrate.length > 0 ? (
            flatrate.map(provider => (
              <span 
                key={provider.provider_name}
                className="px-3 py-1 rounded-full text-[10px] font-bold text-white cinematic-shadow"
                style={{ backgroundColor: OTT_COLORS[provider.provider_name] || 'var(--color-primary-container)' }}
              >
                {provider.provider_name.toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-xs font-medium text-on-surface-variant/40 italic">
              No streaming info available in this region.
            </span>
          )}
        </div>
      </div>

      {/* 2. 극장 섹션 (현재 상영 중일 때만 표시) */}
      {isTheater && (
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mb-3">
            Now in Theaters
          </p>
          <div className="flex flex-wrap gap-3">
            <a 
              href={THEATER_LINKS.cgv(title)} 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-surface-container rounded-xl text-[10px] font-black hover:bg-surface-container-high transition-colors text-[#ED1C24]"
            >
              CGV
            </a>
            <a 
              href={THEATER_LINKS.lotte(title)} 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-surface-container rounded-xl text-[10px] font-black hover:bg-surface-container-high transition-colors text-[#ED1C24]"
            >
              LOTTE
            </a>
            <a 
              href={THEATER_LINKS.mega(title)} 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-surface-container rounded-xl text-[10px] font-black hover:bg-surface-container-high transition-colors text-[#011B41]"
            >
              MEGA
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingBadges;
