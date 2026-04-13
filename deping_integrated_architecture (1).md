# Deping — 통합 아키텍처 설계서

> **Cognitive-Driven Movie Recommendation System**
> 사용자의 취향과 인지적 감상 스타일을 결합한 3-에이전트 영화 추천 시스템

---

## 1. 프로젝트 개요

### 1.1 프로젝트명

**Deping (디핑)** — Cognitive-Driven Movie Recommendation System (C-DMRS)

### 1.2 핵심 가치

기존 추천 시스템은 "스릴러를 본 사용자에게 또 다른 스릴러를 추천"하는 단순한 과거 시청 기록 기반 상관관계에만 의존한다. Deping은 여기에 사용자가 영화를 어떻게 즐기고 느끼는지 — 즉 **개인별 감상 스타일과 보는 습관**(복잡한 플롯을 좋아하는지, 빠른 전개를 원하는지, 감정 부하를 견디는 정도 등) — 을 함께 고려하여, "스릴러를 좋아하지만 복잡한 플롯은 싫어하는 사용자에게 빠른 전개의 액션 스릴러만 추천"하는 **더 깊이 있고 인간적인 개인화 추천**을 제공한다.

### 1.3 차별화 포인트

- **자연어 대화 기반 프로파일링**: 설문지가 아닌 LLM 대화를 통해 취향 + 인지 성향을 동시에 수집
- **하이브리드 검색**: 벡터 유사도 + 시맨틱 필터링으로 후보 생성
- **CoT 검증 큐레이션**: 추천 후보를 인지 부하 관점에서 LLM이 논리적으로 검증

---

## 2. 시스템 아키텍처

### 2.1 전체 흐름

```
사용자 접속
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Agent 1 — 프로파일러                              │
│  Azure OpenAI GPT-4.1 (Function Calling)         │
│  ┌───────────────────┐  ┌─────────────────────┐  │
│  │ 취향 대화 (3~5턴)  │→│ 인지 성향 파악 (자연어) │  │
│  └───────────────────┘  └─────────────────────┘  │
│                    ↓ 프로필 JSON                   │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Agent 2 — 서처                                   │
│  ┌───────────────────┐  ┌─────────────────────┐  │
│  │ Azure AI Search   │→│ TMDB API             │  │
│  │ 벡터+시맨틱 하이브리드│  │ 메타데이터 보강        │  │
│  └───────────────────┘  └─────────────────────┘  │
│                    ↓ 후보 15편                     │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Agent 3 — 큐레이터                                │
│  Azure OpenAI GPT-4.1                            │
│  ┌───────────────────┐  ┌─────────────────────┐  │
│  │ CoT 인지 부하 검증  │→│ 최종 3편 + 추천 이유   │  │
│  └───────────────────┘  └─────────────────────┘  │
│                    ↓ 추천 결과                     │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  영화 추천 카드 UI                                  │
│  포스터 + 개인화된 추천 이유 + 예고편 링크            │
└─────────────────────────────────────────────────┘
```

### 2.2 Azure 서비스 매핑

| 역할 | 서비스 | 상세 |
|------|--------|------|
| LLM (Agent 1, 3) | Azure OpenAI GPT-4.1 | Function Calling, CoT 추론 |
| 임베딩 | Azure OpenAI text-embedding-3-small | 1536차원, 영화 줄거리/리뷰 벡터화 |
| 검색 엔진 | Azure AI Search | 벡터 + 시맨틱 하이브리드, 필터링 |
| 데이터 저장 | Azure Blob Storage | 영화 메타데이터, 리뷰 데이터 |
| 영화 API | TMDB API (외부) | 포스터, 예고편, 평점, 출연진 |
| 오케스트레이션 | Python | 에이전트 간 파이프라인 연결 |

---

## 3. 에이전트 상세 설계

### 3.1 Agent 1 — 프로파일러

#### 역할

자연스러운 대화를 통해 사용자의 **메타데이터 선호**(장르, 감독, 배우 등)와 **인지적 감상 스타일**(복잡도 내성, 인내도, 시각 선호 등)을 동시에 수집한다.

#### 수집 항목

**메타데이터 선호 (기본)**

