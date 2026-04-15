# Deping (디핑) — 전체 개발 아키텍처 설계서

> 이 문서는 Azure 클라우드, Python 백엔드, VSCode 개발 환경, 웹 프론트엔드까지
> 전체 기술 스택과 각 구성 요소 간의 연결 방식을 정의합니다.

---

## 전체 아키텍처 조감도

```
┌─────────────────────────────────────────────────────────────┐
                        ① Azure Cloud                            
                                                             
   ┌──────────────┐  ┌─────────────┐   ┌─────────────────┐    
     Azure OpenAI        Azure AI          Azure Blob           
                         Search               Storage              
    · GPT-5                                           
    · GPT-4.1         · 벡터 검색        · 영화 메타데이터     
      -mini           · 시맨틱 검색                          
    · text-           · 하이브리드       · 인지 속성 JSON      
      embed-             랭킹                          
      ding-3                                          
      -small                                          
   └──────┬──────┘  └──────┬──────┘    └────────┬───────┘    
          │                │                    │              
└─────────┼────────────────┼─────────── ────────┼──────────────┘
          │  openai SDK    │ azure-search SDK   │ azure-storage SDK
          ▼                ▼                    ▼
┌────────────────────────────────────────────────────────────┐
                ② Python 백엔드 (오케스트레이션)    
                                                      
  ┌──────────┐    ┌──────────┐    ┌──────────┐           
     Agent 1   ──→   Agent 2   ──→  Agent 3                   
    프로파일러         서처          큐레이터                 
     (GPT-5)       (4.1-mini)       (GPT-5)                
  └──────────┘    └──────────┘    └──────────┘               
                                                            
  ┌─────────────────┐  ┌──────────┐  ┌──────────────────┐    
     openai SDK          FastAPI        TMDB API 연동        
     + requests            서버          (requests)           
  └─────────────────┘  └────┬─────┘  └──────────────────┘    
                            │                                
└───────────────────────────┼────────────────────────────────┘
                             │  WebSocket / REST API
          ┌──────────────────┼──────────────────┐
          ▼                                     ▼
┌────────────────────┐            ┌────────────────────────┐
  ③ VSCode 개발 환경                   ④ 웹 프론트엔드         
                                                        
  · Jupyter Notebook                  · React (Vite)         
  · Python 3.11+                      · Tailwind CSS         
                                      · 채팅 UI              
  · Git / GitHub                      · 영화 카드 UI          
                                      · 카드 선택 온보딩       
└────────────────────┘            └───────────┬────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ 사용자 (웹 브라우저) │
                                    └─────────────────────┘
```

---

## ① Azure Cloud 레이어

Azure에서 사용하는 서비스와 각각의 역할.

### 1-1. Azure OpenAI Service

AI 두뇌 역할. 대화, 추론, 임베딩을 담당.

| 모델 | 배포명 (예시) | 용도 | 사용 에이전트 |
|------|-------------|------|-------------|
| GPT-5 | `gpt-5` | 대화 생성, CoT 추론, Function Calling | Agent 1 (프로파일러), Agent 3 (큐레이터) |
| GPT-4.1-mini | `gpt-4.1-mini` | 검색 쿼리 변환, 인지 속성 배치 생성 | Agent 2 (서처), 데이터 전처리 |
| text-embedding-3-small | `text-embedding-3-small` | 영화 줄거리 벡터화 (1536차원) | Azure AI Search 인덱싱 시 |

**Azure OpenAI 리소스 설정**:
- 리소스 그룹: `deping-rg`
- 위치: Korea Central (또는 East US)
- 엔드포인트: `https://deping-openai.openai.azure.com/`
- API 버전: `2024-12-01-preview` 이상

### 1-2. Azure AI Search

영화 검색 엔진 역할. 벡터 검색과 시맨틱 검색을 동시에 수행.

| 구성 요소 | 설명 |
|----------|------|
| 인덱스명 | `movies-index` |
| 벡터 검색 | HNSW 알고리즘, cosine 유사도, 1536차원 |
| 시맨틱 검색 | 제목(ko) + 줄거리 + 장르/감독 기반 |
| 벡터라이저 | Azure OpenAI text-embedding-3-small 연동 |
| 필터링 | 장르, 연도, 복잡도, 전개속도 등 facet 필터 |

**인덱스 주요 필드**:

```
id (key)
title, title_ko (검색 가능)
year, runtime, rating_imdb (필터/정렬)
genres (컬렉션, 필터/패싯)
overview (검색 가능)
overview_vector (1536차원 벡터)
director (검색/필터)
tmdb_id
pacing (fast/medium/slow, 필터)
plot_complexity (1~5, 필터)
emotional_intensity (1~5, 필터)
visual_score (0~1, 필터)
sentiment_score (0~1, 필터)
```

