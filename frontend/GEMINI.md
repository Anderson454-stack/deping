# GEMINI.md — Deeping Project AI Guide

> Gemini CLI용 가이드입니다. 프로젝트 루트에서  
> `gemini` 명령 실행 시 이 파일을 컨텍스트로 제공하세요.  
> **사용법**: `gemini -f GEMINI.md "작업 지시"`

---

## Project Overview

- **Name**: Deeping (AI Cinema Guide)
- **Root**: `D:\deping\frontend`
- **Stack**: React 18 + Vite + Tailwind CSS v4 + React Router DOM
- **Backend**: Python FastAPI at `http://localhost:8000` (미연동 상태)

---

## Completed Files (수정 금지)

이미 작성 완료된 파일 목록입니다. 명시적 수정 요청이 없으면 건드리지 마세요.

| 경로 | 설명 |
|------|------|
| `src/index.css` | Tailwind v4 @theme, 커스텀 컬러 토큰 |
| `src/App.jsx` | AnimatePresence 라우팅 |
| `src/api/client.js` | Axios + 인터셉터 |
| `src/api/chatService.js` | Chat API 함수들 |
| `src/hooks/useChat.js` | 채팅 상태 관리 훅 |
| `src/components/motion/PageTransition.jsx` | Framer Motion 유틸 |
| `src/pages/ChatGuide.jsx` | 채팅 페이지 완성본 |
| `src/components/TopNavBar.jsx` | 상단 네비 |
| `src/components/SideNavBar.jsx` | 좌측 메뉴 |
| `src/components/MobileBottomNav.jsx` | 모바일 하단 탭 |

---

## Design Rules (코드 작성 시 필수 준수)

### RULE 1 — No Border Lines
```
금지: border, border-white/10, ring-*, outline (장식용)
대신: background color 차이로 구역 구분
```
```jsx
// BAD
<div className="border border-white/10 rounded-xl p-4">

// GOOD  
<div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)' }}>
```

### RULE 2 — Asymmetric Border Radius
```jsx
// User bubble
borderRadius: '20px 4px 20px 20px'

// AI bubble  
borderRadius: '4px 20px 20px 20px'
```

### RULE 3 — Cinematic Shadow Only
```css
/* 일반 shadow 금지. 아래 값만 사용 */
box-shadow: 0 12px 32px -4px rgba(142, 0, 4, 0.06);
```

### RULE 4 — CSS Variables (하드코딩 금지)
```jsx
// BAD: style={{ color: '#f0f0f0', background: '#8e0004' }}
// GOOD: style={{ color: 'var(--color-text-primary)', background: 'var(--color-primary)' }}
```

Available CSS Variables:
- `--color-primary` → #8e0004
- `--color-surface` → 페이지 최하위 배경
- `--color-surface-raised` → 카드, 버블 배경
- `--color-text-primary` → 주요 텍스트
- `--shadow-cinematic` → 시네마틱 그림자

---

## Pending Tasks

### [TASK-A] PageTransition 적용
**대상 파일**: `src/pages/Dashboard.jsx`, `src/pages/MovieDetail.jsx`

각 페이지 최상위에 `<PageTransition>` 래퍼 추가:
```jsx
import { PageTransition } from '../components/motion/PageTransition';

export default function Dashboard() {
  return (
    <PageTransition>
      {/* 기존 코드 그대로 유지 */}
    </PageTransition>
  );
}
```

`StaggeredStack` 카드 배치는 `<StaggerList>` + `<StaggerListItem>`으로 감싸기:
```jsx
import { StaggerList, StaggerListItem } from '../components/motion/PageTransition';

<StaggerList className="기존_클래스">
  {items.map(item => (
    <StaggerListItem key={item.id}>
      <ExistingCard {...item} />
    </StaggerListItem>
  ))}
</StaggerList>
```

---

### [TASK-B] DNA 슬라이더 → useChat 연결
**대상 파일**: `src/pages/ChatGuide.jsx`

`DNACalibration` 슬라이더의 state를 `useChat`의 `dnaProfile`로 전달:
```jsx
const [dnaProfile, setDnaProfile] = useState({
  tension: 50,
  emotion: 50,
  artistry: 50,
});

const { messages, isLoading, sendMessage } = useChat({
  useMock: true,
  dnaProfile,
});

// DNACalibration에 onProfileChange prop 추가
<DNACalibration value={dnaProfile} onChange={setDnaProfile} />
```

---

### [TASK-C] 환경변수 파일 생성
**위치**: 프로젝트 루트

```bash
# 터미널에서 실행
cp .env.example .env.local
```

`.env.local` 내용 확인:
```
VITE_API_BASE_URL=http://localhost:8000
```

---

### [TASK-D] (선택) 추천 카드 → 영화 상세 라우팅
**대상 파일**: `src/pages/ChatGuide.jsx` 내 `InlineRecommendationCard`

```jsx
import { useNavigate } from 'react-router-dom';

function InlineRecommendationCard({ id, title, year, director, match }) {
  const navigate = useNavigate();
  return (
    <motion.div
      onClick={() => navigate(`/movie/${id}`)}
      className="cursor-pointer"
      // ... 기존 스타일 유지
    >
      {/* 기존 카드 내용 */}
    </motion.div>
  );
}
```

---

## Gemini CLI 사용 팁

### 단일 태스크 실행
```bash
gemini -f GEMINI.md "TASK-A를 실행해줘. Dashboard.jsx 파일을 먼저 읽고 PageTransition을 적용해"
```

### 파일 지정 실행
```bash
gemini -f GEMINI.md -f src/pages/Dashboard.jsx "이 파일에 TASK-A를 적용해줘"
```

### 검증 요청
```bash
gemini -f GEMINI.md "src/pages/ChatGuide.jsx를 읽고 Design Rules 위반 여부를 확인해줘"
```

---

## Conventions

- 컴포넌트: `PascalCase` 파일명, `default export`
- 훅: `use` 접두어 필수
- import 순서: React → 라이브러리 → 내부 컴포넌트 → 내부 훅 → 스타일
- 불필요한 `console.log` 제거
- 기존 컴포넌트 구조 임의 변경 금지
