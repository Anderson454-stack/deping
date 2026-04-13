# TASK.md — Deeping 프론트엔드 작업 지시서

> **실행 에이전트**: Gemini CLI
> **사용법**: `gemini -f CLAUDE.md -f TASK.md "TASK-E 진행해줘"`
> **프로젝트 루트**: `D:\deping\frontend`
> **전제 조건**: CLAUDE.md의 디자인 규칙(No-Line / Asymmetry / CSS Variable) 반드시 준수
> **최종 업데이트**: 2026.04.13
> **의사결정 근거**: Gemini + Grok + Claude 3종 에이전트 의견 종합

---

## 완료된 태스크 (절대 수정 금지)

```
[x] TASK-A: PageTransition — Dashboard, MovieDetail, StaggeredStack 적용
[x] TASK-B: DNACalibration ↔ useChat(dnaProfile) 연결
[x] TASK-C: .env.local 생성 (VITE_API_BASE_URL=http://localhost:8000)
[x] TASK-D: RecommendationCard 클릭 → /movie/:id 라우팅
```

---

## 우선순위 결정 근거

```
★★★★★ 즉시   TASK-E: FastAPI 실 연동      → 모든 후속 태스크의 전제 조건
★★★★★ 즉시   TASK-F: 추천 히스토리        → Agent 1 대화 품질 직결 + 재방문 동기
★★★★☆ 다음   TASK-G: OTT + 극장 연동      → 추천의 "마지막 1미터" 해결
★★★☆☆ 그다음  TASK-H: 박스오피스           → Dashboard 보조 섹션 (차별화 아닌 보완)
── 보류 ──   뉴스 피드 / 유사 사용자 / 소셜 공유  → 발표에서 "향후 계획"으로 언급
```

---

## TASK-E: FastAPI 실 연동 기반 구축

**상태**: 🔴 미완료
**우선순위**: ★★★★★
**난이도**: 보통
**예상 시간**: 30분

### 목적

이후 모든 태스크가 FastAPI 응답에 의존한다.
Mock 모드와 실 API 모드를 플래그 하나로 전환할 수 있어야 한다.

### 작업 1 — api/chatService.js 엔드포인트 완성

아래 4개 함수가 실제 FastAPI 경로와 매핑되도록 확인 및 수정:

```js
sendMessage        → POST /api/chat
getRecommendations → POST /api/recommend
getMovieDetail     → GET  /api/movies/{id}         // 신규
getNowPlaying      → GET  /api/movies/now-playing   // 신규
```

### 작업 2 — 에러 핸들링

FastAPI 서버가 꺼져 있을 때 앱이 crash되지 않아야 한다.
`useChat.js`의 catch 블록에서 채팅창에 assistant 버블로 표시:

```
"서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
```

메시지 객체에 `isError: true` 플래그 추가. 스타일은 기존 assistant 버블과 동일.

### 작업 3 — Mock 전환 플래그 정리

`ChatGuide.jsx`에서 한 줄 변경으로 전환 가능하게 유지:

```jsx
// Mock 모드 (개발 중)
const { ... } = useChat({ useMock: true, dnaProfile });

// 실 API 모드 (FastAPI 준비 완료 시)
const { ... } = useChat({ useMock: false, dnaProfile });
```

### 완료 검증

- [ ] FastAPI ON → 메시지 전송 시 실제 응답 수신
- [ ] FastAPI OFF → 에러 메시지 채팅창 표시, 앱 crash 없음
- [ ] `useMock: true` 복원 시 Mock 모드 정상 동작

---

## TASK-F: 추천 히스토리 (재방문 시 최근 3편 + Agent 컨텍스트 주입)

**상태**: 🔴 미완료
**우선순위**: ★★★★★
**난이도**: 낮음
**예상 시간**: 40분
**의존**: 독립적으로 진행 가능

### 목적

단순한 "지난 추천 보기"가 아니다.
히스토리를 Agent 1 프로파일러의 대화 컨텍스트로 주입하면
"지난번에 그래비티를 추천받으셨는데, 보셨나요?" 같은 대화가 가능해진다.
이것이 Deeping의 대화형 차별점과 직접 연결되는 핵심 기능이다.

### 작업 1 — hooks/useRecommendationHistory.js 신규 생성

