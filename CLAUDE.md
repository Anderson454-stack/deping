# Deping (디핑) — CLAUDE.md

> Cognitive-Driven Movie Recommendation System (C-DMRS)
> 이 문서는 프로젝트의 고정 규칙만 관리합니다.
> 진행 상태, 임시 액션, 평가 일정은 `TASKS.md`에서만 관리합니다.

---

## 아키텍처 원칙

- 프론트엔드와 백엔드는 분리 유지
- 프론트엔드는 `frontend/`, 백엔드는 `backend/` 기준으로 작업
- Agent 1 호출은 프론트 직접 호출이 아니라 백엔드 경유 방식 유지
- Agent 3 추천도 백엔드 API 경유 방식 유지
- Agent 1(`/api/chat`)과 Agent 3(`/api/recommend`)의 LLM 호출은 Azure OpenAI deployment 기준으로 유지
- 루트 `.env` 단일 파일만 사용하고 `frontend/.env`, `backend/.env`는 사용하지 않음
- ngrok 사용 시 `frontend` 터널만 사용
- profile 원본 계약은 숫자형 raw schema를 기준으로 유지
- searcher는 원본 profile을 직접 해석하지 않고 반드시 `backend/agents/profile_normalizer.py`를 거쳐 사용
- 명시적 장르 의도는 `profileUpdates.genres` canonical 배열로 유지하고, raw numeric profile 계약을 깨지 않는 선에서 병행 보존한다
- profile 배열 필드의 canonical 이름은 `avoidance`, 카드 선택 참조는 `refs.{actors,directors,movies}`
- labels 레이어는 raw 위에 병행 추가하며, 의미가 확정되지 않은 숫자값은 문자열로 강제 해석하지 않음
- profiler는 직접 추출 가능한 affective 값(`mood`, `energy`, 필요 시 `temperature`, `inner_need`)을 `profileUpdates`에 우선 반영해야 함
- quickButtons는 제안용이며 `profileUpdates`를 대체하지 않음
- searcher는 labels만이 아니라 raw affective 신호와 약한 신호(`-1`, `1`)도 query 구성에 활용할 수 있음
- 장르/회피 의도가 있으면 searcher query 조립 우선순위는 `명시 장르/회피 > priority > refs`를 유지
- 복합 장르와 회피 장르는 `backend/agents/profiler.py`의 deterministic post-process와 `backend/agents/searcher.py`의 `profile_to_search_params()` 단일 경로를 기준으로 처리

---

## 디자인 규칙

### No-Line Rule

- `border`, `border-*`, `ring-*`, `outline`로 장식 구분 금지
- 구역 구분은 배경색 차이로만 처리

### Asymmetry Rule

- 채팅 버블, 포스터 카드 등 주요 UI는 의도적 비대칭 radius 허용

### Cinematic Shadow Rule

- 그림자는 `var(--shadow-cinematic)` 또는 동일 계열 값만 사용

### Whitespace Rule

- 섹션 간 `py-12` 이상, 카드 내부 `p-6` 이상을 기본값으로 고려

### Color Token Rule

- 하드코딩 색상 금지
- 반드시 CSS 변수 사용

사용 가능한 주요 토큰:
- `--color-primary`
- `--color-surface`
- `--color-surface-raised`
- `--color-text-primary`
- `--shadow-cinematic`

---

## 코드 컨벤션

- 컴포넌트: PascalCase 파일명, `default export`
- 훅: camelCase, `use` 접두어 필수
- API 함수: camelCase
- 스타일: Tailwind 유틸리티 우선, 복잡한 값은 `style` prop + CSS 변수 사용
- 주석: 한국어 허용, 필요 시 영어 혼용 가능

금지사항:
- `border-*` 클래스로 구역 구분
- 하드코딩 컬러값 사용
- `console.log` 디버그 코드 커밋
- 완성된 컴포넌트 구조 임의 변경
- raw numeric profile을 문자형 schema로 전면 치환
- 의미 미확정 숫자값을 임의 문자열 label로 해석

---

## 주요 구현 패턴

