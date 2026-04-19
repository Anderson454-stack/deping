import asyncio
import json
import logging
import os
import random
import requests
import httpx
import time
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from openai import OpenAI
from pydantic import BaseModel
from agents.profiler import call_profiler
from agents.searcher import run_searcher
from search_service import search_movies

# 프로젝트 루트 .env 로드 (D:/deping/.env)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="Deping Backend")
logger = logging.getLogger("deping.backend")

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def private_network_access_middleware(request: Request, call_next):
    """Chrome PNA preflight 대응 (ngrok HTTPS → localhost 차단 방지)"""
    if (
        request.method == "OPTIONS"
        and request.headers.get("access-control-request-private-network")
    ):
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Private-Network": "true",
            },
        )
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


# ── 영화 풀 (서버 시작 시 1회 로드) ──────────────────────────
_BASE_DIR = Path(__file__).resolve().parent.parent
_MOVIE_POOL_CANDIDATES = [
    _BASE_DIR / "notebooks/data/processed/tmdb_data_mis.json",
    _BASE_DIR / "notebooks/data/raw/tmdb_matched_movies_with_reviews_scored_v3.json",
    _BASE_DIR / "notebooks/data/processed/tmdb_movies_kr_with_credits_keywords.json",
]
_movie_pool: list[dict] | None = None


def _get_movie_pool() -> list[dict]:
    global _movie_pool
    if _movie_pool is None:
        raw = None
        for path in _MOVIE_POOL_CANDIDATES:
            if path.exists():
                with open(path, encoding="utf-8") as f:
                    raw = json.load(f)
                print(f"[Deping] 영화 풀 로드: {path.name} ({len(raw)}편)")
                break
        if raw is None:
            print("[Deping] 경고: 영화 데이터 파일을 찾을 수 없습니다. 빈 목록으로 대체합니다.")
            raw = []
        _movie_pool = [
            {
                "tmdb_id": m.get("tmdb_id"),
                "title": m.get("title_ko") or m.get("title", ""),
                "title_ko": m.get("title_ko") or m.get("title", ""),
                "poster_url": m.get("poster_url"),
                "overview": m.get("overview", ""),
                "vote_average": m.get("vote_average"),
                "director": m.get("director", ""),
                "actors": (m.get("actors") or [])[:3],
                "year": m.get("year", ""),
                "genres": m.get("genres") or [],
            }
            for m in raw
            if m.get("poster_url")
        ]
    return _movie_pool


def _get_movie_lookup() -> dict[int, dict]:
    return {
        movie["tmdb_id"]: movie
        for movie in _get_movie_pool()
        if movie.get("tmdb_id") is not None
    }


def _enrich_movie_from_pool(movie: dict) -> dict:
    tmdb_id = movie.get("tmdb_id")
    if tmdb_id is None:
        return movie

    base = _get_movie_lookup().get(tmdb_id)
    if not base:
        return movie

    enriched = dict(base)
    enriched.update({k: v for k, v in movie.items() if v not in (None, "", [])})
    if not enriched.get("title_ko"):
        enriched["title_ko"] = enriched.get("title")
    return enriched


async def _fetch_tmdb_movie_detail(tmdb_id: int) -> dict | None:
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    if not tmdb_key:
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TMDB_BASE}/movie/{tmdb_id}",
                params={"api_key": tmdb_key, "language": "ko-KR"},
                timeout=6.0,
            )
        if resp.status_code != 200:
            return None

        movie = resp.json()
        poster_path = movie.get("poster_path")
        return {
            "tmdb_id": movie.get("id"),
            "title": movie.get("title") or movie.get("original_title", ""),
            "title_ko": movie.get("title") or movie.get("original_title", ""),
            "poster_url": TMDB_IMAGE_BASE + poster_path if poster_path else None,
            "overview": movie.get("overview", ""),
            "vote_average": movie.get("vote_average"),
            "year": (movie.get("release_date") or "")[:4],
            "genres": [genre.get("name") for genre in movie.get("genres", []) if genre.get("name")],
        }
    except Exception:
        return None


