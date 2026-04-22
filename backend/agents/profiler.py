"""
Agent 1 — 프로파일러
Azure OpenAI를 호출하여 사용자의 영화 취향·인지적 감상 스타일을 수집한다.
응답 JSON에 type 필드를 추가해 프론트가 카드 표시 여부를 판단할 수 있게 한다.
"""

import json
import logging
import os
import re

import requests


logger = logging.getLogger("deping.profiler")

GENRE_KEYWORDS = {
    "horror": ("공포", "호러", "horror"),
    "thriller": ("스릴러", "thriller"),
    "romance": ("로맨스", "멜로", "romance", "로맨틱"),
    "comedy": ("코미디", "코믹", "comedy", "로코", "romcom"),
    "action": ("액션", "action"),
    "drama": ("드라마", "drama"),
    "sf": ("sf", "sci-fi", "scifi", "sciencefiction", "공상과학"),
    "crime": ("범죄", "crime"),
    "mystery": ("미스터리", "mystery", "추리", "추리물"),
    "fantasy": ("판타지", "fantasy"),
    "animation": ("애니", "애니메이션", "animation"),
}
NEGATION_KEYWORDS = ("싫", "별로", "말고", "빼고", "제외", "원치", "안보", "안좋", "피하")
FOLLOWING_NEGATION_KEYWORDS = NEGATION_KEYWORDS
POSITIVE_KEYWORDS = ("좋", "원해", "원합", "보고싶", "보고싶어", "끌", "선호")

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
    "genres":       [],
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
  genres: 사용자가 명시적으로 원한다고 말한 장르 최대 3개 —
    "action"|"thriller"|"horror"|"romance"|"comedy"|"drama"|"sf"|"crime"|"mystery"|"fantasy"|"animation"
  priority: 중요하게 언급한 것 최대 3개 — "actor"|"story"|"visual"|"music"|"director"
  avoidance: 싫다는 장르/소재 — "horror"|"gore"|"heavy_drama"|"romance"|"war"|"sf"
  언급 없으면 []

[매우 중요 — profileUpdates 우선 규칙]
- 사용자가 현재 입력에서 기분/에너지 상태를 직접 말하면, 반드시 같은 응답의 profileUpdates.mood 와 profileUpdates.energy 를 채우세요.
- quickButtons.maps 에 넣은 값은 profileUpdates를 대체하는 용도가 아닙니다. quickButtons는 제안용이고, profileUpdates는 현재까지 확정된 추출값이어야 합니다.
- 특히 turn 0에서 사용자가 "나른하다", "편안하다", "쉬고 싶다", "에너지가 넘친다", "가라앉았다" 같은 표현을 말하면 mood/energy를 null로 두지 마세요.
- null은 현재 사용자 입력만으로 정말 판단 불가능할 때만 허용됩니다.
- 사용자의 현재 입력에서 바로 추출 가능한 값은 반드시 profileUpdates에 먼저 반영하고, quickButtons는 후속 선택지를 제안하는 용도로만 추가하세요.
- 사용자가 감정 톤까지 드러내면 temperature도 함께 채우세요. 예:
  - "편안하다", "포근하다", "따뜻하다" -> temperature는 양수 방향
  - "가라앉다", "우울하다", "쓸쓸하다" -> temperature는 음수 방향
- 사용자가 지금 영화에서 원하는 감정적 필요가 드러나면 inner_need도 함께 채우세요. 예:
  - "위로", "힐링", "쉬고 싶다", "편안하게 보고 싶다" -> inner_need는 음수 방향
  - "기분 전환", "활력", "에너지를 얻고 싶다" -> inner_need는 양수 방향
- 사용자가 "공포 스릴러", "로맨스", "코미디", "액션", "드라마", "호러", "SF"처럼 장르를 명시적으로 말하면 profileUpdates.genres에 canonical 값으로 반드시 보존하세요.
- 사용자가 "공포는 싫어요", "로맨스는 말고"처럼 장르를 피하고 싶다고 말하면 profileUpdates.avoidance에 반영하세요.
- 장르 의도는 refs나 분위기 요약으로 대체하지 말고, 명시적이면 구조화된 배열로 남겨야 합니다.

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
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip().rstrip("/")
    deployment = _get_deployment()
    if endpoint.endswith("/v1"):
        endpoint = endpoint[:-3]
    if endpoint:
        return f"{endpoint}/openai/deployments/{deployment}/chat/completions"
    raise ValueError("AZURE_OPENAI_ENDPOINT 환경변수가 없습니다.")


