# Agent Profile Schema

코드 기준으로 확인된 Agent profile 입력 계약 문서입니다.
추측은 제외하고, 실제 런타임/코드에서 확인되는 내용만 기록합니다.

## Raw Runtime Shape

현재 프론트 `userProfile` 기본 shape는 아래와 같습니다.

```json
{
  "mood": 0,
  "energy": 0,
  "complexity": 0,
  "patience": 0,
  "visual_style": 0,
  "temperature": 0,
  "ending_style": 0,
  "inner_need": 0,
  "priority": [],
  "avoidance": [],
  "refs": {
    "actors": [],
    "directors": [],
    "movies": []
  }
}
```

확인 위치:
- `frontend/src/pages/ChatGuide.jsx`
- `frontend/src/utils/mergeProfile.js`
- `backend/agents/profiler.py`

## Confirmed Field Names

- 숫자형 축 필드
  - `mood`
  - `energy`
  - `complexity`
  - `patience`
  - `visual_style`
  - `temperature`
  - `ending_style`
  - `inner_need`
- 배열 필드
  - `genres`
  - `priority`
  - `avoidance`
- 카드 선택 참조 필드
  - `refs.actors`
  - `refs.directors`
  - `refs.movies`

확정 사항:
- canonical 필드명은 `avoidance`입니다.
- `avoid`는 현재 profiler prompt/merge 기준 canonical이 아니며, normalizer에서만 하위 호환 alias로 흡수합니다.
- 추천 API 요청 shape는 `POST /api/recommend` with `{ "profile": <userProfile> }` 입니다.

## Confirmed Numeric Contract

`backend/agents/profiler.py` 기준:

- 모든 숫자형 profileUpdates 필드는 `-2..+2` 정수 또는 `null`
- 축 의미는 아래와 같습니다.

### mood
- `-2` = 낮은 에너지 방향
- `+2` = 높은 에너지 방향

### energy
- `-2` = 집중 불가 방향
- `+2` = 완전 몰입 방향

### complexity
- `-2` = 단순 명쾌 방향
- `+2` = 복잡한 플롯 방향

### patience
- `-2` = 빠른 전개 선호 방향
- `+2` = 느린 전개 선호 방향

### visual_style
- `-2` = 스토리 중심 방향
- `+2` = 영상미 중심 방향

### temperature
- `-2` = 차갑고 긴장감 있는 방향
- `+2` = 따뜻하고 감성적인 방향

### ending_style
- `-2` = 명쾌한 해결 방향
- `+2` = 긴 여운 방향

### inner_need
- `-2` = 위로/힐링 방향
- `+2` = 흥분/에너지 방향

## Important Caveat About `0`

코드 기준으로 `0`은 현재 두 역할이 겹칩니다.

- 프론트 초기 기본값
- 숫자 축의 중앙값

따라서 현재 코드만으로는 아래를 구분할 수 없습니다.

- `0`이 사용자의 명시적 중간 선호인지
- 아직 정보가 수집되지 않은 기본 상태인지

이 문서에서는 `0 = medium`으로 단정하지 않습니다.
normalizer/searcher는 이 값을 과도하게 해석하지 않도록 설계합니다.

## Conservative Labels Layer

현재 `backend/agents/profile_normalizer.py`는 raw 숫자형을 유지한 상태로 `labels`를 별도 생성합니다.

- `raw`는 들어온 숫자값을 유지합니다.
- `labels`는 코드에서 의미가 분명한 값만 채웁니다.
- 의미가 확정되지 않은 값은 `None`입니다.

현재 보수적으로 해석하는 값:

- `complexity`
  - `-2` -> `low`
  - `2` -> `high`
- `patience`
  - `-2` -> `low`
  - `2` -> `high`
- `visual_style`
  - `-2` -> `story_over_visuals`
  - `2` -> `visuals_over_story`
- `mood`
  - `-2` -> `low_energy_mood`
  - `2` -> `high_energy_mood`
- `energy`
  - `-2` -> `unfocused`
  - `2` -> `fully_engaged`
- `ending_style`
  - `-2` -> `resolved`
  - `2` -> `lingering`
- `inner_need`
  - `-2` -> `healing`
  - `2` -> `energy`
- `temperature`
  - `-2` -> `cold_tense`
  - `2` -> `warm_emotional`

해석하지 않는 값:

- `-1`
- `0`
- `1`
- 범위를 벗어난 값

이 값들은 현재 `labels`에서 모두 `None`으로 남깁니다.

## Confirmed Array Contract

### priority

`backend/agents/profiler.py` 기준 가능한 값:

- `actor`
- `story`
- `visual`
- `music`
- `director`

현재 코드상 항상 배열로 취급됩니다.

### genres

현재 명시적 장르 의도는 배열 필드로 유지됩니다.

가능한 canonical 값:

- `action`
- `thriller`
- `horror`
- `romance`
- `comedy`
- `drama`
- `sf`
- `crime`
- `mystery`
- `fantasy`
- `animation`

의도:

- 사용자가 "공포 스릴러", "로맨스", "코미디", "액션"처럼 보고 싶은 장르를 직접 말했을 때 보존
- `avoidance`처럼 회피 장르가 아니라, 적극적으로 원하는 장르 신호

### avoidance

`backend/agents/profiler.py` 기준 가능한 값:

- `horror`
- `gore`
- `heavy_drama`
- `romance`
- `war`
- `sf`

현재 코드상 항상 배열로 취급됩니다.

## Confirmed Runtime Flow

1. 프론트 `ChatGuide.jsx`가 `userProfile`을 숫자형 기본값으로 초기화합니다.
2. `chatWithAgent.js`가 `/api/chat`으로 `current_profile`을 전달합니다.
3. `backend/agents/profiler.py`가 숫자형 `profileUpdates`를 반환합니다.
4. `frontend/src/utils/mergeProfile.js`가 `priority`, `avoidance`는 배열 병합하고 나머지는 덮어씁니다.
5. 최종 추천 시 `chatWithAgent.js`의 `fetchRecommendations(profile)`가 `/api/recommend`에 `{ profile }`를 POST 합니다.

## Searcher Contract

Searcher는 원본 profile 숫자 필드를 직접 해석하지 않습니다.
반드시 `backend/agents/profile_normalizer.py`를 거친 normalized profile만 사용합니다.

## Mood / Energy Investigation

현재 코드 기준으로 `mood`, `energy`가 기대만큼 반영되지 않는 원인은 아래 우선순위로 보입니다.

1. `backend/agents/profiler.py`
   - 실제 모델 응답이 `mood`, `energy`를 `null` 또는 `0`으로 보내는 경우
2. `frontend/src/utils/mergeProfile.js`
   - `null`/`undefined`는 병합하지 않으므로, 응답이 비어 있으면 기존값이 유지됨
3. `frontend/src/api/chatWithAgent.js`
   - transport 단계에서는 `profileUpdates`를 그대로 반환하므로 구조 손실 가능성은 상대적으로 낮음

즉 현재 코드만 보면 merge overwrite 버그보다는 profiler 응답 누락/보수적 응답일 가능성이 더 큽니다.
