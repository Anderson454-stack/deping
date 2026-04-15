export const CONVERSATION_FLOW = [
  {
    turn: 0,
    botMessage: "안녕하세요! 오늘 어떤 기분이에요? 솔직하게 말해줘요~",
    quickButtons: [
      { label: "신나고 설레요 😄",      maps: { mood: 2,  energy: 2  } },
      { label: "좀 지쳤어요 😮‍💨",       maps: { mood: -1, energy: -1 } },
      { label: "조용히 쉬고 싶어요 🌙", maps: { mood: -1, energy: -2 } },
      { label: "그냥 심심해요 😐",      maps: { mood: 0,  energy: 0  } },
    ],
  },
  {
    turn: 1,
    botMessageFn: (profile) =>
      profile.mood >= 1
        ? "신나는 기분 좋죠! 영화 볼 때 가장 중요하게 보는 건 뭐예요?"
        : "푹 쉬고 싶으시군요. 어떤 게 끌려요?",
    quickButtons: [
      { label: "영상미 ✨",         maps: { visual_style: 2,  priority: "visual" } },
      { label: "스토리 📖",         maps: { complexity: 1,    priority: "story"  } },
      { label: "배우 🎭",           maps: {                   priority: "actor"  } },
      { label: "빠른 전개 ⚡",      maps: { patience: -2 } },
      { label: "여운 있는 엔딩 💭", maps: { ending_style: 2,  patience: 2        } },
    ],
  },
  {
    turn: 2,
    botMessage: "믿고 보는 배우나 감독이 있으신가요? 직접 골라볼까요?",
    quickButtons: [
      { label: "🎬 배우 · 감독 고르기 →",      action: "OPEN_MODAL" },
      { label: "없어요, 그냥 추천해 주세요", maps: {} },
    ],
  },
  {
    turn: 3,
    botMessage: "마지막으로, 지금 영화로 채우고 싶은 마음이 어떤가요?",
    quickButtons: [
      { label: "위로와 힐링 🫂",   maps: { inner_need: -2, temperature: 2  } },
      { label: "흥분과 에너지 🔥", maps: { inner_need: 2,  temperature: -1 } },
      { label: "생각할 거리 🧠",   maps: { inner_need: 1,  complexity: 1   } },
      { label: "그냥 재미 😄",     maps: { inner_need: -1 } },
    ],
  },
];

/*
 * ── GPT 시스템 프롬프트 참조 (Agent 1 분석용) ─────────────────────────────
 *
 * API 연결 후 /api/analyze 엔드포인트에 전달할 시스템 프롬프트 초안:
 *
 * 당신은 Deping의 프로파일러입니다.
 * 사용자 메시지를 분석해서 아래 형식의 JSON만 반환하세요.
 * 설명, 주석, 마크다운 없이 JSON만 출력하세요.
 *
 * [추출 규칙]
 * 1. 숫자 항목 (-2 ~ +2 정수):
 *    - mood:         낮은 에너지(-2) ←→ 높은 에너지(+2)
 *    - energy:       집중 불가(-2) ←→ 완전 몰입(+2)
 *    - complexity:   단순 명쾌(-2) ←→ 복잡한 플롯(+2)
 *    - patience:     빠른 전개(-2) ←→ 느린 전개(+2)
 *    - visual_style: 스토리 중심(-2) ←→ 영상미 중심(+2)
 *    - temperature:  차갑고 긴장감(-2) ←→ 따뜻하고 감성적(+2)
 *    - ending_style: 명쾌한 해결(-2) ←→ 긴 여운(+2)
 *    - inner_need:   위로/힐링(-2) ←→ 흥분/에너지(+2)
 *    → 확실하지 않으면 null
 *
 * 2. 배열 항목:
 *    - priority: 사용자가 중요하게 언급한 것 최대 3개
 *      가능한 값: "actor" | "story" | "visual" | "music" | "director"
 *    - avoidance: 사용자가 싫다고 한 장르/소재
 *      가능한 값: "horror" | "gore" | "heavy_drama" | "romance" | "war" | "sf"
 *    → 언급 없으면 빈 배열 []
 *
 * 3. refs (배우·감독·영화): 별도 모달에서 수집, 여기서 추출 안 함
 */
