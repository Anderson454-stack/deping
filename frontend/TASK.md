# TASK.md — Claude Code 작업 지시서

> **대상**: Claude Code (VSCode Extension)
> **프로젝트 루트**: `D:\deping\frontend`
> **전제 조건**: `CLAUDE.md`를 먼저 읽고 디자인 시스템 규칙을 숙지할 것.
> **작업 순서**: E → F → G 순서대로 진행. 각 태스크 완료 후 체크.

---

## 완료된 태스크 (수정 금지)

```
[x] TASK-A: Dashboard / MovieDetail에 PageTransition 적용
[x] TASK-A: App.jsx AnimatePresence + AnimatedRoutes 구성
[x] TASK-A: StaggeredStack → StaggerList / StaggerListItem 교체
[x] TASK-B: dnaProfile state ChatGuide에 추가
[x] TASK-B: useChat에 dnaProfile 연결
[x] TASK-B: DNACalibration ↔ dnaProfile 양방향 연결
[x] TASK-B: ChatInput onSend / isLoading props 연결
[x] TASK-C: .env.local 생성 (VITE_API_BASE_URL=http://localhost:8000)
[x] TASK-D: RecommendationCard 클릭 → /movie/:id 라우팅
```

---

## TASK-E: FastAPI 실 연동 전환

**상태**: 🔴 미완료
**난이도**: 보통
**전제 조건**: FastAPI 서버(`http://localhost:8000`)가 실행 중이어야 함

### 작업 내용

#### 1단계 — src/api/client.js 생성

```js
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export default client;
```

#### 2단계 — src/api/chatService.js 생성

```js
import client from './client';

export async function sendMessage(message, dnaProfile) {
  const { data } = await client.post('/chat', {
    message,
    dna_profile: dnaProfile,
  });
  return data;
}

export async function getRecommendations(dnaProfile) {
  const { data } = await client.get('/recommendations', {
    params: dnaProfile,
  });
  return data;
}
```

#### 3단계 — ChatGuide.jsx useMock 전환

```jsx
// Mock 모드 (현재)
const { ... } = useChat({ useMock: true, dnaProfile });

// 실 API 모드 (FastAPI 준비 완료 후 변경)
const { ... } = useChat({ useMock: false, dnaProfile });
```

### 완료 검증

- `/chat`에서 메시지 전송 시 FastAPI 서버로 요청이 전달되어야 한다.
- 응답이 AI 버블로 렌더링되어야 한다.
- 서버 오류 시 `error` state가 설정되어야 한다 (useChat 내부 처리).

---

## TASK-F: MovieDetail 데이터 연동

**상태**: 🔴 미완료
**난이도**: 보통
**전제 조건**: TASK-E 완료 후 진행 권장

### 작업 내용

현재 `/movie/:id?` 라우팅은 완료되어 있으나, 하드코딩된 더미 데이터를 사용 중.
`useParams`로 id를 읽어 API에서 실제 영화 데이터를 fetch해야 한다.

#### MovieDetail.jsx 수정

```jsx
import { useParams } from 'react-router-dom';

const MovieDetail = () => {
  const { id } = useParams();
  // id로 API 데이터 fetch
  // 로딩/에러 처리 추가
};
```

#### 주의사항

- `id`가 없는 경우(직접 `/movie` 접근) 기본 더미 데이터 또는 리다이렉트 처리
- No-Line Rule, Color Token Rule 준수
- 기존 레이아웃(포스터 + 상세 정보 구조) 유지

### 완료 검증

- `/movie/1`, `/movie/2` 접근 시 각기 다른 영화 데이터가 표시되어야 한다.
- 로딩 중 스켈레톤 또는 스피너가 표시되어야 한다.
- 잘못된 id 접근 시 에러 메시지 또는 대체 UI가 노출되어야 한다.

---

## TASK-G: 채팅 메시지 내 추천 카드 렌더링

**상태**: 🔴 미완료
**난이도**: 높음
**전제 조건**: TASK-E 완료 후 진행 권장

### 작업 내용

`useChat`이 반환하는 AI 메시지에 추천 영화 데이터가 포함될 경우,
`RecommendationCard`를 메시지 버블 아래에 인라인으로 렌더링한다.

#### useChat.js 메시지 구조 확장

```js
// AI 메시지에 recommendations 필드 추가
{
  id: ...,
  role: 'assistant',
  content: '...',
  recommendations: [   // 옵셔널 — 추천 영화 배열
    { id, title, rating, tags, description, image }
  ],
  timestamp: '...',
}
```

#### ChatGuide.jsx 렌더링 로직

```jsx
{messages.map((msg) => (
  <div key={msg.id}>
    <ChatBubble role={msg.role} message={msg.content} time={msg.timestamp} />
    {msg.recommendations?.map((rec) => (
      <RecommendationCard key={rec.id} movie={rec} />
    ))}
  </div>
))}
```

#### 주의사항

- Mock 모드에서도 일부 응답에 `recommendations` 배열이 포함되도록 `useChat.js` 수정
- `RecommendationCard`의 기존 스타일 변경 금지

### 완료 검증

- AI 응답에 추천 데이터가 있을 경우 카드가 버블 아래에 렌더링되어야 한다.
- 카드 클릭 시 해당 영화의 `/movie/:id`로 이동해야 한다.
- 추천 데이터가 없는 AI 응답은 버블만 표시되어야 한다.

---

## 전체 완료 체크리스트

```
[x] TASK-A ~ D: 페이지 전환, DNA 연동, 환경변수, 라우팅
[ ] TASK-E: FastAPI 실 연동 (client.js, chatService.js)
[ ] TASK-F: MovieDetail API 데이터 연동
[ ] TASK-G: 채팅 내 추천 카드 인라인 렌더링
```

---

## 작업 금지 사항

다음은 변경하지 마세요 (명시적 요청이 없는 한):

- `src/components/motion/PageTransition.jsx` 구조 변경
- `src/hooks/useChat.js`의 Mock 스트리밍 로직 제거
- `TopNavBar`, `SideNavBar`, `MobileBottomNav` 수정
- `index.css`의 `@theme` 토큰 수정
- 기존 컴포넌트의 Tailwind 클래스 임의 변경

---

## 작업 완료 보고 형식

```
✅ TASK-E 완료
- src/api/client.js: Axios 인스턴스 생성
- src/api/chatService.js: sendMessage, getRecommendations 구현
- ChatGuide.jsx: useMock: false 전환
- 테스트: /chat에서 실 API 응답 수신 확인
```

---

*Last updated: 2026-04-13 | Maintained by: Claude Code*
