import React, { useState, useRef, useEffect } from 'react';
import { PageTransition } from '../components/motion/PageTransition';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import MovieCard from '../components/chat/MovieCard';
import ReasoningLog from '../components/chat/ReasoningLog';
import OnboardingModal from '../components/OnboardingModal';
import CardSelector from '../components/chat/CardSelector';
import { DEMO_SCRIPT } from '../data/demoScript';
import { chatWithAgent, fetchRecommendations } from '../api/chatWithAgent';
import { mergeProfile } from '../utils/mergeProfile';
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';

// ── 헬퍼 ─────────────────────────────────────────────────────
const getTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

// ── 로딩 메시지 (자체 타이머) ─────────────────────────────────
const LoadingMessage = () => {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const loadingSchedule = [0, 3000, 6000];
    const timers = DEMO_SCRIPT.loading.steps.map((step, i) =>
      setTimeout(() => {
        setVisible((prev) => (prev.includes(step) ? prev : [...prev, step]));
      }, loadingSchedule[i] ?? 6000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ marginLeft: 44, marginTop: 4, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-bounce"
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'inline-block',
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
      {visible.map((s, i) => (
        <p key={i} style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', opacity: 0.6, margin: '4px 0 0' }}>
          ✓ {s}
        </p>
      ))}
    </div>
  );
};

// ── 메인 컴포넌트 ────────────────────────────────────────────
const ChatGuide = () => {
  const { saveRecommendations, toggleJournalMovie, isMovieSaved } = useRecommendationHistory();
  // ── 상태 ──────────────────────────────────────────────────
  const [conversationTurn, setConversationTurn] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);

  const [userProfile, setUserProfile] = useState({
    mood: 0, energy: 0, complexity: 0, patience: 0,
    visual_style: 0, temperature: 0, ending_style: 0,
    inner_need: 0,
    priority: [],
    avoidance: [],
    refs: { actors: [], directors: [], movies: [] },
  });

  const [messages, setMessages] = useState([]);
  const [currentQuickButtons, setCurrentQuickButtons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardModalType, setCardModalType] = useState('actor');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResultPhase, setIsResultPhase] = useState(false);

  const messagesEndRef = useRef(null);
  const initialized = useRef(false);   // StrictMode 이중 실행 방지

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 초기 인사 — 에이전트가 직접 생성 ────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setIsAnalyzing(true);
    chatWithAgent({
      userMessage: '대화를 시작해주세요',
      conversationHistory: [],
      currentProfile: userProfile,
      turn: 0,
    })
      .then((result) => {
        addBotMessage(result.botMessage);
        setCurrentQuickButtons(result.quickButtons || []);
        setConversationHistory([
          { role: 'user', content: '대화를 시작해주세요' },
          { role: 'assistant', content: result.botMessage },
        ]);
      })
      .catch((err) => {
        console.error('[Deping] 초기 인사 실패:', err);
        addBotMessage('안녕하세요! 오늘 어떤 영화를 찾고 계신가요?');
      })
      .finally(() => setIsAnalyzing(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 메시지 추가 헬퍼 ──────────────────────────────────────
  const addMessage = (msg) =>
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), time: getTime(), ...msg },
    ]);

  const addBotMessage = (text) => addMessage({ type: 'bot', text });

  const showToast = (message) => {
    window.dispatchEvent(new CustomEvent('deping:toast', { detail: { message } }));
  };

  // ── 에이전트 공통 호출 ────────────────────────────────────
  const callAgent = async ({ userMessage, turn, profileSnapshot, historySnapshot }) => {
    setIsAnalyzing(true);
    try {
      const result = await chatWithAgent({
        userMessage,
        conversationHistory: historySnapshot,
        currentProfile: profileSnapshot,
        turn,
      });

      const newProfile = mergeProfile(profileSnapshot, result.profileUpdates);
      setUserProfile(newProfile);

      addBotMessage(result.botMessage);
      setCurrentQuickButtons(result.quickButtons || []);
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: result.botMessage },
      ]);

      // 카드 표시: showModal 플래그 또는 type 필드 둘 다 처리
      if (result.showModal || result.type === 'movie_card') setShowModal(true);
      if (result.isComplete) startLoading(newProfile);
      setConversationTurn((prev) => prev + 1);
    } catch (err) {
      console.error('[Deping] 에이전트 오류:', err);
      addBotMessage('잠시 오류가 발생했어요. 다시 한번 말씀해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── 단일 타입 카드 모달 완료 처리 ───────────────────────
  const handleCardModalComplete = (names) => {
    setShowCardModal(false);

    const typeLabel = cardModalType === 'actor' ? '배우' : cardModalType === 'director' ? '감독' : '영화';
    const userMsg = names.length > 0
      ? `${typeLabel} 선택 완료 — ${names.join(', ')}`
      : `${typeLabel} 선택 없이 건너뛸게요`;

    const profileKey = cardModalType === 'actor' ? 'actors' : cardModalType === 'director' ? 'directors' : 'movies';
    const newProfile = {
      ...userProfile,
      refs: { ...userProfile.refs, [profileKey]: names },
    };
    setUserProfile(newProfile);
    addMessage({ type: 'user', text: userMsg });
    callAgent({
      userMessage: userMsg,
      turn: conversationTurn,
      profileSnapshot: newProfile,
      historySnapshot: conversationHistory,
    });
  };

  // ── 퀵버튼 클릭 처리 ─────────────────────────────────────
  const handleQuickButton = (btn) => {
    if (isAnalyzing) return;

    const label = typeof btn === 'string' ? btn : btn.label;
    const action = typeof btn === 'object' ? btn.action : null;

    // 카드 모달 트리거 액션
    if (action === 'show_actor_modal') {
      setCardModalType('actor');
      setShowCardModal(true);
      return;
    }
    if (action === 'show_movie_modal') {
      setCardModalType('movie');
      setShowCardModal(true);
      return;
    }
    if (action === 'show_director_modal') {
      setCardModalType('director');
      setShowCardModal(true);
      return;
    }
    if (action === 'skip_card') {
      addMessage({ type: 'user', text: '건너뛸게요' });
      callAgent({
        userMessage: '건너뛸게요',
        turn: conversationTurn,
        profileSnapshot: userProfile,
        historySnapshot: conversationHistory,
      });
      return;
    }
    if (action === 'skip') {
      addMessage({ type: 'user', text: '없어요, 건너뛸게요' });
      callAgent({
        userMessage: '없어요, 건너뛸게요',
        turn: conversationTurn,
        profileSnapshot: userProfile,
        historySnapshot: conversationHistory,
      });
      return;
    }
    // 기존 OPEN_MODAL 액션 (하위 호환)
    if (action === 'OPEN_MODAL') {
      setShowModal(true);
      return;
    }

    addMessage({ type: 'user', text: label });
    callAgent({
      userMessage: label,
      turn: conversationTurn,
      profileSnapshot: userProfile,
      historySnapshot: conversationHistory,
    });
  };

  // ── 자유입력 전송 처리 ────────────────────────────────────
  const handleSend = (text) => {
    if (!text.trim()) return;

    // 결과 화면 이후 후속 대화
    if (isResultPhase) {
      addMessage({ type: 'user', text });
      setTimeout(() => {
        addBotMessage('좋아요! 조건을 더 좁혀볼게요 😊\n다른 분위기나 특정 요소가 있으면 말해주세요.');
      }, 600);
      return;
    }

    addMessage({ type: 'user', text });
    callAgent({
      userMessage: text,
      turn: conversationTurn,
      profileSnapshot: userProfile,
      historySnapshot: conversationHistory,
    });
  };

  // ── 모달 완료 처리 ───────────────────────────────────────
  const handleModalComplete = (selections) => {
    const newProfile = {
      ...userProfile,
      refs: {
        actors:    selections.actors,
        directors: selections.directors,
        movies:    selections.movies,
      },
    };
    setUserProfile(newProfile);
    setShowModal(false);

    const parts = [
      selections.movies.length > 0    && `영화: ${selections.movies.join(', ')}`,
      selections.actors.length > 0    && `배우: ${selections.actors.join(', ')}`,
      selections.directors.length > 0 && `감독: ${selections.directors.join(', ')}`,
    ].filter(Boolean);

    const summary = parts.length > 0 ? parts.join(' / ') : '선택 없음';
    const userMsg = `레퍼런스 선택 완료 — ${summary}`;

    addMessage({ type: 'user', text: userMsg });
    callAgent({
      userMessage: userMsg,
      turn: conversationTurn,
      profileSnapshot: newProfile,
      historySnapshot: conversationHistory,
    });
  };

  // ── 로딩 → 결과 시퀀스 ───────────────────────────────────
  const startLoading = async (profile) => {
    setCurrentQuickButtons([]);
    addBotMessage('알겠습니다. 당신의 취향을 분석하고 맞춤 영화를 추천해줄게요…!');

    await new Promise((r) => setTimeout(r, 500));
    setMessages((prev) => [...prev, { id: 'loading', type: 'loading' }]);

    // API 호출과 최소 로딩 애니메이션을 병렬 처리
    const [recs] = await Promise.all([
      fetchRecommendations(profile).catch((e) => {
        console.error('[Deping] /api/recommend 오류:', e);
        return [];
      }),
      new Promise((r) => setTimeout(r, 1800)),
    ]);

    // API 결과 → MovieCard 형식 변환, 실패 시 데모 폴백
    let movies;
    if (recs.length > 0) {
      movies = recs.map((r) => ({
        tmdb_id:     r.tmdb_id,
        title:       r.title_ko || r.title,
        year:        r.year,
        genre:       (r.genres || []).join(' · '),
        runtime:     r.runtime ? `${r.runtime}분` : '?분',
        rating:      r.rating_imdb || 0,
        reason:      r.reason,
        complexity:  40,
        visual:      70,
        poster_url:  r.poster_url || null,
        posterColor: 'var(--color-surface-container-highest)',
      }));
      saveRecommendations(movies);
    }
    if (!movies) movies = DEMO_SCRIPT.result.movies;

    const ts = Date.now();
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== 'loading'),
      { id: ts,     type: 'bot',       text: DEMO_SCRIPT.result.intro, time: getTime() },
      { id: ts + 1, type: 'movies',    movies },
      { id: ts + 2, type: 'reasoning', logs: DEMO_SCRIPT.result.reasoningLog },
    ]);
    setIsResultPhase(true);
  };

  // ── 메시지 렌더러 ────────────────────────────────────────
  const renderMessage = (msg) => {
    switch (msg.type) {
      case 'user':
        return <ChatBubble key={msg.id} role="user" message={msg.text} time={msg.time} />;

      case 'bot':
        return (
          <ChatBubble
            key={msg.id}
            role="assistant"
            time={msg.time}
            message={
              <>
                {msg.text.split('\n').map((line, i, arr) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </>
            }
          />
        );

      case 'loading':
        return <LoadingMessage key="loading" />;

      case 'movies':
        return (
          <div key={msg.id}>
            {msg.movies.map((movie, i) => (
              <MovieCard
                key={movie.tmdb_id ?? i}
                {...movie}
                isSaved={isMovieSaved(movie.tmdb_id)}
                onToggleSave={() => {
                  const nextSaved = toggleJournalMovie(movie);
                  showToast(nextSaved ? '저장되었어요!' : '저장을 취소했어요.');
                }}
                onChipClick={(chip) => handleSend(chip)}
              />
            ))}
          </div>
        );

      case 'reasoning':
        return <ReasoningLog key={msg.id} logs={msg.logs} />;

      default:
        return null;
    }
  };

  // ── placeholder — turn별 안내 문구 ───────────────────────
  const PLACEHOLDERS = [
    '또는 지금 기분을 직접 말해줘요...',
    '또는 보고 싶은 스타일을 말해줘요...',
    '또는 좋아하는 배우·감독을 입력해줘요...',
    '또는 지금 원하는 걸 말해줘요...',
  ];
  const inputPlaceholder = isResultPhase
    ? '자유롭게 입력하세요...'
    : PLACEHOLDERS[conversationTurn] ?? '또는 직접 입력하세요...';

  return (
    <PageTransition className="h-full flex flex-col">

      {/* OnboardingModal 오버레이 (전체 3단계) */}
      {showModal && <OnboardingModal onComplete={handleModalComplete} />}

      {/* 단일 타입 카드 모달 (show_actor/movie/director_modal 액션용) */}
      {showCardModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
          onClick={() => handleCardModalComplete([])}
        >
          <div
            style={{
              width: 'min(680px, 95vw)',
              maxHeight: '90vh',
              background: 'var(--color-surface)',
              borderRadius: 20,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 64px -8px rgba(0,0,0,0.28)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '28px 24px 16px', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-on-surface)' }}>
                {cardModalType === 'actor' ? '좋아하는 배우를 선택하세요' :
                 cardModalType === 'director' ? '좋아하는 감독을 선택하세요' :
                 '좋아하는 영화를 선택하세요'}
              </h3>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)', opacity: 0.65 }}>
                선택하지 않아도 괜찮아요
              </p>
            </div>
            <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 8px' }}>
              <CardSelector type={cardModalType} onComplete={handleCardModalComplete} />
            </div>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '8px 24px 24px' }}>
              <button
                onClick={() => handleCardModalComplete([])}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--color-on-surface-variant)', opacity: 0.5,
                  padding: '6px 12px',
                }}
              >
                건너뛰기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ① 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-0">
        <div className="max-w-3xl mx-auto py-10">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ② 입력 영역 — 퀵버튼 + 입력창 동시 표시 */}
      <div className="flex-shrink-0">
        <ChatInput
          onSend={handleSend}
          isLoading={isAnalyzing}
          placeholder={inputPlaceholder}
          quickButtons={!isResultPhase && !showModal ? currentQuickButtons : []}
          onQuickButtonClick={handleQuickButton}
        />
      </div>

    </PageTransition>
  );
};

export default ChatGuide;