async def _build_theme_movies(movie_ids: list[int]) -> list[dict]:
    lookup = _get_movie_lookup()
    movies: list[dict] = []
    missing_ids: list[int] = []

    for tmdb_id in movie_ids:
        movie = lookup.get(tmdb_id)
        if movie:
            movies.append(movie)
        else:
            missing_ids.append(tmdb_id)

    if missing_ids:
        fetched = await asyncio.gather(*[_fetch_tmdb_movie_detail(tmdb_id) for tmdb_id in missing_ids])
        fetched_lookup = {
            movie["tmdb_id"]: movie
            for movie in fetched
            if movie and movie.get("tmdb_id") is not None
        }
        for tmdb_id in movie_ids:
            fetched_movie = fetched_lookup.get(tmdb_id)
            if fetched_movie and not any(m.get("tmdb_id") == tmdb_id for m in movies):
                movies.append(fetched_movie)

    ordered_lookup = {
        movie["tmdb_id"]: movie
        for movie in movies
        if movie.get("tmdb_id") is not None
    }
    return [ordered_lookup[tmdb_id] for tmdb_id in movie_ids if tmdb_id in ordered_lookup]


# ── 박스오피스 캐시 ─────────────────────────────────────────────
# data:            현재 캐시 (TTL 만료 시 백그라운드 갱신)
# expires:         만료 시각
# last_successful: 마지막 성공 데이터 — 영구 보관, KOBIS 실패 시 즉시 폴백
# refreshing:      백그라운드 갱신 중 플래그 (중복 갱신 방지)
_boxoffice_cache: dict = {
    "data": None,
    "expires": None,
    "last_successful": None,
    "refreshing": False,
}

KOBIS_URL      = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json"
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_IMG_BASE  = "https://image.tmdb.org/t/p/w500"

# ── 카드 선택용 상수 ─────────────────────────────────────────
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# 감독 TMDB person ID 목록 (봉준호, 놀란, 박찬욱, 드니 빌뇌브, 웨스 앤더슨,
#   마틴 스코세이지, 리들리 스콧, 나홍진, 이창동, 스티븐 스필버그)
DIRECTOR_IDS = [21684, 525, 5765, 137427, 10000, 1032, 578, 55640, 19074, 488]

MONTHLY_THEME_CONFIG = {
    5: {
        "month": 5,
        "title": "어린이날 특선",
        "message": "5월 어린이날, 다시 한번 동심의 세계로 날아가볼까요?",
        "emoji": "🎠",
        "tmdb_ids": [862, 863, 10193, 24428, 277834, 8392, 9502, 354912, 14160, 12],
    }
}


async def _fetch_kobis_boxoffice() -> list[dict] | None:
    """
    KOBIS 일별 박스오피스 비동기 호출.
    timeout=5s, 실패 시 None 반환 (절대 예외 전파 안 함).
    성공 시 TMDB 포스터를 병렬로 가져온다.
    """
    kobis_key = os.getenv("KOBIS_API_KEY", "")
    tmdb_key  = os.getenv("TMDB_API_KEY", "")
    if not kobis_key:
        return None

    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                KOBIS_URL,
                params={"key": kobis_key, "targetDt": yesterday},
                timeout=5.0,
            )
        items = resp.json()["boxOfficeResult"]["dailyBoxOfficeList"][:10]
    except Exception as e:
        print(f"[Deping] KOBIS timeout, using fallback: {e}")
        return None

    # TMDB 포스터 병렬 조회
    async def _poster(client: httpx.AsyncClient, title: str) -> str | None:
        try:
            r = await client.get(
                TMDB_SEARCH_URL,
                params={"query": title, "language": "ko-KR", "api_key": tmdb_key},
                timeout=4.0,
            )
            results = r.json().get("results", [])
            if results and results[0].get("poster_path"):
                return TMDB_IMG_BASE + results[0]["poster_path"]
        except Exception:
            pass
        return None

    if tmdb_key:
        async with httpx.AsyncClient() as client:
            posters = await asyncio.gather(*[_poster(client, it["movieNm"]) for it in items])
    else:
        posters = [None] * len(items)

    return [
        {
            "rank": int(it["rank"]),
            "title": it["movieNm"],
            "audience_acc": int(it["audiAcc"]),
            "audience_today": int(it["audiCnt"]),
            "poster_url": poster,
            "source": "kobis",
        }
        for it, poster in zip(items, posters)
    ]


