"""
Agent 1 — 프로파일러
Azure OpenAI를 호출하여 사용자의 영화 취향·인지적 감상 스타일을 수집한다.
응답 JSON에 type 필드를 추가해 프론트가 카드 표시 여부를 판단할 수 있게 한다.
"""

import json
import os
import re

import requests

SYSTEM_PROMPT = """CRITICAL: You MUST respond ONLY with a valid JSON object.
Do NOT include any text, explanation, or markdown before or after the JSON.
Do NOT use code fences (```json or ```).
Start your response directly with { and end with }.

당신은 Deping의 AI 영화 취향 파악 에이전트입니다.
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
  - turn 2에서 배우/감독 선택 유도 시 반드시 아래 형식으로 포함:
    { "label": "배우·감독 고르기 🎬", "action": "show_actor_modal" }
    { "label": "없어요", "action": "skip" }
  - 영화 레퍼런스 선택 유도 시:
    { "label": "영화 고르기 🎬", "action": "show_movie_modal" }
    { "label": "없어요", "action": "skip" }
  - isComplete: true 시 quickButtons: []

[showModal 규칙]
  - 항상 showModal: false — 카드 선택은 quickButtons의 action 필드로만 트리거
  - showModal: true 는 절대 사용하지 말 것

[isComplete 규칙 — 매우 중요]
  isComplete: true는 반드시 아래 조건을 모두 충족한 후에만 반환:
  1. mood, energy, inner_need 수집 완료
  2. 카드 선택 퀵버튼(show_actor_modal 또는 show_movie_modal)을 이미 보여줬을 것
     → 카드 선택 단계를 거치지 않았다면 isComplete: true 절대 금지
  3. 사용자가 카드 선택 완료 메시지 또는 "건너뛸게요"를 보냈을 것

  카드 선택 필수 순서:
  Step 1 — 배우/감독 선택 제안 (취향 파악 후 반드시 포함):
  {
    "botMessage": "좋아하는 배우나 감독이 있나요? 있다면 더 정확한 추천이 가능해요 😊",
    "quickButtons": [
      { "label": "배우·감독 고르기 🎬", "action": "show_actor_modal" },
      { "label": "없어요", "action": "skip_card" }
    ],
    "showModal": false, "isComplete": false
  }

  Step 2 — 영화 선택 제안 (Step 1 완료 또는 건너뛰기 후):
  {
    "botMessage": "혹시 좋아하는 영화가 있다면 골라주세요!",
    "quickButtons": [
      { "label": "영화 고르기 🎬", "action": "show_movie_modal" },
      { "label": "없어요", "action": "skip_card" }
    ],
    "showModal": false, "isComplete": false
  }

  사용자가 "건너뛸게요"를 보내면 → 다음 Step으로 진행 (Step 1이면 Step 2, Step 2면 isComplete: true)
  두 Step 모두 완료 또는 건너뛰기 후에만 isComplete: true 반환 가능

## 출력 형식 절대 규칙
- 반드시 순수 JSON만 출력할 것
- 마크다운 코드 펜스(```json 또는 ```) 절대 사용 금지
- JSON 앞뒤에 어떤 설명 텍스트도 추가 금지
- 반드시 botMessage, profileUpdates, quickButtons, showModal, isComplete 필드를 모두 포함"""


def _get_chat_endpoint() -> str:
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
    if endpoint:
        return endpoint
    raise ValueError("AZURE_OPENAI_ENDPOINT 환경변수가 없습니다.")


def _get_deployment() -> str:
    return os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")


def call_profiler(
    user_message: str,
    conversation_history: list,
    current_profile: dict,
    turn: int,
) -> dict:
    """
    Azure OpenAI를 호출하고, 카드 표시가 필요한 경우 type 필드를 포함해 반환한다.

    반환 형식:
    {
        "botMessage":     str,
        "profileUpdates": dict,
        "quickButtons":   list,
        "showModal":      bool,
        "isComplete":     bool,
        "type":           "chat" | "movie_card"   ← 추가
    }
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *conversation_history,
        {
            "role": "user",
            "content": (
                f"[사용자 입력] {user_message}\n"
                f"[현재 턴] {turn}\n"
                f"[현재 프로필] {json.dumps(current_profile, ensure_ascii=False)}"
            ),
        },
    ]

    response = requests.post(
        _get_chat_endpoint(),
        headers={
            "Content-Type": "application/json",
            "api-key": os.getenv("AZURE_OPENAI_API_KEY", ""),
        },
        json={
            "model": _get_deployment(),
            "messages": messages,
            "max_tokens": 800,
            "temperature": 0.7,
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    choices = payload.get("choices") or []
    raw = ((choices[0] or {}).get("message") or {}).get("content", "").strip() if choices else ""

    # JSON 파싱 — 1차: 마크다운 제거 후 파싱
    #             2차: 문자열 내 {...} 블록 추출 재시도 (모델이 설명 텍스트를 붙인 경우)
    #             3차: plain text 폴백
    result = None
    clean = raw.replace("```json", "").replace("```", "").strip()
    try:
        result = json.loads(clean)
    except Exception:
        pass

    if result is None:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except Exception:
                pass

    if result is None:
        result = {
            "botMessage": raw or "응답을 처리하는 중 문제가 생겼어요. 다시 시도해주세요.",
            "profileUpdates": {},
            "quickButtons": [],
            "showModal": False,
            "isComplete": False,
        }

    # ── type 필드 결정 ────────────────────────────────────────────
    # 카드 선택 액션 버튼이 포함된 경우 → movie_card
    CARD_ACTIONS = {"show_actor_modal", "show_movie_modal", "show_director_modal", "OPEN_MODAL"}
    has_card_btn = any(
        isinstance(btn, dict) and btn.get("action") in CARD_ACTIONS
        for btn in result.get("quickButtons", [])
    )
    result["type"] = "movie_card" if (result.get("showModal") or has_card_btn) else "chat"

    return result
