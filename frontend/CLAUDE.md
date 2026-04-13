# CLAUDE.md — Deeping Project AI Guide

> 이 파일은 Claude Code가 프로젝트 컨텍스트를 즉시 파악하고,  
> 일관된 코드 스타일로 작업하기 위한 마스터 가이드입니다.  
> 프로젝트 루트(`D:\deping\frontend`)에 위치시키세요.

---

## 1. Project Identity

- **Project Name**: Deeping (AI Cinema Guide)
- **Concept**: Azure OpenAI 기반의 에디토리얼 스타일 영화 추천 시스템
- **Frontend Root**: `D:\deping\frontend`
- **Tech Stack**: React 18, Vite, Tailwind CSS v4, React Router DOM, Framer Motion
- **Backend**: Python FastAPI (`http://localhost:8000`) — 현재 프론트엔드 단계

---

## 2. File Structure (현재 기준)

```
frontend/
├── src/
│   ├── api/                         # (미구현 — chatService 연동 시 생성 예정)
│   ├── hooks/
│   │   └── useChat.js               # Mock 스트리밍 + 실 API 전환 훅
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopNavBar.jsx        # 글래스모피즘 상단 네비게이션
│   │   │   ├── SideNavBar.jsx       # Taste Profiles 좌측 메뉴
│   │   │   └── MobileBottomNav.jsx  # 모바일 하단 탭
│   │   ├── dashboard/
│   │   │   ├── ViewingDNA.jsx
│   │   │   ├── HorizonMap.jsx
│   │   │   ├── SessionHistory.jsx
│   │   │   └── StaggeredStack.jsx   # StaggerList/StaggerListItem 적용 완료
│   │   ├── chat/
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── ChatInput.jsx        # onSend / isLoading props 연결 완료
│   │   │   ├── DNACalibration.jsx   # value / onChange props 연결 완료
│   │   │   └── RecommendationCard.jsx  # 클릭 → /movie/:id 라우팅 완료
│   │   └── motion/
│   │       └── PageTransition.jsx   # PageTransition, StaggerList, StaggerListItem
│   ├── pages/
│   │   ├── Dashboard.jsx            # PageTransition 래퍼 적용
│   │   ├── ChatGuide.jsx            # useChat + dnaProfile 연결 완료
│   │   └── MovieDetail.jsx          # PageTransition 래퍼 적용, /movie/:id? 라우팅
│   ├── App.jsx                      # AnimatePresence + AnimatedRoutes 적용
│   ├── main.jsx
│   └── index.css                    # Tailwind v4 @theme 커스텀 토큰
├── .env.local                       # VITE_API_BASE_URL=http://localhost:8000
├── .env.example                     # 환경 변수 템플릿 (없으면 생성 가능)
├── CLAUDE.md                        # ← 이 파일
└── package.json
```

---

## 3. Design System Rules (절대 준수)

코드를 작성할 때 아래 규칙을 항상 적용하세요.  
리뷰 시에도 이 규칙 위반 여부를 먼저 확인합니다.

### 3-1. No-Line Rule 🚫
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

### 3-2. Asymmetry Rule
채팅 버블, 포스터 카드 배치 등에 의도적 비대칭 적용:
```jsx
// 사용자 버블
borderRadius: '20px 4px 20px 20px'

// AI 버블
borderRadius: '4px 20px 20px 20px'
```

### 3-3. Cinematic Shadow Rule
일반 Material Shadow 대신 primary 컬러가 섞인 그림자:
```css
box-shadow: 0 12px 32px -4px rgba(142, 0, 4, 0.06);
/* 또는 var(--shadow-cinematic) */
```

### 3-4. Whitespace Rule
에디토리얼 잡지 스타일의 넉넉한 여백:
- 섹션 간: `py-12` 이상
- 카드 내부: `p-6` 이상
- 타이트한 레이아웃은 의도된 경우에만 허용

### 3-5. Color Token 사용
하드코딩 금지. 반드시 CSS 변수 사용:
```jsx
// ❌ 금지
style={{ color: '#f0f0f0', background: '#8e0004' }}

// ✅ 올바른 방법
style={{ color: 'var(--color-text-primary)', background: 'var(--color-primary)' }}
```

**Available tokens** (`index.css` @theme에 정의됨):
- `--color-primary`: #8e0004
- `--color-surface`: 최하위 배경
- `--color-surface-raised`: 카드/버블 배경
- `--color-text-primary`: 주요 텍스트
- `--shadow-cinematic`: 시네마틱 그림자

