const ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const API_KEY  = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const DEPLOY   = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
const API_VER  = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

const SYSTEM_PROMPT = `당신은 Deping의 프로파일러입니다.
사용자 입력을 분석해서 아래 형식의 JSON만 반환하세요.
설명, 주석, 마크다운 없이 JSON만 출력하세요.

[숫자 항목] -2~+2 정수, 확실하지 않으면 null:
- mood:         낮은 에너지(-2) ←→ 높은 에너지(+2)
- energy:       집중 불가(-2) ←→ 완전 몰입(+2)
- complexity:   단순 명쾌(-2) ←→ 복잡한 플롯(+2)
- patience:     빠른 전개(-2) ←→ 느린 전개(+2)
- visual_style: 스토리 중심(-2) ←→ 영상미 중심(+2)
- temperature:  차갑고 긴장감(-2) ←→ 따뜻하고 감성적(+2)
- ending_style: 명쾌한 해결(-2) ←→ 긴 여운(+2)
- inner_need:   위로/힐링(-2) ←→ 흥분/에너지(+2)

[배열 항목]:
- priority: 중요하게 언급한 것 최대 3개 순서대로
  가능한 값: "actor" | "story" | "visual" | "music" | "director"
- avoidance: 싫다고 한 장르/소재
  가능한 값: "horror" | "gore" | "heavy_drama" | "romance" | "war" | "sf"
  언급 없으면 []

refs는 추출하지 마세요.

출력 예시:
{
  "mood": -1,
  "energy": -2,
  "complexity": -2,
  "patience": -1,
  "visual_style": 2,
  "temperature": -1,
  "ending_style": null,
  "inner_need": null,
  "priority": ["visual", "actor"],
  "avoidance": []
}`;

/**
 * 퀵버튼 선택 + 자유입력을 종합해 userProfile 업데이트 값을 반환한다.
 *
 * @param {Object} params
 * @param {string|null}  params.quickButtonLabel  - 선택된 퀵버튼 label (없으면 null)
 * @param {Object|null}  params.quickButtonMaps   - 해당 버튼의 maps 객체 (없으면 null)
 * @param {string|null}  params.freeText          - 자유 입력 텍스트 (없으면 null)
 * @param {Object}       params.currentProfile    - 현재 userProfile 스냅샷
 * @param {number}       params.turn              - 현재 대화 turn
 * @returns {Promise<{ profileUpdates: Object }>}
 */
export async function analyzeInput({
  quickButtonLabel,
  quickButtonMaps,
  freeText,
  currentProfile,
  turn,
}) {
  // 자유입력 없으면 maps만 반환 — API 호출 불필요
  if (!freeText) {
    return { profileUpdates: quickButtonMaps || {} };
  }

  // API 키 미설정 시 폴백
  if (!API_KEY || API_KEY === '여기에_실제_API_키_입력') {
    console.warn('[Deping] API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
    return { profileUpdates: quickButtonMaps || {} };
  }

  try {
    // Azure OpenAI 엔드포인트 형식:
    // {endpoint}/deployments/{deployment}/chat/completions?api-version={version}
    const url = `${ENDPOINT}/openai/deployments/${DEPLOY}/chat/completions?api-version=${API_VER}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,   // Azure는 'api-key' 헤더 사용 (Anthropic의 'x-api-key'와 다름)
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `퀵버튼 선택: ${quickButtonLabel || '없음'}
자유입력: ${freeText}
현재 누적 프로필: ${JSON.stringify(currentProfile)}

위 정보를 종합해서 업데이트할 프로필 JSON을 반환하세요.`,
          },
        ],
        max_tokens: 500,
        temperature: 0,   // 분석 일관성 우선
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[Deping] Azure OpenAI 오류:', err);
      return { profileUpdates: quickButtonMaps || {} };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

    // 마크다운 펜스 방어
    const clean = raw.replace(/```json|```/g, '').trim();
    const profileUpdates = JSON.parse(clean);

    console.log('[Deping] 프로필 업데이트 (API):', profileUpdates);
    return { profileUpdates };

  } catch (error) {
    console.error('[Deping] 분석 실패 — maps 폴백 적용:', error);
    return { profileUpdates: quickButtonMaps || {} };
  }
}
