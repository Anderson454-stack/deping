import { buildApiUrl } from './baseUrl';

/**
 * Agent 3 (큐레이터) — 프로필 기반 영화 추천
 *
 * POST /api/recommend → FastAPI → GPT-5
 * @param {Object} profile - Agent 1이 수집한 사용자 프로필
 * @returns {Promise<Array>} recommendations 배열 (빈 배열 폴백)
 */
export async function fetchRecommendations(profile) {
  const res = await fetch(buildApiUrl('/api/recommend'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error(`추천 API 오류: ${res.status}`);
  const data = await res.json();
  return data.recommendations || [];
}

/**
 * Agent 1 (프로파일러) — 백엔드 API 호출
 *
 * POST /api/chat → FastAPI → Azure OpenAI
 * API 키는 백엔드 환경변수에서 관리하므로 프론트에 노출되지 않는다.
 *
 * @param {Object} params
 * @param {string}  params.userMessage          - 사용자 입력
 * @param {Array}   params.conversationHistory  - [{role, content}] 누적 대화 이력
 * @param {Object}  params.currentProfile       - 현재 누적 userProfile 스냅샷
 * @param {number}  params.turn                 - 현재 대화 턴 (0~3)
 *
 * @returns {Promise<{
 *   botMessage:     string,
 *   profileUpdates: Object,
 *   quickButtons:   Array,
 *   showModal:      boolean,
 *   isComplete:     boolean,
 *   type:           "chat" | "movie_card"
 * }>}
 */
// 카드 선택 완료/건너뛰기 후 모델이 JSON 형식을 "잊는" 현상 방지
// → 해당 user 메시지 직후 올바른 assistant JSON 예시를 few-shot으로 주입
const CARD_PATTERNS = ['선택 완료', '건너뛸게요', '배우 선택', '감독 선택', '영화 선택'];
const FEW_SHOT_ASSISTANT = {
  role: 'assistant',
  content: JSON.stringify({
    botMessage: '선택해주셨군요! 좀 더 여쭤볼게요.',
    profileUpdates: {},
    quickButtons: [],
    showModal: false,
    isComplete: false,
  }),
};

function injectFewShot(history) {
  const result = [];
  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    result.push(msg);
    // 카드 선택 user 메시지 뒤에 assistant few-shot 삽입 (이미 assistant가 있으면 스킵)
    const nextIsAssistant = history[i + 1]?.role === 'assistant';
    if (
      msg.role === 'user' &&
      CARD_PATTERNS.some((p) => msg.content?.includes(p)) &&
      !nextIsAssistant
    ) {
      result.push(FEW_SHOT_ASSISTANT);
    }
  }
  return result;
}

export async function chatWithAgent({ userMessage, conversationHistory, currentProfile, turn }) {
  console.log('[Deping] 에이전트 호출 (백엔드):', { userMessage, turn });

  const augmentedHistory = injectFewShot(conversationHistory);

  const response = await fetch(buildApiUrl('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      conversation_history: augmentedHistory,
      current_profile: currentProfile,
      turn,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[Deping] /api/chat 오류 상세:', JSON.stringify(err, null, 2));
    throw new Error(`백엔드 오류: ${response.status}`);
  }

  let raw = await response.json();

  // ── extractJSON: 문자열에서 JSON 객체 추출 (4단계 시도) ──────
  function extractJSON(text) {
    if (typeof text !== 'string') return null;

    // 1순위: ```json ... ``` 블록
    const fenceJson = text.match(/```json\s*([\s\S]*?)```/);
    if (fenceJson) {
      try { return JSON.parse(fenceJson[1].trim()); } catch {}
    }

    // 2순위: ``` ... ``` 블록 (언어 표시 없음)
    const fence = text.match(/```\s*([\s\S]*?)```/);
    if (fence) {
      try { return JSON.parse(fence[1].trim()); } catch {}
    }

    // 3순위: 텍스트 내 최외곽 { ... } 블록
    const brace = text.match(/\{[\s\S]*\}/);
    if (brace) {
      try { return JSON.parse(brace[0]); } catch {}
    }

    return null; // 4순위: 파싱 완전 실패
  }

  function normalizeAgentPayload(payload) {
    if (typeof payload === 'string') {
      const parsed = extractJSON(payload);
      if (parsed) return normalizeAgentPayload(parsed);
      return {
        botMessage: payload,
        profileUpdates: {},
        quickButtons: [],
        showModal: false,
        isComplete: false,
        type: 'chat',
        cardType: 'actor',
      };
    }

    if (!payload || typeof payload !== 'object') {
      return {
        botMessage: '잠시 문제가 생겼어요. 다시 한번 말씀해주세요.',
        profileUpdates: {},
        quickButtons: [],
        showModal: false,
        isComplete: false,
        type: 'chat',
        cardType: 'actor',
      };
    }

    if (typeof payload.botMessage === 'string') {
      const inner = extractJSON(payload.botMessage);
      if (inner && (inner.botMessage != null || inner.quickButtons != null || inner.isComplete != null)) {
        return normalizeAgentPayload({
          ...payload,
          ...inner,
        });
      }
    }

    const rawMsg = payload.botMessage;
    const botMessage = typeof rawMsg === 'string'
      ? (rawMsg || '잠시 문제가 생겼어요. 다시 한번 말씀해주세요.')
      : rawMsg != null
        ? JSON.stringify(rawMsg)
        : '잠시 문제가 생겼어요. 다시 한번 말씀해주세요.';

    return {
      botMessage,
      profileUpdates: payload.profileUpdates || {},
      quickButtons: Array.isArray(payload.quickButtons) ? payload.quickButtons : [],
      showModal: payload.showModal ?? false,
      isComplete: payload.isComplete ?? false,
      type: payload.type ?? 'chat',
      cardType: payload.cardType ?? 'actor',
    };
  }

  const normalized = normalizeAgentPayload(raw);
  const {
    botMessage,
    profileUpdates,
    quickButtons,
    isComplete,
    showModal,
    type,
    cardType,
  } = normalized;

  console.log('[Deping] 봇 메시지:', botMessage);
  console.log('[Deping] 프로필 업데이트:', profileUpdates);
  console.log('[Deping] 카드 타입:', type, cardType);

  return { botMessage, profileUpdates, quickButtons, showModal, isComplete, type, cardType };
}