| 항목 | 설명 | 예시 값 |
|------|------|---------|
| mood | 현재 기분 / 원하는 분위기 | relaxed, excited, melancholy |
| genres | 선호 장르 | sci-fi, romance, thriller |
| tone | 가벼움/무거움 선호 | light, medium, heavy |
| reference | 기준점 영화 | Interstellar, Parasite |
| priority | 중시 요소 | visuals, story, acting, music |
| avoid | 회피 요소 | horror, heavy_drama, gore |
| era | 선호 시대 | recent, classic, any |

**인지적 감상 스타일 (C-DMRS 확장)**

| 항목 | 설명 | 대화 속 질문 예시 |
|------|------|-------------------|
| patience | 전개 인내도 | "느린 전개도 괜찮으세요, 아니면 빠르게 시작하는 게 좋으세요?" |
| complexity | 복잡도 선호 | "이야기가 꼬이는 게 재미있으세요? 단순명쾌한 게 좋으세요?" |
| emotional_load | 감정 부하 내성 | "보고 나서 여운이 오래 남는 영화 좋아하세요?" |
| visual_style | 시각 스타일 선호 | "화려한 영상이 좋으세요, 사실적인 화면이 좋으세요?" |
| cognitive_load | 인지 부하 내성 | "자막 읽으면서 복선 찾는 거 괜찮으세요?" |

#### 시스템 프롬프트 핵심 지침

```
당신은 영화 취향 전문가 '디핑'입니다.

## 대화 규칙
1. 자연스러운 대화체로 질문합니다 (설문조사 느낌 절대 금지)
2. 한 번에 하나의 질문만 합니다
3. 사용자 답변에서 키워드를 추출하여 후속 질문을 생성합니다
4. 인지적 성향 질문은 취향 질문 사이에 자연스럽게 섞어 넣습니다
5. 3~5턴 이내에 수집을 완료합니다
6. 충분한 정보가 모이면 create_profile 함수를 호출합니다

## 인지 성향 파악 가이드
- "빠른 전개" 언급 → patience: low
- "생각할 거리" 언급 → complexity: high
- "머리 비우고" 언급 → cognitive_load: low, complexity: low
- "감동적인" 언급 → emotional_load: high
- "영상미" 언급 → visual_style: cinematic, priority: visuals
```

#### Function Calling 스키마

```json
{
  "name": "create_profile",
  "description": "사용자 취향 프로필을 생성합니다",
  "parameters": {
    "type": "object",
    "properties": {
      "mood": {
        "type": "string",
        "enum": ["relaxed", "excited", "melancholy", "thoughtful", "adventurous"]
      },
      "genres": {
        "type": "array",
        "items": { "type": "string" }
      },
      "tone": {
        "type": "string",
        "enum": ["light", "medium", "heavy"]
      },
      "reference": {
        "type": "array",
        "items": { "type": "string" }
      },
      "priority": {
        "type": "string",
        "enum": ["visuals", "story", "acting", "music", "atmosphere"]
      },
      "avoid": {
        "type": "array",
        "items": { "type": "string" }
      },
      "era": {
        "type": "string",
        "enum": ["recent", "classic", "any"]
      },
      "cognitive": {
        "type": "object",
        "properties": {
          "patience": { "type": "string", "enum": ["low", "medium", "high"] },
          "complexity": { "type": "string", "enum": ["low", "medium", "high"] },
          "emotional_load": { "type": "string", "enum": ["low", "medium", "high"] },
          "visual_style": { "type": "string", "enum": ["cinematic", "realistic", "stylized", "any"] },
          "cognitive_load": { "type": "string", "enum": ["low", "medium", "high"] }
        }
      }
    },
    "required": ["mood", "genres", "tone", "cognitive"]
  }
}
```

#### 출력 예시

```json
{
  "mood": "relaxed",
  "genres": ["sci-fi"],
  "tone": "light",
  "reference": ["Interstellar"],
  "priority": "visuals",
  "avoid": ["heavy_drama", "horror"],
  "era": "any",
  "cognitive": {
    "patience": "medium",
    "complexity": "low",
    "emotional_load": "medium",
    "visual_style": "cinematic",
    "cognitive_load": "low"
  }
}
```

---

### 3.2 Agent 2 — 서처

#### 역할

프로필 JSON을 기반으로 Azure AI Search에서 후보 영화를 검색하고, TMDB API로 메타데이터를 보강하여 후보 리스트를 생성한다.

#### 처리 과정

**Step 1: 프로필 → 검색 쿼리 변환**

프로필 JSON의 각 필드를 자연어 쿼리와 필터 조건으로 변환한다.

