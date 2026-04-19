# Deping (디핑) — CLAUDE.md

> Cognitive-Driven Movie Recommendation System (C-DMRS)
> K-Digital Training 팀 프로젝트 | 최종 업데이트: 2026-04-17 (Agent3 안정화 / Loading UX 개선)

---

## 프로젝트 개요

AI와 대화하면서 취향과 오늘의 기분을 알려주면, **나에게 딱 맞는 영화 3편**을 골라주는 서비스.
기존 추천(장르 기반 상관관계)에 **인지적 감상 스타일**(복잡도 내성, 전개 인내도 등)을 더해 더 깊은 개인화 추천을 제공한다.

---

## 레포지토리 구조

```
D:/deping/
├── backend/
│   ├── main.py              # FastAPI 서버 (포트 8000)
│   ├── requirements.txt
│   └── agents/
│       ├── profiler.py      # Agent 1 — Azure OpenAI GPT-5 호출, type 필드 포함
│       └── searcher.py      # Agent 2 — Azure AI Search 후보 15편 검색
├── frontend/
│   └── src/
│       ├── App.jsx           # 라우터 (/, /chat, /movie/:id, /discover, /journal)
│       ├── pages/
│       │   ├── Dashboard.jsx       # 메인 대시보드
│       │   ├── ChatGuide.jsx       # AI 채팅 추천 페이지
│       │   ├── MovieDetail.jsx     # 영화 상세
│       │   └── ComingSoon.jsx      # /discover, /journal (미구현)
│       ├── components/
│       │   ├── chat/
│       │   │   ├── CardSelector.jsx      # 온보딩 카드 선택 UI (영화/배우/감독)
│       │   │   ├── ChatBubble.jsx
│       │   │   ├── ChatInput.jsx
│       │   │   ├── DNACalibration.jsx
│       │   │   ├── MovieCard.jsx
│       │   │   ├── QuickButtons.jsx
│       │   │   ├── ReasoningLog.jsx
│       │   │   └── RecommendationCard.jsx
│       │   ├── dashboard/
│       │   │   ├── BoxOfficeCard.jsx
│       │   │   ├── BoxOfficeCarousel.jsx
│       │   │   ├── RecentMovieCard.jsx
│       │   │   └── ViewingDNA.jsx
│       │   │   # ※ GlobalCinemaFeed, SessionHistory, StaggeredStack 삭제됨
│       │   ├── layout/             # TopNavBar, MobileDrawer, MobileBottomNav, SideNavBar
│       │   └── motion/             # PageTransition, StaggerList, StaggerListItem
│       ├── api/
│       │   ├── analyzeInput.js     # 입력 분석 유틸
│       │   ├── chatService.js      # FastAPI 백엔드 채팅 엔드포인트
│       │   ├── chatWithAgent.js    # Agent 1(POST /api/chat) + Agent 3(POST /api/recommend)
│       │   ├── client.js           # axios 기본 클라이언트
│       │   └── movieService.js     # 영화 데이터 API (ngrok 외부 도메인 자동 감지)
│       ├── hooks/
│       │   ├── useCardData.js              # 온보딩 카드 TMDB 데이터 훅
│       │   ├── useChat.js
│       │   └── useRecommendationHistory.js
│       ├── utils/
│       │   └── mergeProfile.js
│       └── data/
│           ├── actors.json          # 배우 카드 선택 데이터 (로컬 JSON)
│           ├── directors.json       # 감독 카드 선택 데이터 (로컬 JSON)
│           ├── movies.json          # 영화 카드 선택 데이터 (로컬 JSON)
│           ├── cardSelectorData.js
│           ├── conversationFlow.js
│           └── demoScript.js
├── notebooks/
│   ├── 01_tmdb_collect.ipynb
│   ├── 02_add_kobis_audience.ipynb
│   └── 03_build_index.ipynb        # Azure AI Search 인덱스 구축 (미완)
├── scripts/
│   ├── extract_card_data.py        # 카드 선택 JSON 추출 스크립트
│   └── enrich_person_cards.py      # 배우/감독 JSON에 TMDB person id + 인물 사진 보강
├── ngrok.exe / ngrok.yml           # 로컬 → 외부 터널
├── render.yaml                     # 배포 설정 (Render.com)
└── 프로젝트_서버실행_순서
```