def _chat_api_versions() -> list[str]:
    return [
        version
        for version in (
            os.getenv("AZURE_OPENAI_CHAT_API_VERSION", "").strip(),
            os.getenv("AZURE_OPENAI_API_VERSION", "").strip(),
            "2024-10-21",
            "2024-06-01",
        )
        if version
    ]


def _get_deployment() -> str:
    return os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")


def _normalize_text(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(value or "").lower())


def _sanitize_model_json(text: str) -> str:
    cleaned = text.replace("```json", "").replace("```", "").strip()
    # 모델이 JSON 안에 +2 같은 비표준 숫자 표기를 넣는 경우를 방어
    cleaned = re.sub(r'(:\s*)\+(\d+)', r"\1\2", cleaned)
    return cleaned


def _unique_list(items: list[str]) -> list[str]:
    seen: set[str] = set()
    unique_items: list[str] = []
    for item in items:
        text = str(item or "").strip()
        if not text or text in seen:
            continue
        unique_items.append(text)
        seen.add(text)
    return unique_items


def _ensure_list(value) -> list[str]:
    if isinstance(value, list):
        return _unique_list([str(item).strip() for item in value if str(item).strip()])
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _has_local_negation(normalized_text: str, token: str) -> bool:
    start = 0
    while True:
        index = normalized_text.find(token, start)
        if index < 0:
            return False
        after = normalized_text[index + len(token):min(len(normalized_text), index + len(token) + 6)]
        if any(neg in after for neg in FOLLOWING_NEGATION_KEYWORDS):
            return True
        start = index + len(token)


def _has_local_positive(normalized_text: str, token: str) -> bool:
    start = 0
    while True:
        index = normalized_text.find(token, start)
        if index < 0:
            return False
        after = normalized_text[index + len(token):min(len(normalized_text), index + len(token) + 8)]
        if any(pos in after for pos in POSITIVE_KEYWORDS):
            return True
        start = index + len(token)


def _extract_explicit_genres(user_message: str) -> tuple[list[str], list[str]]:
    normalized_user = _normalize_text(user_message)
    if not normalized_user:
        return [], []

    positives: list[str] = []
    negatives: list[str] = []

    for canonical, keywords in GENRE_KEYWORDS.items():
        matched = False
        negated = False
        for keyword in keywords:
            token = _normalize_text(keyword)
            if not token or token not in normalized_user:
                continue
            matched = True
            if _has_local_negation(normalized_user, token):
                negated = True
                break
        if not matched:
            continue
        if not negated and _has_local_positive(normalized_user, token):
            positives.append(canonical)
            continue
        if negated:
            negatives.append(canonical)
        else:
            positives.append(canonical)

    return _unique_list(positives), _unique_list(negatives)


def _keyword_overlap_score(user_message: str, label: str) -> int:
    normalized_user = _normalize_text(user_message)
    normalized_label = _normalize_text(label)
    if not normalized_user or not normalized_label:
        return 0

    if normalized_user == normalized_label:
        return 100
    if normalized_user in normalized_label or normalized_label in normalized_user:
        return 80

    score = 0
    shared_keywords = [
        "편안", "편하게", "쉬고", "나른", "차분", "평온",
        "에너지", "신나", "활기", "짜릿", "가라앉", "우울", "무기력", "무난",
    ]
    for keyword in shared_keywords:
        if keyword in normalized_user and keyword in normalized_label:
            score += 20
    return score


def _heuristic_button_score(user_message: str, maps: dict) -> int:
    normalized_user = _normalize_text(user_message)
    if not normalized_user:
        return 0

    mood = maps.get("mood")
    energy = maps.get("energy")
    score = 0

    if mood == -1 and energy == -1:
        if any(keyword in normalized_user for keyword in ("나른", "편안", "편하게", "쉬고", "차분", "평온")):
            score += 90
    if mood == -2 and energy == -2:
        if any(keyword in normalized_user for keyword in ("가라앉", "우울", "무기력", "축처", "힘들")):
            score += 50
    if mood == 2 and energy == 2:
        if any(keyword in normalized_user for keyword in ("에너지", "신나", "활기", "짜릿", "업", "텐션")):
            score += 50
    if mood == 0 and energy == 0:
        if any(keyword in normalized_user for keyword in ("무난", "그냥", "보통", "평범")):
            score += 40

    return score