```python
# 쿼리 변환 예시
def build_search_query(profile):
    # 자연어 쿼리 (벡터 검색용)
    query_parts = []
    query_parts.append(f"{profile['mood']} 분위기의 {', '.join(profile['genres'])} 영화")
    if profile.get('reference'):
        query_parts.append(f"{', '.join(profile['reference'])}과 비슷한")
    if profile['cognitive']['visual_style'] == 'cinematic':
        query_parts.append("영상미가 뛰어난")
    
    search_query = ' '.join(query_parts)
    
    # 필터 조건 (시맨틱 검색용)
    filters = []
    if profile.get('avoid'):
        for item in profile['avoid']:
            filters.append(f"genre ne '{item}'")
    if profile['cognitive']['patience'] == 'low':
        filters.append("pacing eq 'fast'")
    if profile['cognitive']['complexity'] == 'low':
        filters.append("plot_complexity le 3")
    
    return search_query, ' and '.join(filters)
```

**Step 2: Azure AI Search 하이브리드 검색**

```python
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizableTextQuery

def search_movies(search_query, filters, top_k=15):
    vector_query = VectorizableTextQuery(
        text=search_query,
        k_nearest_neighbors=50,
        fields="overview_vector",
        exhaustive=True
    )
    
    results = search_client.search(
        search_text=search_query,
        vector_queries=[vector_query],
        filter=filters,
        query_type="semantic",
        semantic_configuration_name="movie-semantic-config",
        top=top_k,
        select="title,title_ko,year,genres,runtime,rating_imdb,overview,
                director,pacing,plot_complexity,emotional_intensity,
                visual_score,tmdb_id"
    )
    
    return list(results)
```

**Step 3: TMDB API 메타데이터 보강**

```python
import requests

def enrich_with_tmdb(candidates):
    for movie in candidates:
        tmdb_id = movie['tmdb_id']
        
        # 영화 상세 정보
        detail = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY, "language": "ko-KR"}
        ).json()
        
        # 예고편
        videos = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos",
            params={"api_key": TMDB_API_KEY}
        ).json()
        
        movie['poster_url'] = f"https://image.tmdb.org/t/p/w500{detail['poster_path']}"
        movie['trailer_url'] = next(
            (f"https://youtube.com/watch?v={v['key']}" 
             for v in videos.get('results', []) 
             if v['type'] == 'Trailer' and v['site'] == 'YouTube'),
            None
        )
    
    return candidates
```

#### Azure AI Search 인덱스 스키마

```json
{
  "name": "movies-index",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "title", "type": "Edm.String", "searchable": true },
    { "name": "title_ko", "type": "Edm.String", "searchable": true },
    { "name": "year", "type": "Edm.Int32", "filterable": true },
    { "name": "genres", "type": "Collection(Edm.String)", "filterable": true, "facetable": true },
    { "name": "runtime", "type": "Edm.Int32", "filterable": true },
    { "name": "rating_imdb", "type": "Edm.Double", "filterable": true, "sortable": true },
    { "name": "overview", "type": "Edm.String", "searchable": true },
    { "name": "overview_vector", "type": "Collection(Edm.Single)", "dimensions": 1536, "vectorSearchProfile": "movie-vector-profile" },
    { "name": "director", "type": "Edm.String", "searchable": true, "filterable": true },
    { "name": "tmdb_id", "type": "Edm.Int32" },
    
    { "name": "pacing", "type": "Edm.String", "filterable": true },
    { "name": "plot_complexity", "type": "Edm.Int32", "filterable": true },
    { "name": "emotional_intensity", "type": "Edm.Int32", "filterable": true },
    { "name": "visual_score", "type": "Edm.Double", "filterable": true },
    { "name": "sentiment_score", "type": "Edm.Double", "filterable": true }
  ],
  "vectorSearch": {
    "profiles": [
      {
        "name": "movie-vector-profile",
        "algorithmConfigurationName": "hnsw-config",
        "vectorizerName": "openai-vectorizer"
      }
    ],
    "algorithms": [
      {
        "name": "hnsw-config",
        "kind": "hnsw",
        "parameters": { "m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine" }
      }
    ],
    "vectorizers": [
      {
        "name": "openai-vectorizer",
        "kind": "azureOpenAI",
        "parameters": {
          "resourceUri": "<AZURE_OPENAI_ENDPOINT>",
          "deploymentId": "text-embedding-3-small",
          "modelName": "text-embedding-3-small"
        }
      }
    ]
  },
  "semantic": {
    "configurations": [
      {
        "name": "movie-semantic-config",
        "prioritizedFields": {
          "titleField": { "fieldName": "title_ko" },
          "contentFields": [{ "fieldName": "overview" }],
          "keywordsFields": [{ "fieldName": "genres" }, { "fieldName": "director" }]
        }
      }
    ]
  }
}
```

