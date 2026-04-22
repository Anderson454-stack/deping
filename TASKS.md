# Deping (디핑) — TASKS.md

> 현재 작업 상태만 관리합니다.
> 마지막 정리: 2026-04-21

---

## 현재 상태

- Agent 1, Agent 2, Agent 3 기본 파이프라인은 연결됨
- Dashboard, ChatGuide, CardSelector, Recommendation UI는 동작 중
- Azure AI Search는 기본 검색까지 연결됐고 고도화는 남아 있음
- Azure AI Search 직접 push 업로드로 `indextest1` 2,367건 적재 완료
- searcher hybrid search 연동 완료
- query-side embedding 경로 정상화 완료
- hybrid vs keyword 비교 로그 생성 완료
- searcher → curator 전달 검증 완료
- `/api/recommend` 서비스 경로가 `run_searcher()` → hybrid search → curator로 연결됨 확인 완료
- 루트 `.env`의 `AZURE_SEARCH_INDEX_NAME=indextest1` 사용 확인 완료
- Azure OpenAI `gpt-5.4` profiler/curator 실호출 정상 확인 완료
- `/api/chat` profiler, `/api/recommend` curator의 Azure OpenAI 실호출 로그 재확인 완료
- ngrok 기반 외부 접속 흐름은 정리됨
- profile schema raw numeric 계약과 searcher normalizer 경로는 정리 완료
- `/api/chat`, `/api/recommend`의 Azure OpenAI `gpt-5-chat` 실호출은 확인 완료
- Agent 3 `/api/recommend`는 `response_format=json_schema`, `finish_reason` 로깅, retry/fallback 방어를 반영했고 STEP0 프로필 기준 E2E 검증 완료
- raw + labels 병행 구조와 profiler/searcher 디버깅 로그 경로는 정리 완료
- `mood/energy`는 keyword baseline search query에 실제 반영되고 있음
- STEP0 baseline 평가셋과 실행 스크립트 골격 생성 완료
- baseline 첫 실행 결과와 discrimination/bias 리포트 생성 완료
- `/journal` 페이지는 달력 뷰로 구현 완료
- Journal은 저장한 영화를 날짜별로 묶어 월 이동, 날짜 선택, 선택 날짜 상세 목록 확인이 가능함
- 추천 카드 하트 저장과 Journal 달력 데이터는 `deping_journal` localStorage 기준으로 연결됨
- `MovieDetail` 페이지는 백엔드 `/api/movies/{tmdb_id}` 연동으로 상세 데이터 fetch가 가능함
- `MovieDetail`에서 Journal 저장/해제와 1~5점 평점 기록이 가능함
- 추천 카드 3편 렌더링 정상 확인 완료
- ngrok 외부 접속 기준 추천 카드 렌더링 정상 확인 완료
- 박스오피스 카드와 영화 상세에서 영화관 예매 링크 이동이 가능함
- `MovieDetail`는 라우터 state/Journal/API를 함께 쓰는 fallback-first 방식으로 안정화되어, 일부 필드 누락 시에도 상세 화면이 유지됨
- Journal 또는 Recommended Previously에서 진입한 영화도 저장된 기본 정보로 상세 진입이 가능하고, 포스터 실패 시 placeholder로 대체됨
- 비상영작 감상 정보는 TMDB watch providers 연동이 가능하며, 고정 curated 영화는 수동 OTT 링크가 TMDB fallback보다 우선함
- 추천 결과와 Journal fallback 경로에서 감독/배우/줄거리/장르를 함께 보존하도록 정리되어 `Recommended by Deeping` 상세에서도 배우 정보 확인이 가능함
- 박스오피스 영화는 KOBIS 영화상세 기준의 감독/배우/장르/상영시간을 우선 보강해 `MovieDetail`에서 추가 정보를 확인할 수 있음
- `Dashboard`와 `Journal`는 상세보기 왕복 시 스크롤 위치와 선택 상태를 복원해 목록 탐색 흐름이 유지됨
- `Journal` Selected Day와 달력 썸네일은 기존 저장 데이터까지 포함해 포스터 URL을 복구해 표시함
- ChatGuide → 추천 카드 → MovieDetail → Journal 저장/반영 흐름 검증 완료
- `ChatGuide` 추천 직후 `deeping_rec_history` localStorage에 추천 이력이 저장되고, Dashboard `My Deeping`은 이 추천 이력을 1차 소스로 사용함
- `My Deeping`의 `Your Viewing DNA`와 `Active Pulse`는 더미 데이터 대신 실제 추천 이력 기반 rule-based 계산으로 동작함
- `/chatguide` 직접 진입 alias 경로와 `/chat` 기본 경로 모두 사용 가능
- 상단 네비게이션의 `Journal`은 준비중 상태가 제거되어 실제 활성 메뉴로 노출됨
- `CardSelector`는 영화/배우/감독을 각각 별도 화면으로 유지하되, 각 타입 안에서 stable shuffle 기반 랜덤 순서로 선택지가 노출됨
- `CardSelector`에서 카드를 선택하면 같은 타입의 연관 카드 3~5개가 선택 카드 바로 뒤에 추가되고, 선택 상태는 강한 붉은 강조로 표시됨
- profiler quick button 문구는 사용자 노출 전 한국어 UI 기준으로 정규화되어 `전개가 빠른` 같은 표현으로 교정됨
- 명시적 장르 의도(`genres`)가 profiler → normalizer → searcher 경로로 구조화되어 전달됨
- searcher는 명시 장르/회피 장르가 있을 때 refs보다 장르 의도를 우선 반영하도록 정리됨
- 대표 장르 10개 스모크 테스트에서 profiler/searcher 반영 및 후보군 정합성 검증 완료
- `data/processed/movies_index_enriched.json` 준비 완료
- cognitive 속성 생성 스크립트 `scripts/generate_cognitive_attributes.py` 실행 준비 완료