**서비스 티어**: Free (F) 또는 Basic (B) — MVP 기준 3,000편이면 Free 가능

### 1-3. Azure Blob Storage

데이터 저장소 역할. 원본 데이터와 전처리 결과물 보관.

| 컨테이너명 | 내용 |
|-----------|------|
| `raw-data` | TMDB API 원본 JSON, NSMC CSV, IMDB 리뷰 |
| `processed` | 인지 속성 부착된 영화 JSON, 임베딩 벡터 |
| `index-data` | AI Search 업로드용 최종 데이터 |

**서비스 티어**: Standard LRS (가장 저렴)

---

## ② Python 백엔드 레이어 (오케스트레이션)

에이전트 3명을 연결하고 Azure 서비스와 통신하는 핵심 로직.

### 2-1. 오케스트레이션 방식

**Python 직접 구현 (함수 체이닝)**

프레임워크 없이 openai SDK로 직접 구현. 각 에이전트가 하나의 Python 함수.

```
run_pipeline(user_message)
    │
    ├─→ agent_profiler(user_message)     # Agent 1: 대화 → 프로필 JSON
    │       └─→ openai.chat.completions.create() (GPT-5)
    │       └─→ Function Calling: create_profile()
    │
    ├─→ agent_searcher(profile_json)     # Agent 2: 프로필 → 후보 15편
    │       └─→ openai.chat.completions.create() (GPT-4.1-mini)
    │       └─→ azure.search.documents.SearchClient.search()
    │       └─→ requests.get(TMDB API)
    │
    └─→ agent_curator(profile_json, candidates)  # Agent 3: 후보 → 최종 3편
            └─→ openai.chat.completions.create() (GPT-5)
            └─→ Function Calling: select_movies()
```

### 2-2. 사용 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| `openai` | 1.x+ | Azure OpenAI API 호출 (GPT-5, 4.1-mini, Embedding) |
| `azure-search-documents` | 11.x | Azure AI Search 검색/인덱싱 |
| `azure-storage-blob` | 12.x | Blob Storage 데이터 업로드/다운로드 |
| `requests` | 2.x | TMDB API HTTP 호출 |
| `fastapi` | 0.100+ | 웹 API 서버 (React 프론트엔드와 통신) |
| `uvicorn` | 0.20+ | FastAPI ASGI 서버 실행 |
| `websockets` | 12.x | 실시간 채팅 스트리밍 (선택) |
| `pandas` | 2.x | 데이터 전처리 (NSMC, TMDB 정리) |
| `gradio` | 4.x | 1단계 프로토타입 UI |

### 2-3. FastAPI 서버 엔드포인트

웹 프론트엔드(React)와 백엔드를 연결하는 API.

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/chat` | POST | 사용자 메시지 전송 → 에이전트 응답 반환 |
| `/api/chat/stream` | WebSocket | 실시간 스트리밍 응답 (선택적) |
| `/api/movies/cards` | GET | 온보딩용 영화 카드 목록 반환 |
| `/api/directors/cards` | GET | 온보딩용 감독 카드 목록 반환 |
| `/api/actors/cards` | GET | 온보딩용 배우 카드 목록 반환 |
| `/api/recommend` | POST | 프로필 JSON → 최종 추천 3편 반환 |

### 2-4. 외부 API 연동

**TMDB API**

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /3/movie/{id}` | 영화 상세 정보 (줄거리, 장르, 런타임) |
| `GET /3/movie/{id}/videos` | 예고편 YouTube 링크 |
| `GET /3/movie/{id}/credits` | 감독, 출연진 |
| `GET /3/movie/popular` | 인기 영화 목록 (온보딩 카드용) |
| `GET /3/search/movie` | 영화 제목 검색 |
| `GET /3/configuration/images` | 포스터 이미지 베이스 URL |

- API Key: https://www.themoviedb.org/ 에서 무료 발급
- 포스터 URL 형식: `https://image.tmdb.org/t/p/w500{poster_path}`

---

## ③ VSCode 개발 환경

로컬 개발에 사용하는 도구와 설정.

### 3-1. VSCode 확장 프로그램

| 확장 프로그램 | 용도 |
|-------------|------|
| Python (ms-python) | Python 개발 기본 |
| Jupyter | .ipynb 노트북 실행 |
| Pylance | Python 타입 체킹, 자동 완성 |
| REST Client | API 테스트 (TMDB, FastAPI) |
| ES7+ React/Redux Snippets | React 개발 |
| Tailwind CSS IntelliSense | Tailwind 자동 완성 |
| GitLens | Git 히스토리, 협업 |
| Azure Tools | Azure 리소스 관리 |