def _promote_profile_updates_from_quick_buttons(result: dict, user_message: str) -> dict:
    profile_updates = result.get("profileUpdates")
    if not isinstance(profile_updates, dict):
        profile_updates = {}
        result["profileUpdates"] = profile_updates

    needs_mood = profile_updates.get("mood") is None
    needs_energy = profile_updates.get("energy") is None
    if not (needs_mood or needs_energy):
        return result

    best_maps = None
    best_score = 0
    best_label = None

    for button in result.get("quickButtons", []):
        if not isinstance(button, dict):
            continue
        maps = button.get("maps")
        if not isinstance(maps, dict):
            continue
        if "mood" not in maps and "energy" not in maps:
            continue

        label = str(button.get("label", ""))
        score = _keyword_overlap_score(user_message, label) + _heuristic_button_score(user_message, maps)
        if score > best_score:
            best_score = score
            best_maps = maps
            best_label = label

    if best_maps and best_score > 0:
        if needs_mood and best_maps.get("mood") is not None:
            profile_updates["mood"] = best_maps.get("mood")
        if needs_energy and best_maps.get("energy") is not None:
            profile_updates["energy"] = best_maps.get("energy")
        print(
            f"[Profiler][promotedFromQuickButtons] "
            f"userMessage={user_message!r} matchedLabel={best_label!r} "
            f"score={best_score} promoted={json.dumps(profile_updates, ensure_ascii=False)}"
        )

    return result


def _enrich_affective_profile_updates(result: dict, user_message: str) -> dict:
    profile_updates = result.get("profileUpdates")
    if not isinstance(profile_updates, dict):
        return result

    normalized_user = _normalize_text(user_message)
    if not normalized_user:
        return result

    restful_keywords = ("나른", "편안", "편하게", "쉬고", "포근", "평온", "잔잔")
    gloomy_keywords = ("가라앉", "우울", "쓸쓸", "다운", "무기력", "침잠")
    uplifting_keywords = ("기분전환", "활력", "에너지", "업", "텐션", "신나")

    if profile_updates.get("mood") == -1 and profile_updates.get("energy") == -1:
        if profile_updates.get("inner_need") is None and any(keyword in normalized_user for keyword in restful_keywords):
            profile_updates["inner_need"] = -2
        if profile_updates.get("temperature") is None and any(keyword in normalized_user for keyword in restful_keywords):
            profile_updates["temperature"] = 2
        if profile_updates.get("temperature") is None and any(keyword in normalized_user for keyword in gloomy_keywords):
            profile_updates["temperature"] = -2
        if profile_updates.get("inner_need") is None and any(keyword in normalized_user for keyword in uplifting_keywords):
            profile_updates["inner_need"] = 2

    return result


def _enrich_genre_profile_updates(result: dict, user_message: str) -> dict:
    profile_updates = result.get("profileUpdates")
    if not isinstance(profile_updates, dict):
        return result

    explicit_genres, avoided_genres = _extract_explicit_genres(user_message)
    if not explicit_genres and not avoided_genres:
        return result

    existing_genres = _ensure_list(profile_updates.get("genres"))
    existing_avoidance = _ensure_list(profile_updates.get("avoidance"))

    if explicit_genres:
        profile_updates["genres"] = _unique_list(explicit_genres + existing_genres)
    if avoided_genres:
        profile_updates["avoidance"] = _unique_list(existing_avoidance + avoided_genres)

    return result