---

## 진행 중

- STEP0 baseline 품질 기준 고정
  - `evaluations/schema_notes.md`, `evaluations/test_profiles.json` 작성 완료
  - `evaluations/runs/2026-04-19_keyword.jsonl` 생성 완료
  - `evaluations/scoring_sheet.csv`, `evaluations/discrimination_report.md`, `evaluations/bias_report.md` 생성 완료
  - 다음은 팀 채점과 baseline score 집계

- `-1/-1` 감정군 세분화
  - `inner_need`, `temperature` 기반 분기 추가 완료
  - profiler의 약한 신호(`-1`, `1`)도 searcher query에 반영하도록 보강 완료
  - query와 후보군 수는 분리됐고, top 결과 품질 조정은 추가 검증 필요

- hybrid full pipeline 평가 실행 및 채점
  - `scripts/run_hybrid_eval.py` 실행 완료
  - `evaluations/runs/2026-04-21_hybrid_full.jsonl` 10개 프로필 산출 완료
  - `evaluations/hybrid_scoring_sheet.csv` 생성 완료
  - 다음은 팀 수동 채점

- keyword vs hybrid 비교 분석
  - `scripts/generate_comparison_report.py` 실행 완료
  - `evaluations/keyword_vs_hybrid_report.md` 생성 완료
  - 다음은 Step 0 hybrid 품질 해석 및 discrimination 비교 정리

- Azure AI Search 인덱스 후속 고도화
  - retrieval 단계 cognitive 필터는 완화 유지, null 처리는 rerank 중심으로 운영
  - null 문서는 retrieval에서 전면 배제하지 않고 rerank에서 0점 중립 처리
  - 서비스 경로는 이미 hybrid + vector query + semantic rerank 조합을 사용 중이며, 남은 작업은 품질 튜닝과 기준 정리

- 장르 의도 안정화 후속 점검
  - 대표 장르 10개 스모크 테스트 완료
  - negation/복합 장르/refs 우선순위 공통 실패 유형 수정 완료
  - 다음은 발표용 데모 시나리오 기준 결과 확인과 curator 품질 미세조정