#### 인지적 속성 산출 방법

영화의 `pacing`, `plot_complexity`, `emotional_intensity` 등 인지적 속성은 인덱스 구축 시 다음 방법으로 생성한다.

| 속성 | 산출 방법 |
|------|----------|
| pacing | TMDB의 장르 + 런타임 조합으로 규칙 기반 분류, 이후 LLM 검증 |
| plot_complexity | LLM에 줄거리를 입력하여 1~5 척도로 평가 (배치 처리) |
| emotional_intensity | NSMC/IMDB 리뷰 감성 분석 결과의 분산값 활용 |
| visual_score | TMDB 인기도 + 촬영상 수상 이력 기반 가중 점수 |
| sentiment_score | 한국어 리뷰(NSMC) + 영문 리뷰(IMDB) 감성 분석 평균 |

---

### 3.3 Agent 3 — 큐레이터

#### 역할

후보 15편과 사용자 프로필을 함께 분석하여, **CoT(Chain of Thought) 추론**으로 인지 부하를 검증한 뒤 최종 3편을 선별하고 개인화된 추천 이유를 작성한다.

#### CoT 검증 로직

큐레이터는 각 후보 영화에 대해 다음과 같은 추론 체인을 실행한다.

```
[추론 예시]

후보: 테넷 (Tenet, 2020)
- 사용자 프로필: complexity=low, patience=medium, cognitive_load=low
- 영화 속성: plot_complexity=5, pacing=medium
- 판정: 사용자의 인지 부하 내성(low)과 영화의 복잡도(5/5)가 불일치.
  → 제외. 대체 후보 탐색.

후보: 그래비티 (Gravity, 2013)
- 사용자 프로필: complexity=low, visual_style=cinematic, mood=relaxed
- 영화 속성: plot_complexity=2, visual_score=0.95, pacing=fast
- 판정: 낮은 복잡도 + 높은 영상미 + 91분 부담 없는 런타임.
  → 채택. 추천 이유: 영상미 + 짧은 런타임 강조.
```

#### 시스템 프롬프트 핵심 지침

```
당신은 영화 큐레이터입니다. 후보 영화 리스트에서 최종 3편을 선별합니다.

## 선별 규칙
1. 각 후보에 대해 CoT 추론을 실행하여 사용자 프로필과의 적합도를 평가
2. 인지적 성향(cognitive 필드)과 영화 속성의 불일치가 있으면 제외
3. 최종 3편은 서로 다른 매력 포인트를 가져야 함 (다양성 확보)
4. 추천 이유는 사용자가 대화에서 사용한 표현을 반영하여 작성
5. "~하셨으니까", "~좋아하시잖아요" 등 대화체 유지

## CoT 추론 형식
각 후보에 대해:
- 사용자 인지 프로필 vs 영화 속성 비교
- 일치/불일치 판정
- 채택/제외 결정 및 근거

## 출력 형식
select_movies 함수를 호출하여 결과를 반환합니다.
```

#### Function Calling 스키마

```json
{
  "name": "select_movies",
  "description": "최종 추천 영화 3편을 선별합니다",
  "parameters": {
    "type": "object",
    "properties": {
      "recommendations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "title_ko": { "type": "string" },
            "year": { "type": "integer" },
            "reason": { "type": "string" },
            "cognitive_match": { "type": "string" },
            "poster_url": { "type": "string" },
            "trailer_url": { "type": "string" },
            "runtime": { "type": "integer" },
            "rating_imdb": { "type": "number" }
          }
        },
        "minItems": 3,
        "maxItems": 3
      },
      "reasoning_log": {
        "type": "string",
        "description": "CoT 추론 과정 전체 로그"
      }
    }
  }
}
```

#### 출력 예시