```js
// src/hooks/useRecommendationHistory.js
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'deeping_rec_history';
const MAX_STORED = 10;    // 저장 최대 편수
const DISPLAY_COUNT = 3;  // 화면 표시 편수

export function useRecommendationHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      setHistory([]);
    }
  }, []);

  const saveRecommendations = (movies) => {
    const timestamp = new Date().toISOString();
    const newEntries = movies.map((m) => ({ ...m, savedAt: timestamp }));
    setHistory((prev) => {
      const updated = [...newEntries, ...prev].slice(0, MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Agent 1에 주입할 컨텍스트 문자열
  // FastAPI /api/chat 요청의 system context로 사용
  const getContextForAgent = () => {
    if (history.length === 0) return null;
    const recent = history.slice(0, DISPLAY_COUNT);
    const titles = recent.map((m) => m.title_ko || m.title).join(', ');
    return `사용자가 이전에 추천받은 영화: ${titles}. 대화 시 자연스럽게 참고하세요.`;
  };

  return {
    history,
    recentHistory: history.slice(0, DISPLAY_COUNT),
    saveRecommendations,
    getContextForAgent,
    clearHistory: () => {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    },
  };
}
```

### 작업 2 — Dashboard.jsx에 "지난번 추천" 섹션 추가

위치: `SessionHistory` 컴포넌트 바로 위.
히스토리가 없으면 섹션 자체를 렌더링하지 않는다.

```jsx
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';

const { recentHistory } = useRecommendationHistory();

{recentHistory.length > 0 && (
  <section style={{ padding: '2rem 0' }}>
    <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
      지난번 추천
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      {recentHistory.map((movie) => (
        <RecentMovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  </section>
)}
```

`RecentMovieCard` 컴포넌트 (신규):
- 포스터 이미지 + 제목 + 추천일 (몇 일 전)
- 클릭 시 `/movie/:id` 이동
- border 금지, `var(--color-surface-raised)` 배경
- `box-shadow: var(--shadow-cinematic)` 적용

### 작업 3 — ChatGuide.jsx에 히스토리 저장 + Agent 컨텍스트 연결

```jsx
import { useRecommendationHistory } from '../hooks/useRecommendationHistory';

const { saveRecommendations, getContextForAgent } = useRecommendationHistory();

// Agent 3 추천 결과 수신 시 자동 저장
useEffect(() => {
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === 'assistant' && lastMsg?.recommendations?.length > 0) {
    saveRecommendations(lastMsg.recommendations);
  }
}, [messages]);

// sendMessage 호출 시 히스토리 컨텍스트 함께 전달
const handleSend = (text) => {
  const agentContext = getContextForAgent(); // null이면 무시
  sendMessage(text, agentContext);
};
```

`useChat.js`의 `sendMessage` 함수 시그니처에 `context` 파라미터 추가:
실 API 모드 시 `/api/chat` 요청 body에 `agent_context` 필드로 포함.

### 완료 검증

- [ ] 첫 방문: Dashboard "지난번 추천" 섹션 미표시
- [ ] 추천 완료 후 재방문: 최근 3편 카드 표시
- [ ] 카드 클릭 시 MovieDetail 정상 이동
- [ ] DevTools → Application → localStorage → `deeping_rec_history` 데이터 확인
- [ ] 10편 초과 저장 시 오래된 항목 자동 삭제 확인

---

## TASK-G: OTT 스트리밍 정보 + 극장 딥링크

**상태**: 🔴 미완료
**우선순위**: ★★★★☆
**난이도**: 낮음
**예상 시간**: 30분
**의존**: TASK-E 완료 후

### 목적

추천받은 영화를 "어디서 볼 수 있는지" 한 화면에서 해결한다.
TMDB Watch Providers(KR) 사용 — JustWatch보다 안정적이고 무료.
현재 극장 상영 중이면 CGV / 롯데시네마 / 메가박스 검색 딥링크 제공.

### 작업 1 — api/movieService.js 신규 생성

```js
// src/api/movieService.js
import apiClient from './client';

export const movieService = {
  getMovieDetail:  (id)     => apiClient.get(`/api/movies/${id}`),
  getStreamingInfo:(tmdbId) => apiClient.get(`/api/movies/${tmdbId}/streaming`),
  getBoxOffice:    ()       => apiClient.get('/api/movies/boxoffice'),
};
```

### 작업 2 — components/movie/StreamingBadges.jsx 신규 생성

