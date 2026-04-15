import React, { useState, useRef, useEffect } from 'react';
import { PageTransition } from '../components/motion/PageTransition';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import QuickButtons from '../components/chat/QuickButtons';
import MovieCard from '../components/chat/MovieCard';
import ReasoningLog from '../components/chat/ReasoningLog';
import OnboardingModal from '../components/OnboardingModal';
import { DEMO_SCRIPT } from '../data/demoScript';

// ── 현재 시각 포맷 헬퍼 ───────────────────────────────────────
const getTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

// ── 로딩 메시지 컴포넌트 (자체 타이머로 단계별 등장) ──────────
const LoadingMessage = () => {
  const [visibleSteps, setVisibleSteps] = useState([]);

  useEffect(() => {
    const timers = DEMO_SCRIPT.loading.steps.map((_, i) =>
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, DEMO_SCRIPT.loading.steps[i]]);
      }, (i + 1) * 500)
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
              width: 8,
              height: 8,
              borderRadius: '50%',
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
      {visibleSteps.map((s, i) => (
        <p
          key={i}
          style={{
            fontSize: 12,
            color: 'var(--color-on-surface-variant)',
            opacity: 0.6,
            margin: '4px 0 0',
          }}
        >
          ✓ {s}
        </p>
      ))}
    </div>
  );
};

// ── 메인 컴포넌트 ────────────────────────────────────────────
const ChatGuide = () => {
  /*
   * step 흐름:
   *   0 → 인사 + 기분 선택 (퀵버튼)
   *   1 → 장르 선택 (퀵버튼)
   *   2 → "선택하러 가기" 메시지 (OnboardingModal 대기)
   *   3 → 로딩 (모달 완료 후)
   *   4 → 영화 3장 결과
   *   5 → 후속 자유 대화
   */
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: DEMO_SCRIPT.greeting.bot, time: getTime() },
  ]);
  const [activeButtons, setActiveButtons] = useState(DEMO_SCRIPT.greeting.quickButtons);
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [userSelections, setUserSelections] = useState({ movies: [], actors: [], directors: [] });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeButtons, showModal]);

  const addMessage = (msg) =>
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), time: getTime(), ...msg },
    ]);

  // ── 사용자 입력 처리 ─────────────────────────────────────────
  const handleUserInput = (text) => {
    if (!text.trim()) return;
    addMessage({ type: 'user', text });
    setActiveButtons([]);
    processStep(step, text);
  };

  // ── 대화 상태머신 ────────────────────────────────────────────
  const processStep = (currentStep, _userText) => {
    if (currentStep === 0) {
      // 기분 선택 → 장르 질문
      setTimeout(() => {
        addMessage({ type: 'bot', text: DEMO_SCRIPT.genre.bot });
        setActiveButtons(DEMO_SCRIPT.genre.quickButtons);
        setStep(1);
      }, 500);

    } else if (currentStep === 1) {
      // 장르 선택 → "선택하러 가기" 메시지 (모달 대기)
      setTimeout(() => {
        addMessage({ type: 'selector', text: DEMO_SCRIPT.selector.bot });
        setActiveButtons([]);
        setStep(2);
      }, 500);

    } else if (currentStep >= 4) {
      // 후속 자유 대화 (영화 칩 클릭 포함)
      setStep(5);
      setTimeout(() => {
        addMessage({
          type: 'bot',
          text: '좋아요! 조건을 더 좁혀볼게요 😊\n다른 분위기나 특정 요소가 있으면 말해주세요.',
        });
      }, 600);
    }
  };

  // ── 모달 완료 처리 ───────────────────────────────────────────
  const handleModalComplete = (selections) => {
    setUserSelections(selections);
    setShowModal(false);
    setStep(3);

    // 봇 분석 시작 메시지
    addMessage({
      type: 'bot',
      text: '알겠습니다. 당신의 취향을 분석하고 맞춤 영화를 추천해줄게요…!',
    });

    // 500ms 후 로딩 시작
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: 'loading', type: 'loading' }]);

      // TODO: API 연결 시 이 부분을 교체
      // const response = await fetch('http://localhost:5000/api/prescribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ answers: selections })
      // });
      // const data = await response.json();
      // setMovies(data.recommendations);
      // setReasoningLog(data.reasoning_log);

      // 1800ms 후 결과 표시
      setTimeout(() => {
        const ts = Date.now();
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== 'loading'),
          { id: ts,     type: 'bot',       text: DEMO_SCRIPT.result.intro, time: getTime() },
          { id: ts + 1, type: 'movies',    movies: DEMO_SCRIPT.result.movies },
          { id: ts + 2, type: 'reasoning', logs: DEMO_SCRIPT.result.reasoningLog },
        ]);
        setStep(4);
      }, 1800);
    }, 500);
  };

  // ── 메시지 렌더러 ────────────────────────────────────────────
  const renderMessage = (msg) => {
    switch (msg.type) {

      case 'user':
        return (
          <ChatBubble key={msg.id} role="user" message={msg.text} time={msg.time} />
        );

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

      // "선택하러 가기" 버튼이 붙은 봇 메시지
      case 'selector':
        return (
          <div key={msg.id}>
            <ChatBubble
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
            {/* 인라인 "선택하러 가기" 버튼 — step >= 3 이후 비활성화 */}
            <div style={{ marginLeft: 44, marginTop: -12, marginBottom: 16 }}>
              <button
                onClick={step === 2 ? () => setShowModal(true) : undefined}
                disabled={step !== 2}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  background: step === 2 ? '#8B1A1A' : 'var(--color-surface-container)',
                  color: step === 2 ? 'white' : 'var(--color-on-surface-variant)',
                  border: 'none',
                  borderRadius: 20,
                  padding: '9px 22px',
                  cursor: step === 2 ? 'pointer' : 'default',
                  opacity: step !== 2 ? 0.45 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (step === 2) e.currentTarget.style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  if (step === 2) e.currentTarget.style.opacity = '1';
                }}
              >
                선택하러 가기 →
              </button>
            </div>
          </div>
        );

      case 'loading':
        return <LoadingMessage key="loading" />;

      case 'movies':
        return (
          <div key={msg.id}>
            {msg.movies.map((movie, i) => (
              <MovieCard key={i} {...movie} onChipClick={handleUserInput} />
            ))}
          </div>
        );

      case 'reasoning':
        return <ReasoningLog key={msg.id} logs={msg.logs} />;

      default:
        return null;
    }
  };

  // ── 입력창 placeholder ───────────────────────────────────────
  const inputPlaceholder =
    step >= 4 ? '자유롭게 입력하세요...'
    : step === 3 ? '분석 중...'
    : step === 2 ? '또는 위 버튼을 눌러보세요'
    : '또는 직접 입력하세요...';

  return (
    <PageTransition className="h-full flex flex-col">

      {/* OnboardingModal — step 2에서 버튼 클릭 시 표시 */}
      {showModal && <OnboardingModal onComplete={handleModalComplete} />}

      {/* ① 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-0">
        <div className="max-w-3xl mx-auto py-10">

          {messages.map(renderMessage)}

          {activeButtons.length > 0 && (
            <QuickButtons buttons={activeButtons} onSelect={handleUserInput} />
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ② 입력 영역 */}
      <div className="flex-shrink-0">
        <ChatInput
          onSend={handleUserInput}
          isLoading={step === 3}
          placeholder={inputPlaceholder}
        />
      </div>

    </PageTransition>
  );
};

export default ChatGuide;