---

## 기술 스택

### 프론트엔드

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| React | 19.2.4 | UI 프레임워크 |
| Vite | 8.0.4 | 빌드 도구 + 개발 서버 (포트 5173) |
| React Router DOM | 7.14.0 | SPA 라우팅 (`/`, `/chat`, `/movie/:id`, `/discover`, `/journal`) |
| Tailwind CSS | 4.2.2 | 유틸리티 CSS (`@tailwindcss/vite` 플러그인 방식) |
| Framer Motion | 12.38.0 | 페이지 전환·스태거 애니메이션 |
| Axios | 1.15.0 | HTTP 클라이언트 (`src/api/client.js`) |
| Embla Carousel | 8.6.0 | 박스오피스 캐러셀 |

> Vite proxy `/api` → `http://127.0.0.1:8000` 설정으로 상대 URL 사용
> `movieService.js`는 ngrok 등 외부 도메인 접속 시 `VITE_API_BASE_URL` 대신 상대경로로 자동 전환

### 백엔드

| 라이브러리 | 용도 |
|-----------|------|
| FastAPI | REST API 프레임워크 (포트 8000) |
| uvicorn | ASGI 서버 |
| openai (Python SDK) | Azure AI Foundry 방식으로 GPT-5 호출 (`base_url` 교체 방식) |
| httpx | 비동기 외부 API 호출 (TMDB, KOBIS) |
| python-dotenv | 루트 `.env` 로드 |
| pydantic | 요청 모델 (`ChatRequest`, `RecommendRequest`) |

### AI / 외부 서비스

| 영역 | 기술 |
|------|------|
| LLM | Azure OpenAI — `gpt-5-chat` 배포 (Agent 1 프로파일러, Agent 3 큐레이터) |
| 임베딩 | `text-embedding-3-small` 1536차원 (미구현, notebooks/03 대기) |
| 검색 | Azure AI Search 벡터+시맨틱 하이브리드 (미구현, Agent 2 대기) |
| 영화 데이터 | TMDB API + KOBIS 박스오피스 API |
| 박스오피스 캐시 | 서버 메모리 6h TTL (KOBIS 실패 시 TMDB now_playing 폴백) |
| 터널 | ngrok (로컬 → 외부 HTTPS) |
| 배포 | Render.com (`render.yaml`) |

---

## 3-에이전트 파이프라인 (설계)

```
사용자 접속
    │
    ▼
Agent 1 — 프로파일러 (backend/agents/profiler.py, GPT-5)
    카드 선택형 온보딩(영화→배우→감독) + 대화형(퀵버튼) 하이브리드
    → 프로필 JSON 출력 (mood, genres, cognitive 스타일, isComplete 등)
    │
    ▼
Agent 2 — 서처 (backend/agents/searcher.py, Azure AI Search)
    프로필 → 검색 쿼리 변환
    → Azure AI Search 키워드 검색
    → 후보 15편
    │
    ▼
Agent 3 — 큐레이터 (main.py, POST /api/recommend, GPT-5)
    후보 15편 안에서 최종 3편 + 개인화 추천 이유 생성
    │
    ▼
영화 추천 카드 UI (포스터 + 추천 이유 + 예고편 링크)
```

**현재 구현 상태:**
- Agent 1 (`POST /api/chat`) — 백엔드(`agents/profiler.py`)에서 GPT-5 호출. 프론트 `chatWithAgent.js`는 백엔드만 호출 (Azure OpenAI 직접 호출 제거)
- Agent 2 (`agents/searcher.py`) — 프로필을 검색 쿼리로 변환해 Azure AI Search에서 후보 15편 반환
- Agent 3 (`POST /api/recommend`) — Agent 2 후보를 컨텍스트로 받아 GPT-5가 후보 목록 안에서만 최종 3편 추천

