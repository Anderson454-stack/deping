# LLM Connection Audit

점검 일자: 2026-04-19

## 결론

- `/api/chat`은 실제 Azure OpenAI deployment `gpt-5-chat` 호출 중
- `/api/recommend`도 실제 Azure OpenAI deployment `gpt-5-chat` 호출 중
- 다만 `/api/recommend`는 모델 실패 시 검색 결과 기반 fallback 경로가 있음
- `/api/chat`은 모델 호출 실패 시 mock 응답으로 200을 내리는 구조가 아니라 예외를 올려 500으로 종료됨
- 현재 `mood/energy` 누락 문제는 parser/merge보다 profiler의 실제 모델 응답이 `null`을 반환하는 쪽이 더 유력함

## 근거

### Environment / deployment

- `.env`에 `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT=gpt-5-chat` 존재
- `backend/agents/profiler.py`
  - `requests.post(endpoint, json={ "model": deployment, ... })`
  - deployment 기본값도 `gpt-5-chat`
- `backend/main.py`
  - `_call_curator_model(...)`에서 `requests.post(endpoint, json={ "model": deployment, ... })`
  - deployment 기본값도 `gpt-5-chat`

### Actual runtime verification

직접 로컬 실행으로 확인:

1. `call_profiler("나른하고 편안해요 🌿", ...)`
   - 실제 raw LLM 응답 수신 확인
   - 응답은 JSON 형식의 질문/quickButtons/profileUpdates를 포함
2. `_call_curator_model(...)`
   - 실제 raw 응답과 token usage 수신 확인
   - 예시 응답: `{"ok": true, "source": "curator"}`

이는 file-based mock이 아니라 실제 Azure 응답 경로가 동작하고 있음을 보여준다.

## `/api/chat` 경로 판정

### 실제 호출 경로

- 프론트 `frontend/src/api/chatWithAgent.js`
  - 항상 `POST /api/chat`
- 백엔드 `backend/main.py:/api/chat`
  - `call_profiler(...)` 호출
- 백엔드 `backend/agents/profiler.py`
  - Azure OpenAI endpoint로 실제 POST

### fallback / mock 여부

- 네트워크/모델 호출 실패 시 `response.raise_for_status()` 또는 예외 발생
- `/api/chat` 라우트는 이를 잡아 `HTTPException(500)`로 반환
- 즉 `/api/chat`은 실패 시 200 mock 응답을 주는 구조가 아님

### parser fallback 여부

- raw JSON 파싱 실패 시 plain text fallback 객체를 만들 수는 있음
- 하지만 이 fallback도 LLM 응답 문자열을 바탕으로 만든 파싱 fallback이지, 외부 mock 파일이나 고정 profile JSON을 주입하는 구조는 아님

## `/api/recommend` 경로 판정

### 실제 호출 경로

- 프론트 `frontend/src/api/chatWithAgent.js`
  - 항상 `POST /api/recommend` with `{ profile }`
- 백엔드 `backend/main.py:/api/recommend`
  - `run_searcher(profile)`로 후보 생성
  - `_call_curator_model(...)`로 Azure OpenAI 호출

### fallback 여부

- 후보가 0건이면 빈 recommendations 반환
- LLM 실패 시:
  - 검색 후보 상위 3개를 기반으로 fallback payload 생성
  - `fallback_used=True`
- 따라서 `/api/recommend`는
  - 정상 시 실모델 호출
  - 실패 시 검색 기반 fallback
  - 즉 `혼합 상태`라고 보는 것이 정확함

## mock / 대체 경로 조사 결과

### 현재 주요 런타임 경로와 무관한 항목

- `frontend/src/hooks/useChat.js`
  - `useMock=true` 기본 mock 채팅 훅 존재
  - 하지만 현재 메인 추천 흐름은 `ChatGuide.jsx` + `chatWithAgent.js` 경로를 사용
- `frontend/src/api/analyzeInput.js`
  - 프론트에서 Azure OpenAI를 직접 호출하는 구형 경로
  - 현재 메인 경로에서 사용 흔적 없음

### 런타임 일부 fallback이 있는 항목

- `frontend/src/api/movieService.js`
  - 영화 상세 API 실패 시 하드코딩 fallback 존재
  - 추천 LLM 호출과는 무관
- `frontend/src/pages/Dashboard.jsx`
  - 신규 사용자 커뮤니티 섹션 fallback 카드 존재
  - 추천 LLM 호출과는 무관
- `backend/agents/searcher.py`
  - 검색 결과 0건 시 query 완화 / 전체 후보 fallback 존재
  - LLM mock은 아니고 검색 fallback

## `mood/energy` 점검 결론

실제 profiler 호출 결과:

- raw response 안의 `profileUpdates.mood = null`
- raw response 안의 `profileUpdates.energy = null`
- quickButtons의 `maps`에는 `mood`, `energy` 값이 들어 있음

따라서 현재 `"나른하고 편안해요 🌿"` 케이스는

- parser 누락 아님
- merge overwrite 아님
- profiler의 실제 모델 응답이 `profileUpdates`를 비워 두고 quickButtons 유도로 넘긴 케이스

즉 1차 원인은 profiler prompt/모델 응답 전략에 있음

## 최종 판정

- `/api/chat`: 실질적으로 `gpt-5-chat` 호출 중
- `/api/recommend`: 실질적으로 `gpt-5-chat` 호출 중
- 전체 상태: `정상 실호출 + 일부 fallback 혼합`
  - `/api/chat`: 실호출, 실패 시 500
  - `/api/recommend`: 실호출, 실패 시 검색 기반 fallback