### 3-2. Python 환경

```
Python 3.11+
가상환경: venv 또는 conda

# 가상환경 생성
python -m venv .venv

# 활성화 (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# 의존성 설치
pip install openai azure-search-documents azure-storage-blob
pip install requests fastapi uvicorn websockets
pip install pandas gradio jupyter
```

### 3-3. 프로젝트 폴더 구조

```
deping/
├── .venv/                    # Python 가상환경
├── .env                      # API 키 (gitignore 대상)
├── notebooks/                # Jupyter 노트북 (1단계 개발)
│   ├── 01_tmdb_collect.ipynb      # TMDB 데이터 수집
│   ├── 02_nsmc_sentiment.ipynb    # NSMC 감성 분석
│   ├── 03_build_index.ipynb       # AI Search 인덱스 구축
│   ├── 04_agent_profiler.ipynb    # Agent 1 개발/테스트
│   ├── 05_agent_searcher.ipynb    # Agent 2 개발/테스트
│   ├── 06_agent_curator.ipynb     # Agent 3 개발/테스트
│   └── 07_pipeline_test.ipynb     # 전체 파이프라인 통합 테스트
├── backend/                  # FastAPI 백엔드
│   ├── main.py                    # FastAPI 앱 진입점
│   ├── agents/
│   │   ├── profiler.py            # Agent 1
│   │   ├── searcher.py            # Agent 2
│   │   └── curator.py             # Agent 3
│   ├── services/
│   │   ├── azure_openai.py        # OpenAI 클라이언트 설정
│   │   ├── azure_search.py        # AI Search 클라이언트
│   │   └── tmdb.py                # TMDB API 연동
│   ├── models/
│   │   ├── profile.py             # 프로필 JSON 스키마
│   │   └── movie.py               # 영화 데이터 스키마
│   └── config.py                  # 환경 변수 로드
├── frontend/                 # React 웹 프론트엔드
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx     # 채팅 인터페이스
│   │   │   ├── ChatBubble.jsx     # 메시지 버블
│   │   │   ├── QuickButtons.jsx   # 퀵 선택 버튼
│   │   │   ├── MovieCardGrid.jsx  # 영화 카드 선택 그리드
│   │   │   ├── MovieResult.jsx    # 추천 결과 카드
│   │   │   └── TrailerEmbed.jsx   # 예고편 임베드
│   │   ├── hooks/
│   │   │   └── useChat.js         # 채팅 상태 관리
│   │   └── api/
│   │       └── client.js          # FastAPI 통신
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/                     # 원본/처리 데이터
│   ├── raw/
│   │   ├── tmdb_movies.json
│   │   └── nsmc_reviews.csv
│   └── processed/
│       └── movies_with_cognitive.json
├── requirements.txt
├── README.md
└── .gitignore
```

### 3-4. 환경 변수 (.env)

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://deping-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOY_GPT5=gpt-5
AZURE_OPENAI_DEPLOY_MINI=gpt-4.1-mini
AZURE_OPENAI_DEPLOY_EMBED=text-embedding-3-small

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://deping-search.search.windows.net
AZURE_SEARCH_API_KEY=your-key-here
AZURE_SEARCH_INDEX_NAME=movies-index

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string

# TMDB
TMDB_API_KEY=your-tmdb-key

# FastAPI
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
```

### 3-5. 개발 단계별 사용 도구

| 단계 | 도구 | 파일 형식 | 설명 |
|------|------|----------|------|
| 1단계: 데이터 수집 | Jupyter Notebook | .ipynb | TMDB 크롤링, NSMC 분석, 인덱스 구축 |
| 1단계: 에이전트 개발 | Jupyter Notebook | .ipynb | 각 에이전트 개별 테스트 |
| 1단계: 프로토타입 UI | Gradio | .ipynb | 빠른 데모, 팀 내부 확인 |
| 2단계: 백엔드 | FastAPI + Python | .py | 프로덕션 API 서버 |
| 2단계: 프론트엔드 | React + Vite | .jsx | 실제 웹 UI |

---

## ④ 웹 프론트엔드 레이어

사용자가 실제로 보고 사용하는 화면.

### 4-1. 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18+ | UI 컴포넌트 프레임워크 |
| Vite | 5+ | 빌드 도구 (빠른 개발 서버) |
| Tailwind CSS | 3+ | 유틸리티 기반 스타일링 |
| Axios | 1+ | FastAPI와 HTTP 통신 |

### 4-2. 프로젝트 생성

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite axios
```