---

## 현재 구현 현황 (2026-04-17 기준)

### 완료

| 항목 | 비고 |
|------|------|
| React 앱 기본 구조 (라우터, 레이아웃, 페이지) | |
| Dashboard (박스오피스, 오늘의 추천, ViewingDNA, RecentMovieCard) | GlobalCinemaFeed·SessionHistory 삭제됨 |
| ChatGuide (AI 대화 채팅 UI, 퀵버튼, 추천 카드) | |
| OnboardingModal — CardSelector 3단계 흐름 (영화→배우→감독) | |
| CardSelector.jsx — 관련 항목 동적 확장, 선택 애니메이션 | |
| Agent 1 (프로파일러) — 백엔드 이전 완료, `type` 필드 포함 | 프론트 직접 호출 제거 |
| Agent 3 (큐레이터) — `POST /api/recommend` | GPT-5 단독, Search 없이 동작 |
| DNACalibration 슬라이더 컴포넌트 | |
| ReasoningLog (CoT 추론 과정 표시) | |
| FastAPI 백엔드 기본 서버 | |
| `/api/boxoffice/daily` — KOBIS 박스오피스 (6h TTL, 더미 폴백) | |
| `/api/movies/featured` — 랜덤 추천 영화 (15분 갱신) | |
| `/api/movies/community` — ViewingDNA 키워드 기반 영화 | |
| `/api/movies/{tmdb_id}` — 영화 단건 조회 | |
| `/api/search` — Azure AI Search 기본 검색 API | `movies-index`, `{query, top, filter, count, items}` 응답 |
| `/api/search/advanced` — 장르/연도 필터 지원 검색 API | `query`, `top`, `genre`, `year_from`, `year_to` |
| Chrome PNA(Private Network Access) preflight 미들웨어 | |
| ngrok 터널 설정, movieService.js 외부 도메인 자동 감지 | |
| TMDB 데이터 수집 (notebooks/01) + KOBIS 관객수 보강 (notebooks/02) | |
| Azure AI Search 인덱스 연동 | `movies-index` 연결, 233개 문서 검색 확인 |
| Render.com 배포 설정 (render.yaml) | |
| 페이지 전환 애니메이션 (Framer Motion) | |
| 모바일 레이아웃 (TopNavBar, MobileDrawer) | |
| BoxOfficeCard — cinematic card, aspect-[2/3] 포스터, ruby-gradient 순위 배지 | |

### 완료 (2026-04-17 추가)

| 항목 | 비고 |
|------|------|
| Agent 3 `overview_ko` 필드 — 한국어 줄거리 요약 2~3문장 | `CURATOR_PROMPT` + `RecommendationCard.jsx` 표시 |
| CardSelector 감독·배우 인물 사진 — TMDB person API 연동 | `useCardData` 훅 → `/api/directors/cards`, `/api/actors/cards` |
| 배우/감독 카드 로컬 JSON 실데이터화 | `actors.json`, `directors.json`에 `tmdb_person_id` 추가 + 영화 포스터 → 실제 인물 프로필 사진으로 교체 |
| 인물 사진 보강 스크립트 추가 | `scripts/enrich_person_cards.py` — TMDB credits 기반 person id / profile_path 매칭 |
| My Deeping (ViewingDNA) empty state — 이력 없을 때 각 카드 내부에 안내 메시지 | `hasHistory` 분기, `CardEmptyState` 컴포넌트 (ViewingDNA.jsx 내장) |
| `useRecommendationHistory` — `hasHistory` 반환값 추가 | `history.length > 0` boolean |
| Dashboard 월별 테마 영화 섹션 | `/api/movies/theme`, `movieService.getMonthlyTheme()`, 5월 어린이날 테마 카드/목록 표시 |
| Agent 1 응답 JSON 버블 출력 방지 | `chatWithAgent.js` 응답 정규화로 중첩 JSON 문자열 재파싱 |
| CardSelector 배우/감독 데이터 기준 정리 | 로컬 JSON을 기준 데이터로 유지하고 TMDB API는 사진 보강용으로만 사용 |
| Agent 2 서처 구현 | `backend/agents/searcher.py` — profile → query/filter 변환, 후보 15편 검색, fallback 포함 |
| `/api/recommend` Agent 2 → Agent 3 통합 | Search 후보를 GPT-5 큐레이터 컨텍스트로 전달, 후보 목록 안에서만 3편 선택 |
| 추천 응답 보강 | `reasoning_log`, `cognitive_match` 지원 + 후보 데이터 기반 `poster_url`, `year`, `rating_imdb` 병합 |
| ngrok 설정 확정 — `frontend` 터널만 사용 | `ngrok.yml` backend 터널 주석 처리 |