```jsx
// 극장 딥링크 URL 패턴
const THEATER_LINKS = {
  cgv:   (t) => `https://www.cgv.co.kr/search/?query=${encodeURIComponent(t)}`,
  lotte: (t) => `https://www.lottecinema.co.kr/NLCHS/Movie/MovieList?searchText=${encodeURIComponent(t)}`,
  mega:  (t) => `https://www.megabox.co.kr/movie?searchText=${encodeURIComponent(t)}`,
};
```

배지 디자인 규칙:
- 각 OTT: 브랜드 컬러 배경 + 흰 텍스트 (border 금지)
- 극장 링크: "현재 상영 중" 텍스트 + CGV / 롯데 / 메가 버튼 (클릭 시 새 탭)
- 정보 없음: `var(--color-text-tertiary)` 색상의 "현재 제공 서비스 없음" 텍스트
- 로딩 중: "확인 중..." 텍스트 (스켈레톤 없이 단순하게)

### 작업 3 — MovieDetail.jsx에 StreamingBadges 삽입

포스터 아래, 제목 바로 위 또는 아래의 자연스러운 위치.
기존 MovieDetail 레이아웃 변경 최소화.

### 완료 검증

- [ ] MovieDetail에 OTT 배지 표시 (Netflix, Watcha, Wavve 등)
- [ ] 극장 상영 중 영화: 3개 극장 링크 버튼 표시, 새 탭으로 이동
- [ ] 스트리밍 정보 없는 영화: "현재 제공 서비스 없음" 표시
- [ ] API 오류 시 섹션 숨김 (에러 UI 노출 금지)

---

## TASK-H: 박스오피스 (Dashboard 보조 섹션)

**상태**: 🔴 미완료
**우선순위**: ★★★☆☆
**난이도**: 보통
**예상 시간**: 45분
**의존**: TASK-E 완료 후

### 주의사항 (중요)

Deeping의 핵심은 "오늘 기분에 맞는 영화"이다.
박스오피스는 기존 앱들이 다 하는 기능으로, 차별화가 아닌 보완 요소다.
시각적 비중을 낮게 유지하고, 메인 UX(챗봇)를 절대 침범하지 않는다.

### 작업 1 — movieService.js 함수 확인

TASK-G에서 `getBoxOffice` 함수가 이미 추가됨. 별도 작업 불필요.

### 작업 2 — Dashboard.jsx 최하단에 박스오피스 섹션 추가

위치: 페이지 최하단 (모든 기존 섹션 아래).
TOP 5만 표시.

```jsx
// 섹션 제목: "지금 극장에서" — 작은 폰트, 보조적 위치감
// 카드: 순위 뱃지(숫자 원형) + 포스터 썸네일 + 제목
// 클릭 시 /movie/:id 이동
// KOBIS 로드 실패 시 섹션 자체 숨김
```

배지 스타일:
- 순위 원형 배지: `var(--color-primary)` 배경, 흰 텍스트, 24px 원
- 카드 크기: "지난번 추천" 카드보다 작게 (보조 섹션임을 시각적으로 표현)
- border 금지, CSS 변수 사용

### 완료 검증

- [ ] Dashboard 최하단에 "지금 극장에서" TOP5 표시
- [ ] KOBIS 데이터 로드 실패 시 섹션 자체 숨김
- [ ] 카드 클릭 시 MovieDetail 이동
- [ ] 기존 Dashboard 상단 컴포넌트 레이아웃 영향 없음

---

## 전체 진행 체크리스트

```
[ ] TASK-E: FastAPI 실 연동 + 에러 핸들링
[ ] TASK-F: 추천 히스토리 훅 + Dashboard 섹션 + Agent 컨텍스트 주입
[ ] TASK-G: OTT 배지 + 극장 딥링크 (MovieDetail)
[ ] TASK-H: 박스오피스 TOP5 (Dashboard 보조 섹션)
```

---

## 보류 항목 (발표에서 "향후 계획"으로만 언급)

| 기능 | 보류 이유 |
|---|---|
| 뉴스/미디어 피드 | API 캐싱 부담, MVP 필수 아님 |
| 취향 유사 사용자 추천 | 데이터 설계 복잡, 가상 데이터 신뢰도 이슈 |
| 소셜 공유 (Viewing DNA 카드) | MVP 이후 바이럴 전략 단계 |
| X/Instagram SNS 연동 | X 유료($100/월), Instagram API 사실상 차단 |

---

## Gemini CLI 실행 가이드

```bash
# 프로젝트 루트로 이동
cd D:\deping\frontend

# 태스크 순서대로 실행
gemini -f CLAUDE.md -f TASK.md "TASK-E를 진행해줘"
gemini -f CLAUDE.md -f TASK.md "TASK-F를 진행해줘"
gemini -f CLAUDE.md -f TASK.md "TASK-G를 진행해줘"
gemini -f CLAUDE.md -f TASK.md "TASK-H를 진행해줘"

# 특정 파일 지정 실행
gemini -f CLAUDE.md -f TASK.md -f src/pages/Dashboard.jsx "TASK-F 작업 2를 진행해줘"

# 완료 검증 요청
gemini -f CLAUDE.md -f TASK.md "TASK-F 완료 검증 항목을 체크해줘"

# 디자인 규칙 위반 검사
gemini -f CLAUDE.md "src/components/movie/StreamingBadges.jsx를 읽고 No-Line Rule 위반 여부 확인해줘"
```