### 4-3. 주요 컴포넌트

**ChatWindow.jsx** — 메인 채팅 화면

대화 메시지를 표시하고, 사용자 입력을 받아 FastAPI 백엔드로 전송.

주요 기능:
- 메시지 버블 (봇/사용자 구분)
- 타이핑 인디케이터
- 자동 스크롤

**QuickButtons.jsx** — 퀵 선택 버튼

대화형 질문에 대한 빠른 응답 버튼. 기분, 장르, 스타일 등을 선택.

**MovieCardGrid.jsx** — 영화/감독/배우 카드 선택

대화 중 카드 선택이 필요할 때 팝업되는 그리드.

주요 기능:
- 포스터 이미지 표시
- 복수 선택 (토글)
- 선택 개수 표시
- "선택 완료" 버튼

**MovieResult.jsx** — 추천 결과 카드

최종 추천 영화 3편을 카드 형태로 표시.

주요 기능:
- 포스터 이미지
- 제목, 장르, 런타임, 평점
- 개인화된 추천 이유
- 예고편 링크 버튼

**TrailerEmbed.jsx** — 예고편 임베드

YouTube 예고편을 인라인으로 표시.

### 4-4. 백엔드 통신 흐름

```
사용자 입력 (React)
    │
    ├─ 텍스트 메시지 → POST /api/chat → Agent 응답 반환
    │
    ├─ 카드 선택 요청 → GET /api/movies/cards → 영화 목록 반환
    │
    ├─ 카드 선택 결과 → POST /api/chat (선택 데이터 포함)
    │
    └─ 최종 추천 요청 → POST /api/recommend → 영화 3편 + 이유
```

---

## 레이어 간 통신 정리

| 출발 | 도착 | 프로토콜 | 라이브러리 |
|------|------|---------|-----------|
| 백엔드 → Azure OpenAI | REST (HTTPS) | `openai` SDK |
| 백엔드 → Azure AI Search | REST (HTTPS) | `azure-search-documents` SDK |
| 백엔드 → Azure Blob Storage | REST (HTTPS) | `azure-storage-blob` SDK |
| 백엔드 → TMDB API | REST (HTTPS) | `requests` |
| 프론트엔드 → 백엔드 | REST / WebSocket | `axios` / native WebSocket |
| 사용자 → 프론트엔드 | HTTP (브라우저) | React |

---

## 개발 순서 (2주 로드맵과 연결)

```
Week 1
  Day 1-2: ③ VSCode + Jupyter로 데이터 수집
           ① Azure Blob에 원본 저장
           ① Azure AI Search 인덱스 구축
  
  Day 3-4: ③ Jupyter로 Agent 1, 2, 3 개별 개발
           ① Azure OpenAI 호출 테스트
  
  Day 5:   ③ Jupyter에서 전체 파이프라인 연결
           ③ react에서 정상작동 테스트

Week 2
  Day 6-7: ② FastAPI 백엔드 구축 (agents/ → API 엔드포인트)
           ④ React 프론트엔드 기본 구조
  
  Day 8-9: ④ 채팅 UI + 카드 선택 UI + 결과 카드 구현
           ②④ 백엔드-프론트엔드 연동 테스트
  
  Day 10:  전체 통합 테스트, 버그 수정, 발표 준비
```

---

## 핵심 의사결정 요약

| 결정 항목 | 선택 | 이유 |
|----------|------|------|
| 클라우드 | Azure | K-Digital Training Azure 크레딧 활용 |
| LLM | GPT-5 (메인) + GPT-4.1-mini (서브) | 대화/추론은 최고 모델, 검색은 비용 효율 |
| 검색 | Azure AI Search | 벡터+시맨틱 하이브리드, Azure 네이티브 통합 |
| 오케스트레이션 | Python 직접 구현 | 2주 기간, 학습 비용 최소화, 디버깅 용이 |
| 개발 환경 | VSCode + Jupyter | .ipynb 선호, 빠른 프로토타이핑 |
| 프로토타입 UI | Gradio | 1단계 빠른 데모 |
| 프로덕션 UI | React + Vite + Tailwind | 2단계 실제 웹 서비스 |
| 백엔드 서버 | FastAPI | 비동기 지원, 타입 힌트, 자동 문서화 |
| 데이터 | TMDB + NSMC + IMDB 50K | 영화 정보 + 한국어/영문 리뷰 |
| 영화 DB 규모 | MVP 2,000~3,000편 | Free 티어 AI Search로 충분 |
| 버전 관리 | Git + GitHub | 팀 협업 |