### 완료 (2026-04-17 추가 업데이트)

| 항목 | 비고 |
|------|------|
| Agent 3 출력 스키마 강제 | `selected_ids` 기반, 서버 merge 방식 |
| Agent 3 fallback 로직 | Case A/B/C/D 케이스별 처리 |
| 실 GPT-5 모델 검증 | `/api/recommend` 실호출 기준 후보 이탈 없음 확인 |
| 응답 길이 제한 | `reason` 80자, `overview_ko` 150자, `cognitive_match` 100자 |
| null-safe 응답 | 모든 필드 기본값 처리 |
| Agent 2 0건 fallback 보강 | 필터 제거 → `*` 전체 후보 fallback |
| Agent 3 실호출 방식 안정화 | SDK 충돌 회피를 위해 direct HTTP 호출 사용 |
| Agent 3 응답 메타 로깅 | `llm_latency_ms`, `token_usage`, `fallback_used` 반환 |
| Agent 3 completion 제한 | `max_completion_tokens=350` 적용으로 응답 시간/비용 절감 시도 |
| ChatGuide 로딩 UX 개선 | 0초/3초/6초 단계 메시지 순차 노출 |

- 현재 Agent 2는 기본 검색 기반이며, cognitive metadata 필드가 인덱스에 없으므로 complexity/patience/visual_style 기반의 직접 필터링은 아직 비활성 상태
- 실측 기준 평균 응답 시간은 약 10초대이며, 케이스별 편차가 남아 있어 추가 최적화 여지 있음

### 실모델 검증 요약

- 검증 대상: 5개 프로필 케이스 (`SF`, `로맨스/코미디`, `액션/스릴러`, `느린 호흡 드라마`, `빈 프로필`)
- 공통 결과: 최종 추천 3편 모두 Agent 2 후보 15편 안에서만 선택됨
- 안정성: `poster_url`, `year`, `rating_imdb`, `reasoning_log`는 서버 merge 기준으로 null-safe 유지
- 속도: 일부 케이스는 10초 이내, 일부는 10초 초과로 아직 최적화 진행 중
- 토큰: 응답 메타에 `prompt_tokens`, `completion_tokens`, `total_tokens` 기록


### 현재 movies-index 실제 필드

`id`, `title_ko`, `overview`, `genres`, `director`, `cast`, `year`, `vote_average`, `audience`, `poster_url`

### 미완료 / 진행 중

| 항목 | 비고 |
|------|------|
| Agent 2 고도화 | semantic / hybrid / vector search 미적용, 현재는 키워드 기반 검색 |
| Azure AI Search 인덱스 고도화 (notebooks/03) | 임베딩 업로드 및 인지 필드 확장 필요 |
| MovieDetail 페이지 데이터 연동 | UI 있음, `useParams` → API fetch 미구현 |
| /discover, /journal 페이지 | ComingSoon 플레이스홀더 |
| ViewingDNA 동적 데이터 연동 | 현재 하드코딩된 태그 |
| StreamingBadges 실 데이터 | OTT 정보 API 연동 필요 |

### 다음 확장 과제