```json
{
  "recommendations": [
    {
      "title": "Gravity",
      "title_ko": "그래비티",
      "year": 2013,
      "reason": "인터스텔라를 좋아하신다면 이 영화의 우주 영상이 딱이에요. 91분으로 부담 없고, 시각적 몰입감이 대단합니다.",
      "cognitive_match": "complexity=low 충족, visual_score=0.95로 priority=visuals 충족, 런타임 91분으로 cognitive_load=low 적합",
      "poster_url": "https://image.tmdb.org/t/p/w500/...",
      "trailer_url": "https://youtube.com/watch?v=...",
      "runtime": 91,
      "rating_imdb": 7.7
    },
    {
      "title": "Arrival",
      "title_ko": "어라이벌",
      "year": 2016,
      "reason": "무겁지 않으면서도 여운이 남는 SF. 영상미가 독특하고, 피곤한 날 조용히 빠져들기 좋아요.",
      "cognitive_match": "complexity=medium이지만 tone=contemplative로 relaxed mood와 호환, emotional_load=medium 허용 범위",
      "poster_url": "https://image.tmdb.org/t/p/w500/...",
      "trailer_url": "https://youtube.com/watch?v=...",
      "runtime": 116,
      "rating_imdb": 7.9
    },
    {
      "title": "The Martian",
      "title_ko": "마션",
      "year": 2015,
      "reason": "가벼운 톤의 SF를 원하셨죠? 유머와 생존기가 섞여서 힘 뺄 때 보기 딱입니다.",
      "cognitive_match": "complexity=low, tone=light, pacing=medium — 전 항목 인지 프로필과 일치",
      "poster_url": "https://image.tmdb.org/t/p/w500/...",
      "trailer_url": "https://youtube.com/watch?v=...",
      "runtime": 144,
      "rating_imdb": 8.0
    }
  ],
  "reasoning_log": "테넷: complexity=5 vs user=low → 제외 / 인셉션: complexity=4 → 제외 / 그래비티: complexity=2, visual=0.95 → 채택 ..."
}
```

---

## 4. 데이터 파이프라인

### 4.1 데이터 소스

| 소스 | 용도 | 규모 |
|------|------|------|
| TMDB API | 영화 메타데이터 (줄거리, 장르, 포스터, 예고편, 출연진) | ~50만 편 (필요한 만큼 수집) |
| NSMC | 한국어 리뷰 감성 분석 → sentiment_score 산출 | 20만 리뷰 |
| IMDB 50K Reviews | 영문 리뷰 감성 분석 → sentiment_score 보강 | 5만 리뷰 |
| LLM 배치 평가 | plot_complexity, pacing 등 인지적 속성 생성 | 대상 영화 전체 |

### 4.2 인덱스 구축 파이프라인

```
TMDB API 수집 (메타데이터)
    │
    ├─→ 줄거리 텍스트 → text-embedding-3-small → overview_vector
    │
    ├─→ 줄거리 + 장르 → GPT-4.1-mini 배치 → pacing, plot_complexity 산출
    │
    ├─→ NSMC/IMDB 리뷰 매칭 → 감성 분석 → sentiment_score
    │
    └─→ 전체 필드 조합 → Azure AI Search 인덱스 업로드
```

### 4.3 초기 데이터셋 구축 (MVP)

MVP 단계에서는 전체 TMDB를 수집하지 않고, 다음 기준으로 약 **2,000~3,000편**을 선별한다.

- IMDB 평점 6.0 이상
- 2000년 이후 개봉
- 한국어 제목 존재 (TMDB ko-KR 지원)
- 주요 장르 커버: 액션, SF, 드라마, 코미디, 로맨스, 스릴러, 공포, 애니메이션

---

## 5. 프론트엔드

### 5.1 개발 단계

| 단계 | 기술 | 목적 |
|------|------|------|
| Phase 1 (프로토타입) | Jupyter Notebook + Gradio | 에이전트 파이프라인 검증, 빠른 데모 |
| Phase 2 (웹 전환) | React + HTML/CSS | 실제 서비스 수준 UI |

### 5.2 주요 UI 컴포넌트

**채팅 인터페이스**
- 프로파일러와의 대화 표시
- 사용자 입력 + 디핑 응답 버블
- 타이핑 인디케이터

**영화 추천 카드**
- 포스터 이미지 (TMDB)
- 한국어/영어 제목, 장르, 런타임, 평점
- 개인화된 추천 이유 텍스트
- 예고편 YouTube 임베드 또는 링크
- 인지적 적합도 표시 (선택적)

**후속 대화**
- 추천 결과에 대한 추가 질문 지원
- "다른 추천 받기" 기능
- 예고편 바로 보기

