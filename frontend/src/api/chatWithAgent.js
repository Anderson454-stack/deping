const ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const API_KEY  = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const DEPLOY   = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
const API_VER  = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

// ── 시스템 프롬프트 ────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 Deping의 AI 영화 취향 파악 에이전트입니다.
사용자와 자연스러운 한국어 대화를 통해 영화 취향을 파악합니다.
반드시 아래 JSON 형식으로만 응답하세요. 설명·주석·마크다운 없이 JSON만 출력하세요.

[대화 목표 — turn별 순서대로 파악]
  turn 0: 지금 기분 / 에너지 레벨
  turn 1: 선호하는 영화 스타일 (영상미, 스토리, 속도감 등)
  turn 2: 좋아하는 배우 / 감독 (없으면 건너뜀)
  turn 3: 지금 영화에서 원하는 것 (힐링, 에너지, 자극 등)
  turn >= 4: isComplete: true 반환

[응답 형식]
{
  "botMessage": "사용자에게 보여줄 자연스러운 한국어 봇 메시지",
  "profileUpdates": {
    "mood":         null,
    "energy":       null,
    "complexity":   null,
    "patience":     null,
    "visual_style": null,
    "temperature":  null,
    "ending_style": null,
    "inner_need":   null,
    "priority":     [],
    "avoidance":    []
  },
  "quickButtons": [
    { "label": "버튼 텍스트", "maps": {} }
  ],
  "showModal": false,
  "isComplete": false
}

[profileUpdates 규칙]
숫자 항목: -2~+2 정수, 확실하지 않으면 null
  mood:         낮은 에너지(-2) ←→ 높은 에너지(+2)
  energy:       집중 불가(-2) ←→ 완전 몰입(+2)
  complexity:   단순 명쾌(-2) ←→ 복잡한 플롯(+2)
  patience:     빠른 전개(-2) ←→ 느린 전개(+2)
  visual_style: 스토리 중심(-2) ←→ 영상미 중심(+2)
  temperature:  차갑고 긴장감(-2) ←→ 따뜻하고 감성적(+2)
  ending_style: 명쾌한 해결(-2) ←→ 긴 여운(+2)
  inner_need:   위로/힐링(-2) ←→ 흥분/에너지(+2)
배열 항목:
  priority: 중요하게 언급한 것 최대 3개 — "actor"|"story"|"visual"|"music"|"director"
  avoidance: 싫다는 장르/소재 — "horror"|"gore"|"heavy_drama"|"romance"|"war"|"sf"
  언급 없으면 []

[quickButtons 규칙]
  - 3~5개 제안
  - turn 2에서 배우/감독 선택 유도 시 반드시 포함:
    { "label": "🎬 배우·감독 고르기 →", "action": "OPEN_MODAL" }
  - isComplete: true 시 quickButtons: []

[isComplete 규칙]
  - turn >= 4 이면 true
  - 사용자가 "추천해줘", "이제 추천" 등 완료 의사 표현 시 true`;

/**
 * Azure OpenAI 에이전트 호출
 *
 * @param {Object} params
 * @param {string}  params.userMessage          - 사용자 입력 (버튼 label 또는 자유 텍스트)
 * @param {Array}   params.conversationHistory  - [{role, content}] 누적 대화 이력
 * @param {Object}  params.currentProfile       - 현재 누적 userProfile 스냅샷
 * @param {number}  params.turn                 - 현재 대화 턴 (0~3)
 *
 * @returns {Promise<{
 *   botMessage:     string,
 *   profileUpdates: Object,
 *   quickButtons:   Array,
 *   showModal:      boolean,
 *   isComplete:     boolean
 * }>}
 */
export async function chatWithAgent({ userMessage, conversationHistory, currentProfile, turn }) {
  console.log('[Deping] 에이전트 호출:', { userMessage, turn });

  // 끝에 슬래시 정규화 후 표준 Azure OpenAI URL 조합
  const base = ENDPOINT.endsWith('/') ? ENDPOINT.slice(0, -1) : ENDPOINT;
  const url = `${base}/openai/deployments/${DEPLOY}/chat/completions?api-version=${API_VER}`;
  console.log('[Deping] 호출 URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
        {
          role: 'user',
          content: `[사용자 입력] ${userMessage}\n[현재 턴] ${turn}\n[현재 프로필] ${JSON.stringify(currentProfile)}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[Deping] Azure OpenAI 오류 상세:', JSON.stringify(err, null, 2));
    throw new Error(`Azure OpenAI 오류: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

  // JSON 파싱 — 실패 시 plain text를 botMessage로 감싸 폴백
  let result;
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    result = JSON.parse(clean);
  } catch {
    console.warn('[Deping] JSON 파싱 실패 — plain text 폴백:', raw);
    result = {
      botMessage:     raw || '응답을 처리하는 중 문제가 생겼어요. 다시 시도해주세요.',
      profileUpdates: {},
      quickButtons:   [],
      showModal:      false,
      isComplete:     false,
    };
  }

  console.log('[Deping] 봇 메시지:', result.botMessage);
  console.log('[Deping] 프로필 업데이트:', result.profileUpdates);

  return result;
}