def _sanitize_ui_korean_text(result: dict) -> dict:
    replacements = {
        "テンポ가 빠른": "전개가 빠른",
        "テンポ": "전개",
    }

    bot_message = result.get("botMessage")
    if isinstance(bot_message, str):
        for source, target in replacements.items():
            bot_message = bot_message.replace(source, target)
        result["botMessage"] = bot_message

    quick_buttons = result.get("quickButtons")
    if isinstance(quick_buttons, list):
        sanitized_buttons = []
        for button in quick_buttons:
            if not isinstance(button, dict):
                sanitized_buttons.append(button)
                continue

            label = button.get("label")
            if isinstance(label, str):
                for source, target in replacements.items():
                    label = label.replace(source, target)
                sanitized_buttons.append({**button, "label": label})
            else:
                sanitized_buttons.append(button)
        result["quickButtons"] = sanitized_buttons

    return result


def _parse_profiler_response(raw: str, user_message: str) -> dict:
    # JSON 파싱 — 1차: 마크다운 제거 후 파싱
    #             2차: 문자열 내 {...} 블록 추출 재시도 (모델이 설명 텍스트를 붙인 경우)
    #             3차: plain text 폴백
    result = None
    clean = _sanitize_model_json(raw)
    try:
        result = json.loads(clean)
    except Exception:
        pass

    if result is None:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                result = json.loads(_sanitize_model_json(match.group()))
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

    CARD_ACTIONS = {"show_actor_modal", "show_movie_modal", "show_director_modal", "OPEN_MODAL"}
    has_card_btn = any(
        isinstance(btn, dict) and btn.get("action") in CARD_ACTIONS
        for btn in result.get("quickButtons", [])
    )
    result["type"] = "movie_card" if (result.get("showModal") or has_card_btn) else "chat"
    return _promote_profile_updates_from_quick_buttons(result, user_message)


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

    deployment = _get_deployment()
    endpoint = _get_chat_endpoint()
    print(f"[Profiler][deployment] {deployment}")
    print(f"[Profiler][endpoint] {endpoint}")
    print(f"[Profiler][userMessage] {user_message}")

    response = None
    last_error = None
    for api_version in _chat_api_versions():
        response = requests.post(
            endpoint,
            params={"api-version": api_version},
            headers={
                "Content-Type": "application/json",
                "api-key": os.getenv("AZURE_OPENAI_API_KEY", ""),
            },
            json={
                "messages": messages,
                "max_completion_tokens": 800,
                "temperature": 0.7,
            },
            timeout=30,
        )
        if response.ok:
            break
        last_error = f"{response.status_code}: {response.text[:300]}"
    if response is None or not response.ok:
        raise RuntimeError(f"Profiler Azure OpenAI 호출 실패: {last_error}")
    payload = response.json()
    choices = payload.get("choices") or []
    raw = ((choices[0] or {}).get("message") or {}).get("content", "").strip() if choices else ""

    trace_raw = (
        f"[Deping][Trace] profiler.response_raw "
        f"turn={turn} "
        f"userMessage={user_message!r} "
        f"currentProfile={json.dumps(current_profile, ensure_ascii=False)} "
        f"rawResponse={raw!r}"
    )
    logger.info(trace_raw)
    print(trace_raw)
    print(f"[Profiler][rawResponse] {raw}")

    result = _parse_profiler_response(raw, user_message)
    result = _enrich_affective_profile_updates(result, user_message)
    result = _enrich_genre_profile_updates(result, user_message)
    result = _sanitize_ui_korean_text(result)

    trace_parsed = (
        f"[Deping][Trace] profiler.response_parsed "
        f"turn={turn} "
        f"userMessage={user_message!r} "
        f"profileUpdates={json.dumps(result.get('profileUpdates', {}), ensure_ascii=False)} "
        f"quickButtonMaps={json.dumps([btn.get('maps') for btn in result.get('quickButtons', []) if isinstance(btn, dict) and isinstance(btn.get('maps'), dict)], ensure_ascii=False)} "
        f"fullResult={json.dumps(result, ensure_ascii=False)}"
    )
    logger.info(trace_parsed)
    print(trace_parsed)
    print(f"[Profiler][parsed] {json.dumps(result, ensure_ascii=False)}")
    print(f"[Profiler][profileUpdates] {json.dumps(result.get('profileUpdates', {}), ensure_ascii=False)}")
    print(
        f"[Profiler][quickButtonMaps] "
        f"{json.dumps([btn.get('maps') for btn in result.get('quickButtons', []) if isinstance(btn, dict) and isinstance(btn.get('maps'), dict)], ensure_ascii=False)}"
    )

    return result