async def _fetch_tmdb_nowplaying() -> list[dict]:
    """
    KOBIS 완전 실패 시 TMDB now_playing 폴백.
    반환 형식을 박스오피스 카드와 호환되게 맞춘다.
    """
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    if not tmdb_key:
        # TMDB 키도 없으면 로컬 풀 상위 10편
        pool  = _get_movie_pool()
        top10 = sorted(pool, key=lambda x: x.get("vote_average") or 0, reverse=True)[:10]
        return [
            {
                "rank": i + 1,
                "title": m["title"],
                "audience_acc": None,
                "audience_today": None,
                "poster_url": m.get("poster_url"),
                "source": "local",
            }
            for i, m in enumerate(top10)
        ]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TMDB_BASE}/movie/now_playing",
                params={"api_key": tmdb_key, "language": "ko-KR", "region": "KR", "page": 1},
                timeout=6.0,
            )
        movies = [m for m in resp.json().get("results", []) if m.get("poster_path")][:10]
        return [
            {
                "rank": i + 1,
                "title": m.get("title") or m.get("original_title", ""),
                "audience_acc": None,
                "audience_today": None,
                "poster_url": TMDB_IMAGE_BASE + m["poster_path"],
                "tmdb_id": m["id"],
                "source": "tmdb",
            }
            for i, m in enumerate(movies)
        ]
    except Exception:
        return []


async def _refresh_boxoffice_bg() -> None:
    """백그라운드 KOBIS 캐시 갱신 — 사용자를 기다리게 하지 않음."""
    if _boxoffice_cache["refreshing"]:
        return
    _boxoffice_cache["refreshing"] = True
    try:
        data = await _fetch_kobis_boxoffice()
        if data:
            now = datetime.now()
            _boxoffice_cache["data"]            = data
            _boxoffice_cache["expires"]         = now + timedelta(hours=24)
            _boxoffice_cache["last_successful"] = data
            print("[Deping] 박스오피스 캐시 백그라운드 갱신 완료")
    except Exception as e:
        print(f"[Deping] 백그라운드 갱신 실패: {e}")
    finally:
        _boxoffice_cache["refreshing"] = False


# ── 엔드포인트 ────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Deping Backend가 정상적으로 실행 중입니다!", "status": "ok"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/boxoffice/daily")
async def boxoffice_daily(background_tasks: BackgroundTasks):
    """
    KOBIS 일별 박스오피스 TOP 10.
    1) 캐시 유효 → 즉시 반환
    2) 캐시 만료 + last_successful 존재 → 즉시 반환 & 백그라운드 갱신 예약
    3) 첫 호출 or last_successful 없음 → KOBIS 직접 호출 (5s timeout)
       실패 시 → TMDB now_playing 폴백
    절대 500 에러 내지 않음.
    """
    now = datetime.now()

    # ① 캐시 유효
    if _boxoffice_cache["data"] and _boxoffice_cache["expires"] and now < _boxoffice_cache["expires"]:
        return _boxoffice_cache["data"]

    # ② 캐시 만료 but 이전 성공 데이터 존재 → 즉시 반환 + 백그라운드 갱신
    if _boxoffice_cache["last_successful"]:
        background_tasks.add_task(_refresh_boxoffice_bg)
        return _boxoffice_cache["last_successful"]

    # ③ 첫 호출 — KOBIS 직접 호출
    data = await _fetch_kobis_boxoffice()
    if data:
        _boxoffice_cache["data"]            = data
        _boxoffice_cache["expires"]         = now + timedelta(hours=24)
        _boxoffice_cache["last_successful"] = data
        return data

    # ④ KOBIS 실패 → TMDB now_playing 폴백
    print("[Deping] KOBIS 실패, TMDB now_playing 폴백 사용")
    fallback = await _fetch_tmdb_nowplaying()
    return fallback


@app.get("/api/movies/community")
def movies_community(keywords: str = "", count: int = 6):
    """
    Viewing DNA 키워드와 유사한 영화 반환.
    keywords: 콤마 구분 문자열 (ex. 'noir,crime,revenge')
    키워드 없으면 랜덤 반환.
    """
    # /api/movies/{tmdb_id} 보다 먼저 등록 필요
    pool = _get_movie_pool()
    count = max(1, min(count, 20))

    if not keywords.strip():
        return random.sample(pool, min(count, len(pool)))

    kw_list = [k.strip().lower() for k in keywords.split(",") if k.strip()]

    def score(movie):
        movie_kws = [k.lower() for k in (movie.get("keywords") or [])]
        return sum(1 for k in kw_list if k in movie_kws)

    scored = sorted(pool, key=score, reverse=True)
    top = [m for m in scored if score(m) > 0][:max(count * 3, 20)]
    if len(top) < count:
        top = scored  # 매칭 없으면 전체에서 샘플링
    return random.sample(top, min(count, len(top)))


