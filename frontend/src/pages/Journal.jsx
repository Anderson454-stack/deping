import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/motion/PageTransition';
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getMonthMatrix(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const leadingBlanks = firstDay.getDay();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - leadingBlanks + 1;
    if (day < 1 || day > daysInMonth) {
      return null;
    }

    return new Date(year, month, day);
  });
}

const JOURNAL_UI_KEY = 'deping_journal_ui_state';
const JOURNAL_SCROLL_KEY = 'deping_journal_scroll_top';

function readJournalUiState() {
  try {
    const raw = sessionStorage.getItem(JOURNAL_UI_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const Journal = () => {
  const navigate = useNavigate();
  const { journalEntries } = useRecommendationHistory();
  const persistedUiState = useMemo(() => readJournalUiState(), []);
  const scrollContainerRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (persistedUiState?.currentMonth) {
      return new Date(persistedUiState.currentMonth);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => persistedUiState?.selectedDate ?? toDateKey(new Date()));

  const journalMap = useMemo(() => (
    journalEntries.reduce((accumulator, entry) => {
      accumulator[entry.date] = entry.movies;
      return accumulator;
    }, {})
  ), [journalEntries]);

  const calendarDays = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);
  const selectedMovies = journalMap[selectedDate] ?? [];
  const hasAnyEntries = journalEntries.length > 0;
  const monthLabel = currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  useEffect(() => {
    sessionStorage.setItem(
      JOURNAL_UI_KEY,
      JSON.stringify({
        currentMonth: currentMonth.toISOString(),
        selectedDate,
      })
    );
  }, [currentMonth, selectedDate]);

  useEffect(() => {
    const savedScroll = Number(sessionStorage.getItem(JOURNAL_SCROLL_KEY) ?? 0);
    if (!Number.isFinite(savedScroll) || savedScroll <= 0) return;

    const frameId = window.requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = savedScroll;
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const goToMonth = (offset) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <PageTransition className="h-full">
      <div
        ref={scrollContainerRef}
        onScroll={(event) => sessionStorage.setItem(JOURNAL_SCROLL_KEY, String(event.currentTarget.scrollTop))}
        className="h-full overflow-y-auto px-6 md:px-12 py-8"
      >
        <div className="max-w-7xl mx-auto pb-12">
          <section className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">
              Deeping Journal
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                  저장한 영화를<br />
                  날짜별로 다시 만나요
                </h1>
                <p className="text-on-surface-variant text-base md:text-lg mt-4 leading-relaxed max-w-2xl">
                  추천 카드의 하트를 누르면 그날의 영화가 여기에 차곡차곡 쌓입니다. 보고 싶은 작품만 골라 당신만의 달력으로 남겨보세요.
                </p>
              </div>
              <div
                className="rounded-3xl px-5 py-4 self-start"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                <p className="text-sm font-bold text-primary mb-1">오늘의 안내</p>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {hasAnyEntries ? '날짜를 눌러 그날 저장한 영화를 확인해보세요.' : '아직 저장된 영화가 없어요. 디핑과 대화해보세요!'}
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_360px] gap-8 items-start">
            <div
              className="rounded-[32px] p-6 md:p-8"
              style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-cinematic)' }}
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => goToMonth(-1)}
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-surface-container-low)' }}
                >
                  <span className="material-symbols-outlined text-on-surface">chevron_left</span>
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary mb-2">Calendar View</p>
                  <h2 className="text-2xl font-black tracking-tight">{monthLabel}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => goToMonth(1)}
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-surface-container-low)' }}
                >
                  <span className="material-symbols-outlined text-on-surface">chevron_right</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3 mb-3">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 py-2">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`blank-${index}`} className="aspect-[0.95]" />;
                  }

                  const dateKey = toDateKey(day);
                  const movies = journalMap[dateKey] ?? [];
                  const isSelected = selectedDate === dateKey;
                  const isToday = dateKey === toDateKey(new Date());

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(dateKey)}
                      className="aspect-[0.95] rounded-[24px] p-2 md:p-3 text-left flex flex-col justify-between transition-transform hover:-translate-y-0.5"
                      style={{
                        background: isSelected ? 'var(--color-surface-container-low)' : 'var(--color-surface)',
                        boxShadow: isSelected ? 'var(--shadow-cinematic)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm md:text-base font-bold text-on-surface">{day.getDate()}</span>
                        {isToday ? (
                          <span className="text-[10px] font-bold text-primary">TODAY</span>
                        ) : null}
                      </div>

                      <div className="mt-2 min-h-8 flex items-end gap-1">
                        {movies.length > 0 ? (
                          <>
                            {movies.slice(0, 2).map((movie) => (
                              movie.poster_url ? (
                                <img
                                  key={`${dateKey}-${movie.tmdb_id}`}
                                  src={movie.poster_url}
                                  alt={movie.title_ko ?? movie.title}
                                  className="w-7 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <span
                                  key={`${dateKey}-${movie.tmdb_id}`}
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ background: 'var(--color-primary)' }}
                                />
                              )
                            ))}
                            {movies.length > 2 ? (
                              <span className="text-[10px] font-bold text-primary ml-1">+{movies.length - 2}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="w-2 h-2 rounded-full opacity-40" style={{ background: 'var(--color-surface-container-highest)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside
              className="rounded-[32px] p-6 sticky top-6"
              style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-cinematic)' }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary mb-3">Selected Day</p>
              <h2 className="text-2xl font-black tracking-tight mb-2">
                {selectedDate ? fromDateKey(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) : '날짜를 선택하세요'}
              </h2>
              <p className="text-sm text-on-surface-variant mb-6">
                {selectedMovies.length > 0 ? `${selectedMovies.length}편의 영화가 저장되어 있어요.` : '이 날짜에는 아직 저장된 영화가 없어요.'}
              </p>

              {selectedMovies.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {selectedMovies.map((movie) => (
                    <button
                      key={`${selectedDate}-${movie.tmdb_id}`}
                      type="button"
                      onClick={() => navigate(`/movie/${movie.tmdb_id}`, { state: { movie } })}
                      className="w-full text-left rounded-[24px] p-3 flex gap-3 transition-transform hover:-translate-y-0.5"
                      style={{ background: 'var(--color-surface)' }}
                    >
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title_ko ?? movie.title}
                          className="w-14 h-20 rounded-2xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-14 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--color-surface-container-highest)' }}
                        >
                          <span className="material-symbols-outlined text-on-surface-variant">movie</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface line-clamp-2">
                          {movie.title_ko ?? movie.title}
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70 mt-1">
                          저장 시각 {new Date(movie.saved_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-2 leading-relaxed line-clamp-3">
                          {movie.reason || '추천 이유가 함께 저장되지 않았어요.'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-[28px] px-5 py-10 text-center"
                  style={{ background: 'var(--color-surface)' }}
                >
                  <span className="material-symbols-outlined text-primary text-4xl">calendar_month</span>
                  <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">
                    아직 저장된 영화가 없어요. 디핑과 대화해보세요!
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="mt-5 px-6 py-3 rounded-full text-sm font-bold text-white ruby-gradient"
                  >
                    추천 받으러 가기
                  </button>
                </div>
              )}
            </aside>
          </section>
        </div>
      </div>
    </PageTransition>
  );
};

export default Journal;