---

## 4. Completed Work (건드리지 말 것)

다음은 이미 완성된 항목입니다. 수정 요청이 없으면 변경하지 마세요:

- [x] Tailwind v4 `@theme` 커스텀 토큰 세팅 (`index.css`)
- [x] React Router DOM 3-page 라우팅 (`App.jsx`) + `AnimatePresence` 페이지 전환
- [x] `TopNavBar`, `SideNavBar`, `MobileBottomNav` 레이아웃
- [x] `Dashboard` — ViewingDNA, HorizonMap, SessionHistory, StaggeredStack (PageTransition 적용)
- [x] `ChatGuide` — `useChat` 훅 연동, `dnaProfile` state, 비대칭 버블, 스트리밍 타이핑 효과
- [x] `MovieDetail` — 상세 정보, PageTransition 적용, `/movie/:id?` 동적 라우팅
- [x] `hooks/useChat.js` — Mock 스트리밍, 실 API 전환 로직, `dnaProfile` 옵션
- [x] `components/motion/PageTransition.jsx` — `PageTransition`, `StaggerList`, `StaggerListItem`
- [x] `components/chat/DNACalibration.jsx` — `value` / `onChange` props 양방향 연결
- [x] `components/chat/ChatInput.jsx` — `onSend` / `isLoading` props, Enter 키 전송
- [x] `components/chat/RecommendationCard.jsx` — 클릭 시 `/movie/:id` 이동
- [x] `components/dashboard/StaggeredStack.jsx` — `StaggerList` / `StaggerListItem` 교체
- [x] `.env.local` — `VITE_API_BASE_URL`, `.gitignore`에 `*.local` 포함

---

## 5. Next Tasks (다음 작업 대기)

아래는 현재 미구현 항목입니다. 필요 시 진행하세요.

### Task E: FastAPI 실 연동 전환
FastAPI 서버 준비 완료 후 `ChatGuide.jsx`에서:
```jsx
// Mock → 실 API 전환
const { ... } = useChat({ useMock: false, dnaProfile });
```
`src/api/client.js` (Axios 인스턴스) 및 `src/api/chatService.js` (API 함수) 생성 필요.

### Task F: MovieDetail 데이터 연동
현재 `/movie/:id?` 라우팅은 완료되어 있으나 id를 이용한 실제 데이터 fetch 미구현.
`useParams()`로 id를 읽어 API에서 영화 데이터를 조회하도록 구현 필요.

### Task G: 채팅 메시지에 추천 카드 렌더링
`useChat`이 반환하는 AI 메시지 내에 추천 영화가 포함될 경우,
`RecommendationCard`를 인라인으로 렌더링하는 로직 추가 필요.

---

## 6. Code Conventions

```
컴포넌트: PascalCase 파일명, default export
훅: camelCase, use 접두어 필수 (useChat, useDNA...)
API 함수: camelCase (sendMessage, getRecommendations...)
CSS: Tailwind 유틸리티 우선, 복잡한 값은 style prop으로 CSS 변수 사용
주석: 한국어 허용, 영어 혼용 가능
```

---

## 7. Key Patterns

### useChat 사용 패턴
```jsx
import { useChat } from '../hooks/useChat';

const { messages, isLoading, error, sendMessage } = useChat({
  useMock: true,       // false 시 VITE_API_BASE_URL로 실 요청
  dnaProfile,          // { tension, emotion, artistry } — 슬라이더 값
});
```

### PageTransition 사용 패턴
```jsx
import { PageTransition, StaggerList, StaggerListItem } from '../components/motion/PageTransition';

// 페이지 최상위
export default function MyPage() {
  return (
    <PageTransition>
      {/* 콘텐츠 */}
    </PageTransition>
  );
}

// 목록 stagger
<StaggerList className="flex gap-4">
  {items.map(item => (
    <StaggerListItem key={item.id}>
      <Card />
    </StaggerListItem>
  ))}
</StaggerList>
```

---

## 8. Commands

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 설치된 주요 패키지
npm install framer-motion   # 이미 설치됨
```

---

## 9. Do Not

- `border-*` 클래스로 구역 구분 금지
- 하드코딩 컬러값 사용 금지 (`#8e0004` 직접 사용 → `var(--color-primary)`)
- `console.log` 디버그 코드 커밋 금지
- `any` 타입 남용 금지 (TypeScript 전환 시)
- 완성된 컴포넌트의 구조 임의 변경 금지

---

*Last updated: 2026-04-13 | Maintained by: Claude Code*