@app.get("/api/movies/featured")
def movies_featured(count: int = 7):
    """로컬 데이터셋에서 랜덤 영화 반환 (새로고침마다 변경)"""
    # /api/movies/{tmdb_id} 보다 먼저 등록해야 "featured"가 tmdb_id로 오해되지 않음
    count = max(1, min(count, 20))
    pool = _get_movie_pool()
    return random.sample(pool, min(count, len(pool)))


@app.get("/api/movies/theme")
async def movies_theme(month: int | None = None):
    """월별 테마 영화와 헤더 메시지 반환. 미정의 월은 빈 목록을 반환한다."""
    target_month = month or datetime.now().month
    theme = MONTHLY_THEME_CONFIG.get(target_month)

    if not theme:
        return {
            "month": target_month,
            "title": None,
            "message": None,
            "emoji": None,
            "movies": [],
        }

    movies = await _build_theme_movies(theme["tmdb_ids"])
    return {
        "month": theme.get("month", target_month),
        "title": theme["title"],
        "message": theme["message"],
        "emoji": theme["emoji"],
        "movies": movies,
    }


@app.get("/api/search")
def search_movies_api(q: str = "", top: int = 10):
    """Azure AI Search 인덱스에서 기본 키워드 검색."""
    try:
        return search_movies(query=q, top=top)
    except ValueError as exc:
        print(f"[Deping] /api/search 설정 오류: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        print(f"[Deping] /api/search 오류: {exc}")
        raise HTTPException(status_code=502, detail="Azure Search 호출에 실패했습니다.")


class AdvancedSearchRequest(BaseModel):
    query: str = ""
    top: int = 10
    genre: str | None = None
    year_from: int | None = None
    year_to: int | None = None


@app.post("/api/search/advanced")
def search_movies_advanced(req: AdvancedSearchRequest):
    """장르/연도 필터를 지원하는 Azure AI Search 고급 검색."""
    if (
        req.year_from is not None
        and req.year_to is not None
        and req.year_from > req.year_to
    ):
        raise HTTPException(status_code=400, detail="year_from은 year_to보다 클 수 없습니다.")

    try:
        return search_movies(
            query=req.query,
            top=req.top,
            genre=req.genre,
            year_from=req.year_from,
            year_to=req.year_to,
        )
    except ValueError as exc:
        print(f"[Deping] /api/search/advanced 설정 오류: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        print(f"[Deping] /api/search/advanced 오류: {exc}")
        raise HTTPException(status_code=502, detail="Azure Search 호출에 실패했습니다.")


@app.get("/api/movies/cards")
async def movies_cards():
    """온보딩 카드 선택용 — TMDB 인기 영화 (poster 있는 것 최대 20편)"""
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    if not tmdb_key:
        return []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TMDB_BASE}/movie/popular",
                params={"api_key": tmdb_key, "language": "ko-KR", "page": 1},
                timeout=6.0,
            )
        results = resp.json().get("results", [])
        cards = [
            {
                "id": m["id"],
                "title": m.get("title") or m.get("original_title", ""),
                "poster_url": TMDB_IMAGE_BASE + m["poster_path"],
                "year": (m.get("release_date") or "")[:4],
                "rating": round(m.get("vote_average", 0), 1),
            }
            for m in results
            if m.get("poster_path")
        ]
        return cards[:20]
    except Exception:
        return []


@app.get("/api/directors/cards")
async def directors_cards():
    """온보딩 카드 선택용 — 감독 목록 (DIRECTOR_IDS 병렬 조회)"""
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    if not tmdb_key:
        return []

    async def _fetch_person(client: httpx.AsyncClient, pid: int):
        try:
            resp = await client.get(
                f"{TMDB_BASE}/person/{pid}",
                params={"api_key": tmdb_key, "language": "ko-KR"},
                timeout=5.0,
            )
            if resp.status_code == 200:
                d = resp.json()
                if d.get("profile_path"):
                    return {
                        "id": d["id"],
                        "name": d.get("name", ""),
                        "photo_url": TMDB_IMAGE_BASE + d["profile_path"],
                        "known_for_department": d.get("known_for_department", ""),
                    }
        except Exception:
            pass
        return None

    try:
        async with httpx.AsyncClient() as client:
            results = await asyncio.gather(
                *[_fetch_person(client, pid) for pid in DIRECTOR_IDS]
            )
        return [r for r in results if r is not None]
    except Exception:
        return []


