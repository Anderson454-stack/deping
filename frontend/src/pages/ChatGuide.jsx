import React, { useState, useRef, useEffect } from 'react';
import { PageTransition } from '../components/motion/PageTransition';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import MovieCard from '../components/chat/MovieCard';
import ReasoningLog from '../components/chat/ReasoningLog';
import OnboardingModal from '../components/OnboardingModal';
import { DEMO_SCRIPT } from '../data/demoScript';
import { chatWithAgent } from '../api/chatWithAgent';
import { mergeProfile } from '../utils/mergeProfile';

// ── 헬퍼 ─────────────────────────────────────────────────────
const getTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

// ── 로딩 메시지 (자체 타이머) ─────────────────────────────────
const LoadingMessage = () => {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const timers = DEMO_SCRIPT.loading.steps.map((_, i) =>
      setTimeout(() => setVisible((p) => [...p, DEMO_SCRIPT.loading.steps[i]]), (i + 1) * 500)
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
      <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: 0 }}>
        {DEMO_SCRIPT.loading.bot}
      </p>
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

  // ── 에이전트 공통 호출 ────────────────────────────────────
  const callAgent = async ({ userMessage, turn, profileSnapshot, historySnapshot }) => {
    console.log('[Deping] 대화 히스토리:', historySnapshot);
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
      console.log('[Deping] 누적 프로필:', newProfile);

      addBotMessage(result.botMessage);
      setCurrentQuickButtons(result.quickButtons || []);
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: result.botMessage },
      ]);

      if (result.showModal) setShowModal(true);
      if (result.isComplete) startLoading(newProfile);
      setConversationTurn((prev) => prev + 1);
    } catch (err) {
      console.error('[Deping] 에이전트 오류:', err);
      addBotMessage('잠시 오류가 발생했어요. 다시 한번 말씀해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── 퀵버튼 클릭 처리 ─────────────────────────────────────
  const handleQuickButton = (btn) => {
    if (isAnalyzing) return;

    const label = typeof btn === 'string' ? btn : btn.label;

    if (btn.action === 'OPEN_MODAL') {
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
  const startLoading = (profile) => {
    console.log('[Deping] 수집된 userProfile:', profile);

    setCurrentQuickButtons([]);

    setTimeout(() => {
      addBotMessage('알겠습니다. 당신의 취향을 분석하고 맞춤 영화를 추천해줄게요…!');

      setTimeout(() => {
        setMessages((prev) => [...prev, { id: 'loading', type: 'loading' }]);

        // TODO: API 연결 시 이 부분을 교체
        // const response = await fetch('http://localhost:8000/api/prescribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ answers: profile })
        // });
        // const data = await response.json();

        setTimeout(() => {
          const ts = Date.now();
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== 'loading'),
            { id: ts,     type: 'bot',       text: DEMO_SCRIPT.result.intro, time: getTime() },
            { id: ts + 1, type: 'movies',    movies: DEMO_SCRIPT.result.movies },
            { id: ts + 2, type: 'reasoning', logs: DEMO_SCRIPT.result.reasoningLog },
          ]);
          setIsResultPhase(true);
        }, 1800);
      }, 500);
    }, 400);
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
              <MovieCard key={i} {...movie} onChipClick={(chip) => handleSend(chip)} />
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

      {/* OnboardingModal 오버레이 */}
      {showModal && <OnboardingModal onComplete={handleModalComplete} />}

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