- 인지 필드 포함 인덱스 재구성 (`plot_complexity_level`, `pacing`, `visual_level`)
- Semantic search / Hybrid search 활성화
- Vector search 활성화 (`overview_vector` 임베딩 업로드)

---

## 디자인 시스템 규칙 (절대 준수)

### No-Line Rule
```
절대 금지: border, border-*, ring-*, outline (장식 목적)
구역 구분 방법: 배경색(surface 계열)의 미세한 차이만 사용
```
```jsx
// ❌ 금지
<div className="border border-white/10 rounded-xl">

// ✅ 올바른 방법
<div className="rounded-xl" style={{ background: 'var(--color-surface-raised)' }}>
```

### Asymmetry Rule
채팅 버블, 포스터 카드 배치 등에 의도적 비대칭 적용:
```jsx
borderRadius: '20px 4px 20px 20px'  // 사용자 버블
borderRadius: '4px 20px 20px 20px'  // AI 버블
```

### Cinematic Shadow Rule
```css
box-shadow: 0 12px 32px -4px rgba(142, 0, 4, 0.06);
/* 또는 var(--shadow-cinematic) */
```

### Whitespace Rule
에디토리얼 잡지 스타일의 넉넉한 여백: 섹션 간 `py-12` 이상, 카드 내부 `p-6` 이상

### Color Token 사용
하드코딩 금지. 반드시 CSS 변수 사용:
```jsx
// ❌ 금지
style={{ color: '#f0f0f0', background: '#8e0004' }}

// ✅ 올바른 방법
style={{ color: 'var(--color-text-primary)', background: 'var(--color-primary)' }}
```

**Available tokens** (`index.css` @theme):
- `--color-primary`: #8e0004
- `--color-surface`: 최하위 배경
- `--color-surface-raised`: 카드/버블 배경
- `--color-text-primary`: 주요 텍스트
- `--shadow-cinematic`: 시네마틱 그림자

---

## 코드 컨벤션

```
컴포넌트: PascalCase 파일명, default export
훅: camelCase, use 접두어 필수 (useChat, useCardData...)
API 함수: camelCase (sendMessage, getRecommendations...)
CSS: Tailwind 유틸리티 우선, 복잡한 값은 style prop + CSS 변수
주석: 한국어 허용, 영어 혼용 가능
```

**Do Not:**
- `border-*` 클래스로 구역 구분 금지
- 하드코딩 컬러값 사용 금지
- `console.log` 디버그 코드 커밋 금지
- 완성된 컴포넌트 구조 임의 변경 금지

---

## 주요 패턴

### chatWithAgent.js API 호출
```js
// Agent 1 — POST /api/chat (백엔드 경유, Azure OpenAI 직접 호출 X)
// Agent 3 — POST /api/recommend (백엔드 경유)
import { callAgent1, fetchRecommendations } from '../api/chatWithAgent';
```

### CardSelector 사용
```jsx
<CardSelector type="movie" onComplete={(selected) => handlePhaseComplete(selected)} />
// type: 'movie' | 'director' | 'actor'
// 선택 시 관련 항목 동적 확장 (related 필드 기반, 최대 70개)
```

### PageTransition / StaggerList
```jsx
import { PageTransition, StaggerList, StaggerListItem } from '../components/motion/PageTransition';

export default function MyPage() {
  return (
    <PageTransition>
      <StaggerList>
        {items.map(item => <StaggerListItem key={item.id}><Card /></StaggerListItem>)}
      </StaggerList>
    </PageTransition>
  );
}
```

---

## 로컬 개발 서버 실행 순서

```bash
# 터미널 1 — FastAPI 백엔드
cd D:\deping\backend
uvicorn main:app --host 127.0.0.1 --port 8000

# 터미널 2 — Vite 프론트엔드
cd D:\deping\frontend
npm run dev

# 터미널 3 — ngrok 터널 (외부 공유 시)
cd D:\deping
.\ngrok.exe start frontend --config "C:\Users\원준\AppData\Local\ngrok\ngrok.yml"
```

