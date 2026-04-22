# Claude Code 인계 작업서 — 영화 데이터 JSON 통합

> 작성일: 2026-04-21
> 작업 범위: xlsx 최종본 → JSON 변환 파일을 프로젝트에 배치하고 기존 코드와 연결

---

## 배경

`f_tmdb_2000_2020_with_reviews_FINAL.xlsx`(2,709편)를 JSON으로 변환 완료.
두 개의 JSON 파일이 생성되었으며, 프로젝트 `data/processed/`에 배치하고
기존 백엔드/노트북 코드에서 참조할 수 있도록 연결해야 한다.

---

## 생성된 파일

### 1. `movies_final.json` (11.8 MB, 2,709 records)

전체 데이터 원본 변환. `generated_reviews` 포함.

```jsonc
{
  "title": "왕의 남자",           // 한국어 제목
  "original_title": "왕의 남자",  // TMDB original_title
  "release_date": "2005-12-29",
  "audience_count": 10502326,     // 누적관객수
  "tmdb_id": 45035,               // null 가능 (64편은 KOBIS-only)
  "overview": "조선시대 연산조...",
  "vote_average": 6.9,
  "vote_count": 113,
  "director": "이준익",
  "cast": ["감우성", "이준기", "정진영", "강성연", "유해진"],
  "poster_url": "https://image.tmdb.org/t/p/w500/...",
  "genres": ["드라마", "역사", "스릴러"],
  "runtime": 119,
  "keywords": ["friendship", "jealousy", ...],
  "generated_reviews": [           // [SEP] 기준 split, 마크다운 헤더 제거
    "1. (20대 여성) \"왕의 남자\"를 보고 나서...",
    "2. (30대 남성) \"왕의 남자\"는 역사적 배경을...",
    ...
  ]
}
```

### 2. `movies_index_ready.json` (4.4 MB, 2,709 records)

Azure AI Search 인덱스 업로드용. reviews 제외, cognitive 필드는 null.

```jsonc
{
  "id": "45035",                  // tmdb_id 문자열. KOBIS-only는 "kobis_N"
  "title": "왕의 남자",
  "title_ko": "왕의 남자",
  "year": 2005,
  "genres": ["드라마", "역사", "스릴러"],
  "runtime": 119,
  "rating_imdb": 6.9,             // TMDB vote_average 매핑
  "overview": "조선시대 연산조...",
  "director": "이준익",
  "tmdb_id": 45035,
  "cast": ["감우성", "이준기", ...],
  "poster_url": "https://image.tmdb.org/t/p/w500/...",
  "keywords": ["friendship", ...],
  "audience_count": 10502326,
  // cognitive fields — LLM 배치 후 채움
  "pacing": null,
  "plot_complexity": null,
  "emotional_intensity": null,
  "visual_score": null,
  "sentiment_score": null
}
```

---

## 작업 항목

### STEP 1: 파일 배치

```bash
# 프로젝트 루트 기준
mkdir -p data/processed

# 두 JSON 파일을 data/processed/에 복사
cp movies_final.json       D:\deping\data\processed\movies_final.json
cp movies_index_ready.json D:\deping\data\processed\movies_index_ready.json
```

`.gitignore`에 대용량 JSON 추적 여부를 확인할 것.
- `movies_final.json`은 11.8MB로 Git에 올리기엔 큼 → `.gitignore`에 추가하거나 Git LFS 사용 권장
- `movies_index_ready.json`은 4.4MB로 경계선 → 팀 판단

### STEP 2: 기존 코드 연결점 확인

아래 파일들이 영화 데이터를 참조하는 주요 지점이다. 각각에서 새 JSON을 인식하도록 경로를 확인/수정한다.

| 파일 | 현재 상태 | 필요한 작업 |
|------|----------|-----------|
| `notebooks/03_build_index.ipynb` | AI Search 인덱스 구축 노트북 | `movies_index_ready.json`을 로드 소스로 지정. cognitive 필드 null → LLM 배치로 채우는 셀 추가 |
| `backend/agents/searcher.py` | keyword baseline 검색 중 | 현재 검색 대상이 이 인덱스의 필드와 매핑되는지 확인 |
| `backend/main.py` | `/api/movies/{tmdb_id}` 엔드포인트 | TMDB API fallback 외에 로컬 JSON lookup 옵션 고려 가능 (선택) |

### STEP 3: AI Search 인덱스 업로드 준비

`movies_index_ready.json`을 Azure AI Search에 업로드하려면:

1. **overview_vector 생성**: `overview` 필드를 `text-embedding-3-small`로 임베딩 (1536차원)
2. **cognitive 필드 채우기**: `pacing`, `plot_complexity`, `emotional_intensity`, `visual_score`, `sentiment_score`를 GPT-4.1-mini 배치로 생성
3. **인덱스 업로드**: `azure-search-documents` SDK로 `movies-index`에 업로드

이 작업은 `notebooks/03_build_index.ipynb`에서 수행.
인덱스 스키마는 `deping_integrated_architecture.md`의 Azure AI Search 인덱스 스키마와 동일한 필드를 따른다.

### STEP 4: KOBIS-only 레코드 처리

tmdb_id가 null인 64편은 `id`가 `"kobis_N"` 형식이다.

- 이 레코드들은 `poster_url`, `overview`, `vote_average`, `runtime` 등이 null일 수 있음
- TMDB API 보강 로직에서 이 레코드들은 skip 처리
- AI Search 인덱스에는 포함하되, overview_vector가 없으면 벡터 검색 대상에서 자연 제외됨
- 필요하면 TMDB 검색 API(`/3/search/movie`)로 title 기반 매칭 시도 가능 (선택)

---

## 원본 xlsx 컬럼 → JSON 필드 매핑 참조

| xlsx 컬럼 | movies_final.json | movies_index_ready.json |
|-----------|-------------------|------------------------|
| title | title | title_ko |
| original_title | original_title | title |
| release_date | release_date | year (연도만 추출) |
| 누적관객수 | audience_count | audience_count |
| tmdb_id | tmdb_id | tmdb_id + id |
| overview | overview | overview |
| vote_average | vote_average | rating_imdb |
| vote_count | vote_count | — |
| director | director | director |
| cast_top5 | cast[] | cast[] |
| poster_url | poster_url | poster_url |
| genres | genres[] | genres[] |
| runtime | runtime | runtime |
| keywords | keywords[] | keywords[] |
| generated_reviews | generated_reviews[] | — |

---

## 데이터 품질 요약

| 항목 | 수치 |
|------|------|
| 전체 레코드 | 2,709 |
| tmdb_id 있음 | 2,645 |
| tmdb_id 없음 (KOBIS-only) | 64 |
| overview 있음 | 2,630 |
| keywords 있음 | 2,304 |
| cast 있음 | 2,631 |
| director 있음 | 2,703 |
| generated_reviews 있음 | 2,709 (전체) |
| 평균 리뷰 수/영화 | 4.7개 |

---

## 주의사항

- `CLAUDE.md`의 아키텍처 원칙을 따를 것: 루트 `.env` 단일 사용, 백엔드 경유 방식 유지
- `movies_index_ready.json`의 `rating_imdb` 필드명은 아키텍처 문서의 인덱스 스키마와 맞춤 — 실제 값은 TMDB vote_average
- `genres`는 한국어 장르명 (드라마, 액션, SF 등). AI Search 필터 조건에서 한국어 매칭이 필요
- `keywords`는 영문. 벡터 검색에는 유리하나 시맨틱 필터에서 언어 불일치 주의