- 영화 메타데이터 후속 보강
  - `data/processed/movies_index_enriched.json` 준비 완료
  - 다음은 `scripts/generate_cognitive_attributes.py`로 cognitive 필드 생성
  - 산출물 검증 후 검색/재정렬 경로 반영 범위를 결정

---

## 작업 기록

### 2026-04-21

- `/api/recommend` 서비스 경로가 `run_searcher()` → hybrid search → curator로 실제 연결되는지 검증 완료
- 루트 `.env`의 `AZURE_SEARCH_INDEX_NAME=indextest1` 사용 확인 완료
- Azure OpenAI `gpt-5.4` profiler/curator 실호출과 `/api/chat`, `/api/recommend` 정상 응답 재확인 완료
- ngrok 외부 접속 기준 추천 카드 3편 렌더링 정상 확인 완료
- ChatGuide → 추천 카드 → MovieDetail → Journal 저장/반영 흐름 검증 완료
- `/chatguide` alias 라우트 추가 및 직접 진입 가능 상태 확인 완료
- 명시적 장르 의도(`genres`)를 profiler → normalizer → searcher 경로로 구조화 전달하도록 보강 완료
- searcher query 조립 시 장르/회피 의도가 refs보다 우선되도록 정리 완료
- 대표 장르 10개 스모크 테스트 수행 완료
- `공포는 싫고 스릴러는 좋아요`, `범죄 스릴러나 추리물` 케이스의 공통 실패 유형 수정 완료
- `TASKS.md`, `CLAUDE.md`를 현재 검증 결과 기준으로 정리 완료
- `data/processed/movies_index_enriched.json` 준비 완료 및 cognitive 속성 생성 직전 상태 확인 완료
- Dashboard `My Deeping` 실데이터 연동 완료: `deeping_rec_history`를 1차 소스로 사용하고, 없을 때만 `deping_journal` fallback을 사용하도록 정리
- `frontend/src/utils/viewingDnaAnalyzer.js` 추가: 추천 영화 기준 DNA 태그 생성, 요약 문장 생성, Active Pulse 응집도 점수 계산 로직 분리
- `frontend/src/components/dashboard/ViewingDNA.jsx`에서 하드코딩 태그/84% 고정 점수를 제거하고 실데이터 기반 UI로 교체
- 장르 태그 인식 보강: 한국어 장르명, `멜로/로맨스`, `sf`, `sci-fi` 같은 변형도 흡수하고, 미매핑 장르는 `OO 중심` fallback 칩으로 표시

### 2026-04-19

- STEP0 baseline 평가셋 정리 완료
- `evaluations/runs/2026-04-19_keyword.jsonl` 생성 완료
- `evaluations/scoring_sheet.csv`, `evaluations/discrimination_report.md`, `evaluations/bias_report.md` 생성 완료

---

## 해야 할 일

- STEP0 scoring 수행 및 baseline score 집계
- `-1/-1` 분기 후 top 결과 품질 조정
- hybrid 후보군과 curator 최종 선택 품질 미세조정
- `movies_index_enriched.json` 기반 cognitive 속성 생성 및 결과 검증
- Agent 2에 서처 (GPT-4.1-mini) 추가 여부 결정 및 구현
- `/discover` 실제 페이지 구현

---

## 다음 액션

1. `evaluations/scoring_sheet.csv`를 기준으로 팀 채점을 진행한다.
2. `evaluations/hybrid_scoring_sheet.csv`를 기준으로 hybrid full pipeline 추천 30건을 채점한다.
3. 대표 장르 데모 시나리오 기준으로 curator 최종 3편 품질을 다시 점검한다.
4. `data/processed/movies_index_enriched.json`에 대해 `scripts/generate_cognitive_attributes.py`를 실행해 cognitive 필드를 채운다.
5. `evaluations/keyword_vs_hybrid_report.md`를 바탕으로 hybrid vs keyword 차이를 검토한 뒤 `scripts/aggregate_scores.py`와 동일한 방식의 hybrid 집계를 준비한다.

