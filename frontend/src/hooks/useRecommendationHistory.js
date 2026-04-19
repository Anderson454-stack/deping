import { useCallback, useEffect, useMemo, useState } from 'react';

const HISTORY_STORAGE_KEY = 'deeping_rec_history';
const JOURNAL_STORAGE_KEY = 'deping_journal';
const STORAGE_EVENT_NAME = 'deping:storage-updated';
const MAX_STORED = 10;
const DISPLAY_COUNT = 3;

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeReadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}

function normalizeHistoryMovie(movie, timestamp = new Date().toISOString()) {
  const tmdbId = movie.tmdb_id ?? movie.id;
  const posterUrl = movie.poster_url ?? movie.image ?? (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null);

  return {
    id: tmdbId ?? movie.id ?? timestamp,
    tmdb_id: tmdbId,
    title: movie.title ?? movie.title_ko ?? '',
    title_ko: movie.title_ko ?? movie.title ?? '',
    poster_path: movie.poster_path ?? null,
    poster_url: posterUrl,
    image: posterUrl,
    reason: movie.reason ?? movie.description ?? '',
    savedAt: movie.savedAt ?? timestamp,
  };
}

function normalizeJournalMovie(movie, timestamp = new Date().toISOString()) {
  const base = normalizeHistoryMovie(movie, timestamp);

  return {
    tmdb_id: base.tmdb_id,
    title: base.title,
    title_ko: base.title_ko,
    poster_url: base.poster_url,
    reason: movie.reason ?? movie.description ?? '',
    saved_at: movie.saved_at ?? timestamp,
  };
}

function flattenJournalEntries(entries) {
  return entries
    .flatMap((entry) => entry.movies.map((movie) => ({
      ...movie,
      date: entry.date,
      savedAt: movie.saved_at,
      image: movie.poster_url,
      id: movie.tmdb_id ?? movie.title,
    })))
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

export function useRecommendationHistory() {
  const [history, setHistory] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  const loadAll = useCallback(() => {
    setHistory(safeReadJSON(HISTORY_STORAGE_KEY, []));
    setJournalEntries(safeReadJSON(JOURNAL_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    loadAll();

    const handleStorage = (event) => {
      if (!event.key || event.key === HISTORY_STORAGE_KEY || event.key === JOURNAL_STORAGE_KEY) {
        loadAll();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(STORAGE_EVENT_NAME, loadAll);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(STORAGE_EVENT_NAME, loadAll);
    };
  }, [loadAll]);

  const saveRecommendations = useCallback((movies) => {
    if (!movies || movies.length === 0) return;

    const timestamp = new Date().toISOString();
    const nextEntries = movies.map((movie) => normalizeHistoryMovie(movie, timestamp));
    const currentHistory = safeReadJSON(HISTORY_STORAGE_KEY, []);

    const combined = [...nextEntries, ...currentHistory];
    const unique = combined.filter((movie, index, self) => (
      index === self.findIndex((candidate) => candidate.tmdb_id === movie.tmdb_id)
    ));
    const updated = unique.slice(0, MAX_STORED);
    setHistory(updated);
    writeJSON(HISTORY_STORAGE_KEY, updated);
  }, []);

  const isMovieSaved = useCallback((tmdbId) => {
    if (!tmdbId) return false;
    return journalEntries.some((entry) => entry.movies.some((movie) => movie.tmdb_id === tmdbId));
  }, [journalEntries]);

  const toggleJournalMovie = useCallback((movie, selectedDate = new Date()) => {
    const tmdbId = movie.tmdb_id ?? movie.id;
    if (!tmdbId) return false;
    const currentEntries = safeReadJSON(JOURNAL_STORAGE_KEY, journalEntries);

    const date = typeof selectedDate === 'string'
      ? selectedDate
      : formatDateKey(selectedDate);

    const alreadySaved = currentEntries.some((entry) => entry.movies.some((savedMovie) => savedMovie.tmdb_id === tmdbId));
    let nextSaved = false;

    const updatedEntries = currentEntries
      .map((entry) => {
        const filteredMovies = entry.movies.filter((savedMovie) => savedMovie.tmdb_id !== tmdbId);
        return filteredMovies.length > 0 ? { ...entry, movies: filteredMovies } : null;
      })
      .filter(Boolean);

    if (!alreadySaved) {
      const timestamp = new Date().toISOString();
      const normalizedMovie = normalizeJournalMovie(movie, timestamp);
      const existingIndex = updatedEntries.findIndex((entry) => entry.date === date);

      if (existingIndex >= 0) {
        updatedEntries[existingIndex] = {
          ...updatedEntries[existingIndex],
          movies: [normalizedMovie, ...updatedEntries[existingIndex].movies],
        };
      } else {
        updatedEntries.push({ date, movies: [normalizedMovie] });
      }

      nextSaved = true;
    }

    const sortedEntries = updatedEntries.sort((a, b) => b.date.localeCompare(a.date));
    setJournalEntries(sortedEntries);
    writeJSON(JOURNAL_STORAGE_KEY, sortedEntries);
    return nextSaved;
  }, [journalEntries]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistory([]);
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
  }, []);

  const clearJournal = useCallback(() => {
    localStorage.removeItem(JOURNAL_STORAGE_KEY);
    setJournalEntries([]);
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
  }, []);

  const getContextForAgent = useCallback(() => {
    if (history.length === 0) return null;
    const recent = history.slice(0, DISPLAY_COUNT);
    const titles = recent.map((movie) => movie.title_ko || movie.title).join(', ');
    return `사용자가 이전에 추천받은 영화: ${titles}. 대화 시 자연스럽게 참고하여 친근하게 대화하세요.`;
  }, [history]);

  const journalMovies = useMemo(() => flattenJournalEntries(journalEntries), [journalEntries]);

  return {
    history,
    recentHistory: history.slice(0, DISPLAY_COUNT),
    hasHistory: history.length > 0,
    journalEntries,
    journalMovies,
    saveRecommendations,
    toggleJournalMovie,
    isMovieSaved,
    getContextForAgent,
    clearHistory,
    clearJournal,
  };
}
