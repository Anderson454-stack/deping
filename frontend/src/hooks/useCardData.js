import { useState, useEffect } from 'react';
import { fetchMovieCards, fetchDirectorCards, fetchActorCards } from '../api/movieService';

const FETCHERS = {
  movie: fetchMovieCards,
  director: fetchDirectorCards,
  actor: fetchActorCards,
};

/**
 * 온보딩 카드 선택용 TMDB 데이터 훅
 * @param {'movie' | 'director' | 'actor'} type
 * @returns {{ cards: Array, loading: boolean }}
 */
export function useCardData(type) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetcher = FETCHERS[type];
    if (!fetcher) {
      setCards([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetcher()
      .then((data) => {
        if (!cancelled) setCards(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type]);

  return { cards, loading };
}
