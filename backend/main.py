import json
import os
import random
import requests
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

load_dotenv()

app = FastAPI(title="Deping Backend")

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
_MOVIE_POOL_PATH = (
    Path(__file__).resolve().parent.parent
    / "notebooks/data/processed/tmdb_movies_kr_with_credits_keywords.json"
)
_movie_pool: list[dict] | None = None


def _get_movie_pool() -> list[dict]:
    global _movie_pool
    if _movie_pool is None:
        with open(_MOVIE_POOL_PATH, encoding="utf-8") as f:
            raw = json.load(f)
        _movie_pool = [
            {
                "tmdb_id": m.get("tmdb_id"),
                "title": m.get("title_ko") or m.get("title", ""),
                "poster_url": m.get("poster_url"),
                "overview": m.get("overview", ""),
                "vote_average": m.get("vote_average"),
                "director": m.get("director", ""),
                "actors": (m.get("actors") or [])[:3],
                "year": m.get("year", ""),
            }
            for m in raw
            if m.get("poster_url")
        ]
    return _movie_pool


# ── KOBIS 캐시 ────────────────────────────────────────────────
_kobis_cache: dict = {"data": None, "expires": None}

KOBIS_URL = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json"
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500"


def _fetch_poster(title: str, tmdb_key: str) -> str | None:
    try:
        resp = requests.get(
            TMDB_SEARCH_URL,
            params={"query": title, "language": "ko-KR", "api_key": tmdb_key},
            timeout=5,
        )
        results = resp.json().get("results", [])
        if results and results[0].get("poster_path"):
            return TMDB_IMG_BASE + results[0]["poster_path"]
    except Exception:
        pass
    return None


def _dummy_boxoffice() -> list[dict]:
    """KOBIS 키 없거나 API 실패 시 — 풀에서 평점 상위 10편을 더미 박스오피스로 반환"""
    pool = _get_movie_pool()
    top10 = sorted(pool, key=lambda x: x.get("vote_average") or 0, reverse=True)[:10]
    return [
        {
            "rank": i + 1,
            "title": m["title"],
            "audience_acc": 0,
            "audience_today": 0,
            "poster_url": m.get("poster_url"),
        }
        for i, m in enumerate(top10)
    ]


def _get_daily_boxoffice() -> list[dict]:
    now = datetime.now()
    if _kobis_cache["data"] and _kobis_cache["expires"] and now < _kobis_cache["expires"]:
        return _kobis_cache["data"]

    kobis_key = os.getenv("KOBIS_API_KEY", "")
    tmdb_key = os.getenv("TMDB_API_KEY", "")

    if not kobis_key:
        return _dummy_boxoffice()

    yesterday = (now - timedelta(days=1)).strftime("%Y%m%d")
    try:
        resp = requests.get(
            KOBIS_URL,
            params={"key": kobis_key, "targetDt": yesterday},
            timeout=8,
        )
        items = resp.json()["boxOfficeResult"]["dailyBoxOfficeList"][:10]
    except Exception as e:
        raise RuntimeError(f"KOBIS API 호출 실패: {e}")

    result = [
        {
            "rank": int(item["rank"]),
            "title": item["movieNm"],
            "audience_acc": int(item["audiAcc"]),
            "audience_today": int(item["audiCnt"]),
            "poster_url": _fetch_poster(item["movieNm"], tmdb_key) if tmdb_key else None,
        }
        for item in items
    ]

    _kobis_cache["data"] = result
    _kobis_cache["expires"] = now + timedelta(hours=6)
    return result


# ── 엔드포인트 ────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Deping Backend가 정상적으로 실행 중입니다!", "status": "ok"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/boxoffice/daily")
def boxoffice_daily():
    """KOBIS 일별 박스오피스 TOP 10 (6시간 TTL 캐시, 키 없으면 더미 반환)"""
    try:
        return _get_daily_boxoffice()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


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


@app.get("/api/movies/{tmdb_id}")
def movie_detail(tmdb_id: int):
    """tmdb_id로 영화 단건 조회 (로컬 풀 기반)"""
    pool = _get_movie_pool()
    movie = next((m for m in pool if m.get("tmdb_id") == tmdb_id), None)
    if not movie:
        raise HTTPException(status_code=404, detail=f"tmdb_id={tmdb_id} 영화를 찾을 수 없습니다.")
    return movie


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