---

## 6. 평가 지표

### 6.1 시스템 품질 지표

| 지표 | 설명 | 측정 방법 |
|------|------|----------|
| 검색 정확도 | 프로필 기반 검색이 관련 영화를 반환하는지 | 수동 평가 (팀원 교차 검증) |
| CoT 검증 정확도 | 큐레이터의 제외/채택 판단이 합리적인지 | reasoning_log 수동 검토 |
| 응답 시간 | 전체 파이프라인 (입력 → 추천 카드) 소요 시간 | 목표: 10초 이내 |

### 6.2 추천 품질 지표 (C-DMRS 차용)

| 지표 | 설명 | 측정 방법 |
|------|------|----------|
| Groundedness (HHEM) | 추천된 영화가 실존하는 데이터인지 검증 | TMDB API 교차 확인 |
| 인지 적합도 | 추천 영화의 인지 속성이 사용자 프로필과 일치하는 비율 | 자동 계산 가능 |
| 사용자 만족도 | 추천 결과에 대한 주관적 평가 | 데모 시 설문 (1~5점) |

### 6.3 시뮬레이션 비교 (선택적)

인지적 성향 반영 전후의 추천 품질 차이를 비교한다.

- **Baseline**: 장르 + 평점만으로 추천 (cognitive 필드 무시)
- **Deping**: 장르 + 평점 + 인지적 성향 반영 추천
- **비교 항목**: 추천 목록의 중복률, 인지 속성 불일치 건수, 사용자 만족도 차이

---

## 7. 개발 로드맵

### Phase 1 — 데이터 기반 구축 (1주)

- [ ] TMDB API 수집 스크립트 작성 (2,000~3,000편)
- [ ] LLM 배치로 인지적 속성 (pacing, plot_complexity 등) 생성
- [ ] NSMC 감성 분석 → sentiment_score 산출
- [ ] Azure AI Search 인덱스 스키마 생성 및 데이터 업로드

### Phase 2 — 에이전트 파이프라인 구축 (1~2주)

- [ ] Agent 1 프로파일러: 시스템 프롬프트 + Function Calling 구현
- [ ] Agent 2 서처: 프로필 → 쿼리 변환 + 하이브리드 검색 로직
- [ ] Agent 3 큐레이터: CoT 검증 + 추천 이유 생성
- [ ] 3 에이전트 파이프라인 연결 및 통합 테스트
- [ ] Gradio/Jupyter 프로토타입 데모

### Phase 3 — 웹 UI 및 고도화 (1~2주)

- [ ] React 채팅 인터페이스 구현
- [ ] 영화 추천 카드 컴포넌트 (포스터 + 예고편)
- [ ] Baseline vs Deping 비교 시뮬레이션
- [ ] 반응형 레이아웃 및 최종 데모 준비

### 향후 확장 (MVP 이후)

- 사용자별 히스토리 저장 및 개인화 고도화
- 실시간 데이터 파이프라인 (Azure Data Factory)
- 협업 필터링 (유사 사용자 기반 추천) 추가
- 푸시 알림 및 리텐션 최적화

---

## 8. 팀 역할 분담 (제안)

| 영역 | 주요 작업 |
|------|----------|
| 데이터/인덱스 | TMDB 수집, NSMC 분석, AI Search 인덱스 구축 |
| 에이전트 개발 | Agent 1/2/3 프롬프트, Function Calling, 파이프라인 |
| 프론트엔드 | Gradio 프로토타입, React 웹 UI |
| 평가/발표 | 비교 시뮬레이션, 데모 시나리오, 발표 자료 |

---

## 부록: 참고 데이터 소스

### 해외 리뷰 데이터

- Kaggle IMDB 50K Movie Reviews: https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews
- Hugging Face Rotten Tomatoes: https://huggingface.co/datasets/cornell-movie-review-data/rotten_tomatoes
- Letterboxd Ratings (Kaggle): https://www.kaggle.com/datasets/samlearner/letterboxd-movie-ratings-data

### 국내 리뷰 데이터

- Korean Movie Review 30K (BERT): https://kaggle.com/datasets/suminwang/korean-movie-review-data-30kbert
- Naver Movie Review Dataset: https://www.kaggle.com/datasets/soohyun/naver-movie-review-dataset
- NSMC (Naver Sentiment Movie Corpus): https://github.com/e9t/nsmc