> **ngrok 주의사항 (무료 플랜)**
> - `frontend` 터널만 실행. `backend` 터널은 주석 처리됨 — 절대 같이 열지 말 것.
> - 무료 플랜은 동시 터널 1개만 지원. 두 터널을 같이 열면 같은 URL에 두 서버가 충돌해 API 404 발생.
> - `VITE_API_BASE_URL`은 변경 불필요. `baseUrl.js`가 외부 도메인 감지 시 자동으로 상대경로(`''`)를 반환하고, Vite proxy(`/api` → `127.0.0.1:8000`)가 백엔드로 중계한다.
> - ngrok URL 흐름: `브라우저 /api/...` → `ngrok → Vite(5173)` → `proxy → FastAPI(8000)`

---

## 환경 변수 — 루트 통합 (D:/deping/.env)

`.env`는 루트 단일 파일. `frontend/.env`, `backend/.env` 사용하지 않음.

| 변수 | 용도 |
|------|------|
| `TMDB_API_KEY` | TMDB API |
| `KOBIS_API_KEY` | KOBIS 박스오피스 API |
| `AZURE_OPENAI_ENDPOINT` | 백엔드용 Azure OpenAI 엔드포인트 |
| `AZURE_OPENAI_API_KEY` | 백엔드용 API 키 |
| `AZURE_OPENAI_DEPLOYMENT` | 배포 이름 (현재: `gpt-5-chat`) |
| `VITE_AZURE_OPENAI_ENDPOINT` | 프론트(Vite)용 엔드포인트 (현재 미사용) |
| `VITE_AZURE_OPENAI_API_KEY` | 프론트용 API 키 (현재 미사용) |
| `VITE_AZURE_OPENAI_DEPLOYMENT` | 프론트용 배포 이름 (현재 미사용) |
| `VITE_API_BASE_URL` | FastAPI 백엔드 URL (기본: `http://localhost:8000`) |
| `VITE_APP_TITLE` | 앱 제목 |

**로드 방식:**
- 백엔드: `load_dotenv(Path(__file__).resolve().parent.parent / ".env")`
- 프론트: `vite.config.js` — `envDir: path.resolve(__dirname, "..")` 루트 `.env` 자동 로드

**ngrok 사용 시:** `VITE_API_BASE_URL` **변경 불필요**. `baseUrl.js`의 `resolveApiBaseUrl()`이 외부 도메인 감지(`isLocalTarget && isExternalPage`) 시 자동으로 `''`(상대경로)를 반환한다. `VITE_API_BASE_URL=http://localhost:8000`으로 유지해도 ngrok 환경에서 정상 동작.

---

## 프로필 JSON 스키마 (Agent 1 출력)

```json
{
  "mood": "relaxed",
  "energy": "low",
  "genres": ["sci-fi"],
  "tone": "light",
  "priority": ["visuals"],
  "visual_style": "cinematic",
  "temperature": 0.3,
  "ending_style": "open",
  "inner_need": "escape",
  "complexity": "low",
  "patience": "medium",
  "reference": ["Interstellar"],
  "directors": ["Christopher Nolan"],
  "actors": ["Matthew McConaughey"],
  "isComplete": false
}
```

---

## 데이터 파이프라인 현황

| 단계 | 스크립트 | 상태 |
|------|----------|------|
| TMDB 메타데이터 수집 | notebooks/01_tmdb_collect.ipynb | 완료 |
| KOBIS 관객수 보강 | notebooks/02_add_kobis_audience.ipynb | 완료 |
| 카드 선택 JSON 추출 | scripts/extract_card_data.py | 완료 |
| Azure AI Search 인덱스 구축 | notebooks/03_build_index.ipynb | 미완 |

---

## 배포

- `render.yaml` 설정 완료
  - `deping-frontend`: Vite 정적 빌드 (`dist/`)
  - `deping-backend`: FastAPI (`uvicorn main:app --host 0.0.0.0 --port $PORT`)