---

## 파일 정리 분류

### 보관용

- `deping_프로젝트_진행_정리임시.md`
  - 초기 프로젝트 기획/의사결정 기록으로 보관 가치가 있음

### 참고용

- `deping_integrated_architecture (1).md`
  - 통합 아키텍처 설명 문서로 참고용 가치가 있음
- `deping_개발_아키텍처ver1.md`
  - 초기 개발 아키텍처 버전 문서로 비교 참고 가능
- `notebooks/`
  - 현재 앱 런타임에는 직접 연결되지 않지만 데이터 구축 작업에 필요
- `scripts/`
  - 카드 데이터/인물 데이터 보강용 유틸 스크립트로 유지 필요

### 미사용

- 루트 `tmp_*` 파일들
  - 테스트/서버 실행 중 생성된 임시 로그 및 결과 산출물

---

## 최근 정리 결과

- 미사용 코드 `frontend/src/api/unused/analyzeInput.js` 삭제
- 중복 문서 `deping_프로젝트_진행_정리임시 copy.md` 삭제
- 루트 임시 산출물 `tmp_*` 삭제
- 루트 `tmp_*` 재생성 산출물이 추적되지 않도록 `.gitignore` 보강
- profile raw schema 확인용 문서 `docs/profile_schema.md` 추가
- searcher 입력 계약 정리를 위한 `backend/agents/profile_normalizer.py` 추가
- raw 숫자형 유지 + labels 병행 구조로 normalizer/searcher/debug 로그 보강
- GPT-5 실제 연결 여부 점검 문서 `docs/llm_connection_audit.md` 추가
- profiler output contract 수정으로 mood/energy 우선 반영 규칙 및 quickButtons 승격 보강
- searcher에 mood/energy query mapping 및 결과 로그 추가
- `-1/-1` 내부 세분화를 위해 `inner_need`/`temperature` 약한 신호 기반 query mapping 보강
- Azure AI Search 직접 push 업로드 스크립트 `scripts/upload_tmdb_movies_to_search.py` 및 정규화 로직 `backend/search_indexing.py` 추가
- `backend/search_service.py`에 query-side embedding 기반 hybrid search 기본 경로, embedding 검증 로직, keyword fallback 추가
- `scripts/verify_embedding.py` 추가 및 실제 embedding deployment 호출 성공 확인
- `scripts/compare_search_modes.py` 추가 및 hybrid/keyword 비교 산출물 생성
- `backend/agents/curator.py` 추가 및 `scripts/test_pipeline.py`로 stage별 pipeline 검증 경로 추가
- `scripts/run_hybrid_eval.py` 추가 및 `evaluations/runs/2026-04-21_hybrid_full.jsonl` 생성
- `scripts/generate_hybrid_scoring_sheet.py` 추가 및 `evaluations/hybrid_scoring_sheet.csv` 생성
- `scripts/generate_comparison_report.py` 추가 및 `evaluations/keyword_vs_hybrid_report.md` 생성
- retrieval 단계 cognitive 필터를 완화하고 searcher rerank에서 null을 0점 중립 처리하도록 조정
- `"나른하고 편안해요 🌿"`와 `"기분이 조금 가라앉아요 🌧️"`의 search query 분리 및 후보군 차이 확인
- STEP0 baseline 평가 파일 `evaluations/schema_notes.md`, `evaluations/test_profiles.json` 추가
- STEP0 실행 스크립트 `scripts/run_baseline_eval.py`, `scripts/generate_scoring_sheet.py`, `scripts/analyze_discrimination.py`, `scripts/analyze_baseline_bias.py`, `scripts/aggregate_scores.py` 추가
- baseline 첫 실행 결과 `evaluations/runs/2026-04-19_keyword.jsonl` 및 bias/discrimination 리포트 생성
- Agent 3 structured output 안정화 반영: `json_schema`, `finish_reason`, retry/fallback 로그, `overviews` 제거, STEP0 프로필 E2E 검증 완료
- `frontend/src/pages/Journal.jsx` 달력형 Journal 페이지 추가
- `frontend/src/hooks/useRecommendationHistory.js`에서 날짜별 Journal 저장 구조와 선택 날짜 상세 조회 흐름 보강
- 추천 카드 하트 액션으로 저장한 영화가 Journal 달력과 동일하게 연동되도록 연결
- `backend/main.py`의 `/api/movies/{tmdb_id}` 응답을 TMDB 상세 기준으로 보강하고 박스오피스 영화의 TMDB 매칭 데이터를 포함하도록 수정
- `frontend/src/pages/MovieDetail.jsx`에서 상세 fetch, Journal 저장/해제, 1~5점 평점, 예매 링크 UI를 연결
- `frontend/src/utils/theaterLinks.js` 추가 및 박스오피스/상세 화면에 영화관 링크 반영
- `frontend/src/pages/MovieDetail.jsx`를 fallback-first 방식으로 보강해 Recommended Previously/Journal 진입 시에도 기본 정보와 placeholder 포스터로 상세 화면이 유지되도록 수정
- `frontend/src/hooks/useRecommendationHistory.js`에서 Journal 저장 시 `tmdb_id`, `poster_path`, `release_date`, `source`, `rating` 등 상세 fallback용 필드를 안정적으로 보존하도록 보강
- `backend/main.py`에 TMDB watch providers(KR) 연동을 추가해 비상영작 감상처 정보를 상세 응답으로 제공하도록 수정
- `frontend/src/utils/ottLinks.js`의 고정 curated OTT 링크를 다시 우선 적용하고, 고정 목록에 없는 영화만 TMDB watch providers를 fallback으로 사용하도록 `MovieDetail` 분기 정리
- `backend/main.py`에서 KOBIS `searchMovieInfo`를 추가 연동해 박스오피스 영화의 감독/배우/장르/상영시간을 TMDB 매칭 데이터와 함께 보강
- `frontend/src/pages/ChatGuide.jsx`와 `frontend/src/hooks/useRecommendationHistory.js`에서 추천 결과/Journal 저장 시 배우, 감독, 줄거리, 장르, 포스터 정보를 더 많이 보존하도록 수정
- `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Journal.jsx`에 sessionStorage 기반 스크롤/선택 상태 복원을 추가해 상세 페이지 왕복 시 탐색 맥락이 유지되도록 수정
- `frontend/src/hooks/useRecommendationHistory.js`에서 기존 Journal localStorage 데이터도 포스터 URL을 복구하도록 정규화 로직 추가
- `frontend/src/hooks/useRecommendationHistory.js`에 Dashboard용 추천 이력 selector를 추가해 `deeping_rec_history` 우선, `deping_journal` fallback 흐름을 제공하도록 수정
- `frontend/src/utils/viewingDnaAnalyzer.js` 추가로 추천 이력 기반 DNA 태그/요약/응집도 계산 로직을 분리
- `frontend/src/components/dashboard/ViewingDNA.jsx`를 하드코딩 카드에서 실데이터 기반 카드로 전환하고, empty/low-data 상태를 별도 처리하도록 수정
- `frontend/src/components/layout/TopNavBar.jsx`, `frontend/src/components/layout/MobileDrawer.jsx`에서 `Journal` 메뉴의 `준비중` 표시 제거
- `frontend/src/pages/MovieDetail.jsx`에서 TMDB 감상처 문구를 정리하고 `Netflix Standard with Ads` 같은 중복 provider 라벨을 `Netflix`로 통합 표시하도록 수정
- `frontend/src/utils/ottLinks.js`에서 보호 대상 고정 OTT 링크 중 `토이 스토리`의 유튜브 영화 링크를 최신 값으로 업데이트
- `frontend/src/components/chat/CardSelector.jsx`에서 영화/배우/감독 카드 목록을 타입별 stable shuffle로 랜덤 정렬하고, 카드 선택 시 같은 타입의 연관 카드가 선택 카드 바로 뒤에 3~5개 추가되도록 보강
- `frontend/src/components/chat/CardSelector.jsx`에서 선택 카드에 붉은 강조 프레임과 `선택됨` 배지를 적용해 선택 상태를 더 명확하게 표시하도록 수정
- `frontend/src/components/OnboardingModal.jsx`, `frontend/src/pages/ChatGuide.jsx`의 카드 선택 흐름을 다시 단일 타입(영화/배우/감독 각각) 구조로 유지하도록 정리
- `backend/agents/profiler.py`에서 `botMessage`와 quick button 라벨의 UI 문구를 후처리 정규화해 `テンポ가 빠른`을 `전개가 빠른`으로 교정하도록 수정
- `frontend/src/App.jsx`에 `/chatguide` 경로를 `ChatGuide`로 연결하는 alias 라우트 추가
- hybrid 서비스 경로 실검증 완료: `/api/recommend`가 `indextest1` 인덱스에서 hybrid 검색 후 curator 추천 3편을 반환하는 것 확인
- ngrok 외부 접속 기준으로 추천 카드 렌더링 정상 확인
- Azure OpenAI `gpt-5.4` profiler/curator 실호출 로그 재검증 완료
- `backend/agents/profiler.py`에서 명시 장르 구조화(`genres`) 및 negation 처리 보강
- `backend/agents/searcher.py`에서 장르 우선 query 조립, 복합 장르 term, refs 우선순위 완화 반영
- 대표 장르 10개 스모크 테스트 수행 및 `공포는 싫고 스릴러는 좋아요`, `범죄 스릴러나 추리물` 공통 실패 유형 수정

