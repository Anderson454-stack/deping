# GEMINI.md — Deeping Project AI Guide

> Gemini CLI용 가이드입니다. 프로젝트 루트에서  
> `gemini` 명령 실행 시 이 파일을 컨텍스트로 제공하세요.  
> **사용법**: `gemini -f GEMINI.md "작업 지시"`

---

## Project Overview

- **Name**: Deeping (AI Cinema Guide)
- **Root**: `D:\deping\frontend`
- **Stack**: React 18 + Vite + Tailwind CSS v4 + React Router DOM
- **Backend**: Python FastAPI at `http://localhost:8000` (연동 준비 완료)

---

## Completed Files (주요 아키텍처)

이미 핵심 구조가 잡힌 파일들입니다.

| 경로 | 설명 |
|------|------|
| `src/index.css` | Tailwind v4 커스텀 컬러 토큰 및 글로벌 스타일 |
| `src/App.jsx` | AnimatePresence 기반 라우팅 및 레이아웃 구조 |
| `src/api/client.js` | Axios 인스턴스 (BaseURL: `.env.local` 참조) |
| `src/api/chatService.js` | 대화형 인터페이스를 위한 API 함수군 |
| `src/hooks/useChat.js` | Mock 스트리밍 및 실 API 전환 가능한 채팅 상태 관리 훅 |
| `src/components/motion/PageTransition.jsx` | Framer Motion 기반 페이지/리스트 전환 효과 |
| `src/pages/Dashboard.jsx` | 메인 대시보드 (ViewingDNA, BoxOfficeCarousel, Featured 연동) |
| `src/pages/ChatGuide.jsx` | 디핑 가이드 (현재 데모 스크립트 기반, useChat 전환 필요) |
| `src/pages/MovieDetail.jsx` | 영화 상세 정보 페이지 (PageTransition 적용 완료) |
| `src/components/dashboard/BoxOfficeCarousel.jsx` | Embla Carousel 기반 시네마틱 박스오피스 |
| `src/components/dashboard/ViewingDNA.jsx` | 사용자 영화 취향 시각화 (Auteur DNA) |

---

## Design Rules (코드 작성 시 필수 준수)

### RULE 1 — No Border Lines
```
금지: border, border-white/10, ring-*, outline (장식용)
대신: background color 차이로 구역 구분 (var(--color-surface-raised) 등)
```

### RULE 2 — Asymmetric Border Radius
```jsx
// User bubble: '20px 4px 20px 20px'
// AI bubble: '4px 20px 20px 20px'
// Card/Panel: '24px' (일반) 또는 비대칭 '24px 4px 24px 24px'
```

### RULE 3 — Cinematic Shadow Only
```css
/* 일반 shadow 금지. 아래 값만 사용 */
box-shadow: 0 12px 32px -4px rgba(142, 0, 4, 0.06);
```

### RULE 4 — CSS Variables (하드코딩 금지)
사용 가능한 주요 변수:
- `--color-primary`: #8e0004 (Ruby Red)
- `--color-surface`: 최하위 배경
- `--color-surface-raised`: 카드, 버블 배경
- `--color-text-primary`: 주요 텍스트
- `--shadow-cinematic`: 시네마틱 그림자 효과

---

## Progress Report (2026-04-15 기준)

### [DONE]
- **TASK-A**: `Dashboard`, `MovieDetail`, `ChatGuide`, `ComingSoon` 모든 페이지에 `PageTransition` 적용 완료.
- **TASK-C**: `.env.local` 환경변수 구성 및 `VITE_API_BASE_URL` 설정 완료.
- **Architecture**: `useChat` 훅에 DNA 프로필 및 Mock/실 API 스위칭 로직 구현 완료.
- **Dashboard**: `ViewingDNA`와 `BoxOfficeCarousel` 통합, 데이터 페칭 로직(15분 갱신) 적용.

### [PENDING]
- **TASK-B**: `ChatGuide.jsx`를 `DEMO_SCRIPT`에서 `useChat` 훅 기반으로 전환.
- **TASK-D**: `ChatGuide.jsx` 내 추천 결과 카드 클릭 시 `MovieDetail`로의 라우팅 연결.
- **Integration**: `GlobalCinemaFeed.jsx`를 대시보드 하단에 배치하고 뉴스 데이터 연동.

---

## Gemini CLI 사용 가이드

### 단일 태스크 실행
```bash
gemini -f GEMINI.md "TASK-B를 실행해줘. ChatGuide.jsx를 useChat 훅 기반으로 수정해"
```

### 검증 요청
```bash
gemini -f GEMINI.md "src/pages/ChatGuide.jsx의 디자인 룰 위반 여부를 확인하고 수정해"
```