- Agent 1: `POST /api/chat`
- Agent 3: `POST /api/recommend`
- ChatGuide의 기본 라우트는 `/chat`, 외부 공유/직접 진입 호환을 위해 `/chatguide` alias도 함께 유지
- 프론트에서는 `frontend/src/api/chatWithAgent.js`를 통해 호출
- `CardSelector` 타입은 `'movie' | 'director' | 'actor'`
- `CardSelector`는 타입별 단일 선택 화면을 유지하고, 영화/배우/감독을 한 화면에 혼합하지 않는다
- `CardSelector` 목록 순서는 타입별 데이터 안에서만 stable shuffle로 랜덤화하며, 같은 입력 데이터에서는 재렌더마다 순서가 바뀌지 않도록 유지한다
- `CardSelector`에서 카드를 선택하면 해당 카드의 `related` 항목 중 아직 노출되지 않은 카드 3~5개가 같은 타입 풀 안에서 선택 카드 바로 뒤에 추가되도록 유지한다
- `CardSelector`의 선택 상태는 붉은 강조 프레임/배지 수준으로 명확히 보여야 하며, 선택 여부가 사용자가 즉시 인지 가능해야 한다
- 모션 적용 시 `PageTransition`, `StaggerList`, `StaggerListItem` 패턴 우선 사용
- Journal 저장 상태는 `frontend/src/hooks/useRecommendationHistory.js` 단일 훅에서 관리
- Journal 저장 포맷은 `localStorage.deping_journal`의 날짜별 엔트리(`[{ date, movies[] }]`) 구조를 유지
- 추천 카드의 하트 저장/해제와 `/journal` 달력 뷰는 동일한 journal storage를 공유해야 함
- 추천 이력 원본은 `localStorage.deeping_rec_history`를 기준으로 유지하고, `ChatGuide`는 추천 3편 생성 직후 이 키를 즉시 갱신해야 한다
- Journal에 저장되는 movie 객체는 기존 구조를 유지하되 `tmdb_id`, `title`/`title_ko`, `poster_path`, `release_date`, `source`, `rating` 같은 상세 fallback 필드를 보존하는 방향으로 확장한다
- Dashboard `My Deeping`은 저장한 영화가 아니라 추천된 영화 기준으로 해석하며, `deeping_rec_history`를 1차 소스로 쓰고 비어 있을 때만 `deping_journal` fallback을 사용한다
- `Your Viewing DNA`는 추천 영화 공통 성향 요약 카드로 유지하고, 태그/설명문은 `frontend/src/utils/viewingDnaAnalyzer.js`의 rule-based 계산을 기준으로 만든다
- `Active Pulse`는 외부 평론 점수가 아니라 최근 추천 패턴의 응집도/선명도 내부 지표로 유지하고, 장르 집중도/감독 반복/분위기 일관성/다양성 역산/데이터 수 감산 구조를 기준으로 계산한다
- `MovieDetail`는 라우터 state, Journal 저장 데이터, 상세 API 응답을 함께 활용하는 fallback-first 방식으로 유지하고, 일부 필드 누락은 섹션 숨김으로 처리하며 fetch 실패만 전체 에러 상태로 본다
- `MovieDetail`의 비상영작 감상 링크는 `frontend/src/utils/ottLinks.js`의 고정 curated OTT 링크를 우선 사용하고, 고정 목록에 없는 경우에만 TMDB watch providers fallback을 사용한다
- `frontend/src/utils/ottLinks.js`의 고정 OTT 매핑 중 `토이 스토리 1/2/3`, `어벤져스`, `모아나`, `이웃집 토토로`, `쿵푸팬더`, `코코`, `업`, `니모를 찾아서` 항목은 보호 대상이며 임의 변경하지 않는다
- `Journal` 화면은 저장된 `poster_url`이 상대경로나 누락 상태여도 `poster_path` fallback으로 포스터를 복구해 표시해야 하며, 기존 localStorage 데이터도 읽는 시점에 정규화한다
- `Dashboard`와 `Journal`는 상세 페이지 왕복 시 목록/선택 상태와 스크롤 위치를 잃지 않도록 sessionStorage 기반 UI 상태 복원을 유지한다
- 박스오피스 상세 메타데이터는 가능하면 KOBIS `searchMovieInfo`의 감독/배우/장르/상영시간을 우선 사용하고, 줄거리와 추가 시청 정보는 TMDB fallback으로 보강한다
- 추천 결과와 Journal fallback movie 객체는 `actors`/`cast`, `director`, `overview`, `genres`, `runtime`, `poster_path`를 가능한 한 함께 보존해 `MovieDetail` 진입 시 추가 fetch 전에도 기본 정보를 표시할 수 있어야 한다
- profiler 응답 파싱은 `backend/agents/profiler.py`의 sanitize/parse/post-process 경로를 기준으로 유지
- profiler의 명시 장르 추출은 canonical 11개(`action`, `thriller`, `horror`, `romance`, `comedy`, `drama`, `sf`, `crime`, `mystery`, `fantasy`, `animation`) 기준으로 유지하고, 임시 문자열 장르 필드를 추가하지 않는다
- profiler가 생성한 `botMessage`와 `quickButtons.label`은 사용자 노출 전 한국어 UI 문구 기준으로 정규화하며, `テンポ가 빠른` 같은 비한국어 혼합 표현은 `전개가 빠른`으로 교정한다
- 검색 쿼리 생성은 `backend/agents/searcher.py`의 `profile_to_search_params()` 단일 경로를 기준으로 유지

---

## 테스트 및 실행 명령

### 로컬 개발 서버

```bash
# 터미널 1
cd D:\deping\backend
uvicorn main:app --host 127.0.0.1 --port 8000

# 터미널 2
cd D:\deping\frontend
npm run dev

# 터미널 3
cd D:\deping
.\ngrok.exe start frontend --config "C:\Users\원준\AppData\Local\ngrok\ngrok.yml"
```

### 테스트

```bash
cd D:\deping
python -m unittest discover -s backend/tests -v
```

### 배포/실행 주의

- `frontend` 터널만 실행
- 무료 ngrok 플랜에서 다중 터널 동시 실행 금지
- `VITE_API_BASE_URL`은 ngrok 사용 시에도 기본 로컬 값을 유지
- 외부 접속에서는 상대경로 + Vite proxy 흐름을 깨지 않도록 유지

---

## 환경 변수 규칙

루트 경로 `D:/deping/.env`만 사용

주요 변수:
- `TMDB_API_KEY`
- `KOBIS_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `VITE_API_BASE_URL`
- `VITE_APP_TITLE`

로드 규칙:
- 백엔드: 루트 `.env` 직접 로드
- 프론트: `vite.config.js`의 `envDir`로 루트 `.env` 사용

---

## 배포 규칙

- `render.yaml` 기준 배포 설정 유지
- 프론트엔드는 Vite 정적 빌드
- 백엔드는 `uvicorn main:app --host 0.0.0.0 --port $PORT` 기준 유지