@app.get("/api/actors/cards")
async def actors_cards():
    """온보딩 카드 선택용 — TMDB 인기 배우 (Acting, profile 있는 것 최대 20명)"""
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    if not tmdb_key:
        return []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TMDB_BASE}/person/popular",
                params={"api_key": tmdb_key, "language": "ko-KR", "page": 1},
                timeout=6.0,
            )
        results = resp.json().get("results", [])
        cards = [
            {
                "id": p["id"],
                "name": p.get("name", ""),
                "photo_url": TMDB_IMAGE_BASE + p["profile_path"],
                "known_for": [
                    kf.get("title") or kf.get("name", "")
                    for kf in (p.get("known_for") or [])[:2]
                    if kf.get("title") or kf.get("name")
                ],
            }
            for p in results
            if p.get("known_for_department") == "Acting" and p.get("profile_path")
        ]
        return cards[:20]
    except Exception:
        return []


@app.get("/api/movies/{tmdb_id}")
def movie_detail(tmdb_id: int):
    """tmdb_id로 영화 단건 조회 (로컬 풀 기반)"""
    pool = _get_movie_pool()
    movie = next((m for m in pool if m.get("tmdb_id") == tmdb_id), None)
    if not movie:
        raise HTTPException(status_code=404, detail=f"tmdb_id={tmdb_id} 영화를 찾을 수 없습니다.")
    return movie


# ── OpenAI 클라이언트 (Agent 3 큐레이터용) ───────────────────

def _get_openai_client() -> OpenAI:
    """profiler.py와 동일한 Azure AI Foundry 방식."""
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    api_key  = os.getenv("AZURE_OPENAI_API_KEY", "")
    base_url = endpoint.rstrip("/")
    for suffix in ("/chat/completions", "/chat"):
        if base_url.endswith(suffix):
            base_url = base_url[: -len(suffix)]
            break
    return OpenAI(api_key=api_key, base_url=base_url)