---

## 보안 작업

> 마지막 정리: 2026-04-21

- 루트 `.gitignore`에 `.env`, `.env.*`, `.env.local` 패턴 확인/보강 완료
- Git 히스토리 기준 루트 `.env` 커밋 이력 없음 확인 완료
- 프론트 직통 Azure 호출 잔재 `frontend/src/api/analyzeInput.js` 삭제 완료
- 프론트 `VITE_` 노출 변수는 `VITE_API_BASE_URL` 중심 구조만 유지됨 확인 완료
- `backend/main.py` CORS를 localhost + `ALLOWED_ORIGIN` 제한 구조로 변경 완료
- `backend/models/` 패키지 추가 후 `/api/chat`, `/api/recommend`, 고급 검색 입력 스키마 분리 완료
- `/api/chat` 메시지 2000자 제한, 앱 레벨 1MB 요청 바디 제한 미들웨어 추가 완료
- `/api/chat` 20/minute, `/api/recommend` 10/minute rate limit 추가 완료
- 글로벌 예외 핸들러, 일반화된 에러 응답, 보안 헤더 미들웨어 추가 완료
- 빌드 산출물 `frontend/dist/` 재검사 기준 API 키/시크릿 흔적 없음 확인 완료
- XSS 조사 결과 `dangerouslySetInnerHTML`/raw HTML 렌더링 경로 없음 확인 완료
- Journal/localStorage 구조는 `deping_journal` 날짜별 엔트리 유지, 저장 범위도 최소 필드 중심 유지 확인 완료
- 의존성 감사 결과 파일 `audit_frontend.txt`, `audit_backend.txt` 생성 완료
- 후속 보안 과제:
  - CSP 적용 가능성 검토 계속
  - 프록시/인프라 레벨 rate limiting 이관 검토
  - secret scan 자동화 도입 검토
  - 인증 도입 시 권한 검증 계층 설계 필요

---

## 메모

- 오래 끝난 항목은 이 파일에서 제거하고 `CLAUDE.md`로 옮기지 않음
- 고정 규칙, 명령, 금지사항은 `CLAUDE.md`에서만 관리