def _call_curator_model(messages: list[dict], max_completion_tokens: int = 350, temperature: float = 0.3) -> tuple[str, dict | None]:
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")

    if not endpoint or not api_key:
        raise ValueError("Azure OpenAI 환경변수가 없습니다.")

    response = requests.post(
        endpoint,
        headers={
            "Content-Type": "application/json",
            "api-key": api_key,
        },
        json={
            "model": deployment,
            "messages": messages,
            "max_completion_tokens": max_completion_tokens,
            "temperature": temperature,
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    choices = payload.get("choices") or []
    content = ((choices[0] or {}).get("message") or {}).get("content", "") if choices else ""
    return content.strip(), payload.get("usage")


CURATOR_PROMPT = """당신은 영화 추천 전문가 디핑입니다.
사용자 프로필을 분석하여 후보 목록 안에서만 영화 3편을 고르세요.

[절대 규칙]
- 응답은 반드시 순수 JSON만 출력하세요. 설명, 주석, 마크다운, 코드펜스 절대 금지.
- 첫 글자는 반드시 { 여야 합니다.
- selected_ids에는 후보 목록에 있는 id만 넣으세요.
- 후보 데이터에 없는 값은 추측해서 만들지 마세요.
- 영화 상세 정보(poster_url, rating, runtime, year)는 서버가 후보 데이터로 합칩니다.
- reasoning_log는 반드시 배열이어야 하며, 각 항목은 id와 reason을 포함해야 합니다.
- reason은 최대 80자.
- cognitive_match는 최대 100자.
- overviews의 각 값은 최대 150자, 2~3문장, 스포일러 금지.
- overall_reasoning은 짧은 총평으로 작성하세요.
- 3편은 가능하면 서로 다른 매력 포인트를 가지게 고르세요.

[출력 형식]
{
  "selected_ids": ["607844", "337404", "580489"],
  "reasoning_log": [
    { "id": "607844", "reason": "추천 이유", "cognitive_match": "인지적 적합성" },
    { "id": "337404", "reason": "추천 이유", "cognitive_match": "인지적 적합성" },
    { "id": "580489", "reason": "추천 이유", "cognitive_match": "인지적 적합성" }
  ],
  "overviews": {
    "607844": "짧은 한국어 줄거리 요약",
    "337404": "짧은 한국어 줄거리 요약",
    "580489": "짧은 한국어 줄거리 요약"
  },
  "overall_reasoning": "사용자 프로필 분석 및 선택 근거 총평"
}"""


class RecommendRequest(BaseModel):
    profile: dict = {}


def _format_search_candidates(candidates: list[dict]) -> str:
    lines = []
    for index, movie in enumerate(candidates, start=1):
        overview = (movie.get("overview") or "")[:120]
        lines.append(
            json.dumps(
                {
                    "id": str(movie.get("id") or ""),
                    "title_ko": movie.get("title_ko", ""),
                    "overview": overview,
                    "genres": movie.get("genres", []),
                    "director": movie.get("director", ""),
                    "year": movie.get("year"),
                },
                ensure_ascii=False,
            )
        )
    return "\n".join(lines)


def _safe_text(value, limit: int, default: str = "") -> str:
    text = value if isinstance(value, str) else default
    return text[:limit]


def _safe_list(value) -> list:
    return value if isinstance(value, list) else []


def _normalize_candidate(candidate: dict) -> dict:
    normalized = dict(candidate or {})
    normalized["id"] = str(candidate.get("id") or "")
    normalized["title_ko"] = candidate.get("title_ko") or ""
    normalized["director"] = candidate.get("director") or ""
    normalized["genres"] = candidate.get("genres") if isinstance(candidate.get("genres"), list) else []
    normalized["overview"] = candidate.get("overview") or ""
    normalized["poster_url"] = candidate.get("poster_url") or ""
    normalized["vote_average"] = candidate.get("vote_average")
    normalized["runtime"] = candidate.get("runtime")
    normalized["year"] = candidate.get("year")
    return normalized


def _fallback_reasoning(candidate_id: str, reason: str, cognitive_match: str = "") -> dict:
    return {
        "id": candidate_id,
        "reason": _safe_text(reason, 80, "추천 영화입니다."),
        "cognitive_match": _safe_text(cognitive_match, 100, ""),
    }


def _normalize_llm_response(result: dict) -> dict:
    payload = result if isinstance(result, dict) else {}
    selected_ids = [str(item) for item in _safe_list(payload.get("selected_ids")) if str(item).strip()]

    reasoning_log = []
    for item in _safe_list(payload.get("reasoning_log")):
        if not isinstance(item, dict):
            continue
        candidate_id = str(item.get("id") or "").strip()
        if not candidate_id:
            continue
        reasoning_log.append(
            {
                "id": candidate_id,
                "reason": _safe_text(item.get("reason"), 80, "추천 영화입니다."),
                "cognitive_match": _safe_text(item.get("cognitive_match"), 100, ""),
            }
        )

    overviews_raw = payload.get("overviews") if isinstance(payload.get("overviews"), dict) else {}
    overviews = {
        str(key): _safe_text(value, 150, "")
        for key, value in overviews_raw.items()
        if str(key).strip()
    }

    return {
        "selected_ids": selected_ids,
        "reasoning_log": reasoning_log,
        "overviews": overviews,
        "overall_reasoning": _safe_text(payload.get("overall_reasoning"), 500, ""),
    }


def _build_recommendation(candidate: dict, llm_response: dict) -> dict:
    candidate_id = str(candidate.get("id") or "")
    reason_obj = next(
        (item for item in llm_response.get("reasoning_log", []) if item.get("id") == candidate_id),
        None,
    )
    overview_map = llm_response.get("overviews", {})

    tmdb_id = candidate_id
    if candidate_id.isdigit():
        tmdb_id = int(candidate_id)

    merged = {
        "tmdb_id": tmdb_id,
        "title_ko": candidate.get("title_ko") or "",
        "year": candidate.get("year"),
        "director": candidate.get("director") or "",
        "genres": candidate.get("genres") or [],
        "plot_complexity": candidate.get("plot_complexity"),
        "plot_complexity_level": candidate.get("plot_complexity_level"),
        "pacing_score": candidate.get("pacing_score"),
        "pacing": candidate.get("pacing"),
        "emotional_intensity": candidate.get("emotional_intensity"),
        "emotional_intensity_level": candidate.get("emotional_intensity_level"),
        "visual_score": candidate.get("visual_score"),
        "visual_level": candidate.get("visual_level"),
        "poster_url": candidate.get("poster_url") or "",
        "rating_imdb": candidate.get("vote_average"),
        "runtime": candidate.get("runtime"),
        "reason": _safe_text((reason_obj or {}).get("reason"), 80, "추천 영화입니다."),
        "overview_ko": _safe_text(overview_map.get(candidate_id) or candidate.get("overview"), 150, ""),
        "cognitive_match": _safe_text((reason_obj or {}).get("cognitive_match"), 100, ""),
    }
    return _enrich_movie_from_pool(merged)


def _finalize_curator_output(candidates: list[dict], llm_response: dict | None = None) -> tuple[list[dict], dict]:
    normalized_candidates = [_normalize_candidate(candidate) for candidate in candidates]
    candidate_lookup = {candidate["id"]: candidate for candidate in normalized_candidates if candidate.get("id")}
    candidate_ids = set(candidate_lookup.keys())
    llm_response = _normalize_llm_response(llm_response or {})

    valid_ids = [candidate_id for candidate_id in llm_response["selected_ids"] if candidate_id in candidate_ids]
    deduped_ids: list[str] = []
    seen: set[str] = set()
    for candidate_id in valid_ids:
        if candidate_id not in seen:
            deduped_ids.append(candidate_id)
            seen.add(candidate_id)
    valid_ids = deduped_ids

    if 0 < len(valid_ids) < 3:
        used = set(valid_ids)
        for candidate in normalized_candidates:
            candidate_id = candidate["id"]
            if len(valid_ids) >= min(3, len(normalized_candidates)):
                break
            if candidate_id not in used:
                valid_ids.append(candidate_id)
                used.add(candidate_id)
                llm_response["reasoning_log"].append(
                    _fallback_reasoning(candidate_id, "후보군 적합도가 높아 보완 추천합니다.")
                )
    elif len(valid_ids) == 0:
        valid_ids = [candidate["id"] for candidate in normalized_candidates[:3]]
        llm_response["reasoning_log"] = [
            _fallback_reasoning(candidate_id, "LLM 응답 처리 실패, 검색 상위 추천")
            for candidate_id in valid_ids
        ]
        llm_response["overall_reasoning"] = (
            llm_response["overall_reasoning"]
            or "AI 큐레이터 응답이 불안정해 검색 결과 상위를 우선 추천드립니다."
        )

    if len(valid_ids) > 3:
        valid_ids = valid_ids[:3]

    normalized_reasoning = []
    for candidate_id in valid_ids:
        existing = next(
            (item for item in llm_response["reasoning_log"] if item.get("id") == candidate_id),
            None,
        )
        normalized_reasoning.append(
            existing or _fallback_reasoning(candidate_id, "추천 영화입니다.")
        )
    llm_response["reasoning_log"] = normalized_reasoning

    recommendations = [
        _build_recommendation(candidate_lookup[candidate_id], llm_response)
        for candidate_id in valid_ids
        if candidate_id in candidate_lookup
    ]

    return recommendations, llm_response


@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    """Agent 2 검색 후보 + Agent 3 큐레이션으로 영화 3편 추천."""
    profile = req.profile or {}
    search_result = run_searcher(profile)
    candidates = search_result.get("items", [])
    if not candidates:
        return {
            "recommendations": [],
            "reasoning_log": [],
            "overall_reasoning": "검색 조건에 맞는 영화를 찾지 못했습니다. 다른 취향으로 다시 시도해주세요.",
            "meta": {
                "candidate_count": 0,
                "selected_ids": [],
                "llm_latency_ms": 0,
                "token_usage": None,
                "fallback_used": True,
            },
        }

    user_message = (
        f"사용자 프로필:\n"
        f"{json.dumps(profile, ensure_ascii=False, indent=2)}\n\n"
        f"검색 후보 {len(candidates)}편:\n"
        f"{_format_search_candidates(candidates)}\n\n"
        f"위 후보 목록 안에서만 이 프로필에 맞는 영화 3편을 골라 selected_ids로만 응답해주세요."
    )

    llm_latency_ms = 0
    token_usage = None

    try:
        started_at = time.perf_counter()
        raw, usage = _call_curator_model(
            messages=[
                {"role": "system", "content": CURATOR_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            max_completion_tokens=350,
            temperature=0.3,
        )
        llm_latency_ms = int((time.perf_counter() - started_at) * 1000)
        token_usage = {
            "prompt_tokens": usage.get("prompt_tokens") if isinstance(usage, dict) else None,
            "completion_tokens": usage.get("completion_tokens") if isinstance(usage, dict) else None,
            "total_tokens": usage.get("total_tokens") if isinstance(usage, dict) else None,
        } if usage else None
        clean = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
        recommendations, normalized = _finalize_curator_output(candidates, result)
        fallback_used = normalized.get("selected_ids") != [str(rec.get("tmdb_id")) for rec in recommendations]
        logger.info(
            "/api/recommend success latency_ms=%s tokens=%s selected_ids=%s",
            llm_latency_ms,
            token_usage,
            [rec.get("tmdb_id") for rec in recommendations],
        )
        return {
            "recommendations": recommendations,
            "reasoning_log": normalized.get("reasoning_log", []),
            "overall_reasoning": normalized.get("overall_reasoning", ""),
            "meta": {
                "candidate_count": len(candidates),
                "selected_ids": [str(rec.get("tmdb_id")) for rec in recommendations],
                "llm_latency_ms": llm_latency_ms,
                "token_usage": token_usage,
                "fallback_used": fallback_used,
            },
        }
    except Exception as e:
        logger.error("Agent 3 실패: %s", e)
        fallback_ids = [str(candidate.get("id")) for candidate in candidates[:3] if candidate.get("id") is not None]
        fallback_payload = {
            "selected_ids": fallback_ids,
            "reasoning_log": [
                _fallback_reasoning(candidate_id, "추천 엔진 일시 오류, 검색 기반 추천")
                for candidate_id in fallback_ids
            ],
            "overviews": {},
            "overall_reasoning": "AI 큐레이터 응답 지연으로 검색 결과 상위를 추천드립니다.",
        }
        recommendations, normalized = _finalize_curator_output(candidates, fallback_payload)
        return {
            "recommendations": recommendations,
            "reasoning_log": normalized.get("reasoning_log", []),
            "overall_reasoning": normalized.get("overall_reasoning", ""),
            "meta": {
                "candidate_count": len(candidates),
                "selected_ids": [str(rec.get("tmdb_id")) for rec in recommendations],
                "llm_latency_ms": llm_latency_ms,
                "token_usage": token_usage,
                "fallback_used": True,
                "error": str(e),
            },
        }


# ── /api/chat — Agent 1 (프로파일러) ─────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []
    current_profile: dict = {}
    turn: int = 0


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Agent 1 (프로파일러) 엔드포인트.
    Azure OpenAI를 호출해 사용자 취향을 수집하고,
    카드 선택이 필요한 경우 type: "movie_card" 를 포함해 반환한다.
    """
    import re as _re

    try:
        result = call_profiler(
            user_message=req.message,
            conversation_history=req.conversation_history,
            current_profile=req.current_profile,
            turn=req.turn,
        )

        # ── 2중 방어: botMessage가 JSON 문자열인 경우 재파싱 ──────
        bot_msg = result.get("botMessage", "")
        if isinstance(bot_msg, str):
            cleaned = _re.sub(r'^```json\s*', '', bot_msg, flags=_re.IGNORECASE)
            cleaned = _re.sub(r'^```\s*', '', cleaned, flags=_re.IGNORECASE)
            cleaned = _re.sub(r'```\s*$', '', cleaned).strip()
            json_start = cleaned.find('{')
            if json_start >= 0:
                try:
                    inner = json.loads(cleaned[json_start:])
                    if inner.get("botMessage") is not None or inner.get("quickButtons") is not None:
                        print(f"[Deping] /api/chat: botMessage 내 JSON 재파싱 성공")
                        result = {
                            "botMessage":     inner.get("botMessage", ""),
                            "profileUpdates": inner.get("profileUpdates", {}),
                            "quickButtons":   inner.get("quickButtons", []),
                            "showModal":      inner.get("showModal", False),
                            "isComplete":     inner.get("isComplete", False),
                            "type":           inner.get("type", "chat"),
                            "cardType":       inner.get("cardType", "actor"),
                        }
                except (json.JSONDecodeError, Exception):
                    pass  # 재파싱 실패 — 원본 result 유지

        return {
            "botMessage":     result.get("botMessage", ""),
            "profileUpdates": result.get("profileUpdates", {}),
            "quickButtons":   result.get("quickButtons", []),
            "showModal":      result.get("showModal", False),
            "isComplete":     result.get("isComplete", False),
            "type":           result.get("type", "chat"),
            "cardType":       result.get("cardType", "actor"),
        }

    except Exception as e:
        print(f"[Deping] /api/chat 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
