import json

from agents.profile_normalizer import decode_profile_labels, normalize_profile
from search_service import search_movies


GENRE_QUERY_TERMS = {
    "horror": ["공포 영화", "호러 영화", "horror film"],
    "thriller": ["스릴러 영화", "긴장감 있는 영화", "thriller film"],
    "romance": ["로맨스 영화", "멜로 영화", "romance film"],
    "comedy": ["코미디 영화", "funny comedy film"],
    "action": ["액션 영화", "action blockbuster"],
    "drama": ["드라마 영화", "character drama"],
    "sf": ["SF 영화", "science fiction film", "sci-fi film"],
    "crime": ["범죄 영화", "crime film"],
    "mystery": ["미스터리 영화", "추리 영화", "detective mystery"],
    "fantasy": ["판타지 영화", "fantasy film"],
    "animation": ["애니메이션 영화", "animation film"],
}
GENRE_FILTER_VALUES = {
    "horror": "공포",
    "thriller": "스릴러",
    "romance": "로맨스",
    "comedy": "코미디",
    "action": "액션",
    "drama": "드라마",
    "sf": "SF",
    "crime": "범죄",
    "mystery": "미스터리",
    "fantasy": "판타지",
    "animation": "애니메이션",
}


def _ensure_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []

def _pick_year_range(profile: dict) -> tuple[int | None, int | None]:
    year_from = profile.get("year_from")
    year_to = profile.get("year_to")

    try:
        year_from = int(year_from) if year_from not in (None, "") else None
    except Exception:
        year_from = None

    try:
        year_to = int(year_to) if year_to not in (None, "") else None
    except Exception:
        year_to = None

    if year_from is not None and year_to is not None and year_from > year_to:
        return None, None
    return year_from, year_to


def _derive_genre_query_terms(genres: list[str]) -> list[str]:
    terms: list[str] = []
    for genre in genres:
        terms.extend(GENRE_QUERY_TERMS.get(str(genre).strip().lower(), []))

    genre_set = {str(genre).strip().lower() for genre in genres}
    if {"horror", "thriller"}.issubset(genre_set):
        terms.extend(["공포 스릴러 영화", "horror thriller", "suspense horror film"])
    if {"crime", "thriller"}.issubset(genre_set):
        terms.extend(["범죄 스릴러 영화", "crime thriller", "detective suspense"])
    if {"romance", "comedy"}.issubset(genre_set):
        terms.extend(["로맨틱 코미디", "romantic comedy", "romcom"])
    if {"crime", "mystery"}.issubset(genre_set):
        terms.extend(["추리 범죄 영화", "crime mystery", "detective investigation film"])

    return list(dict.fromkeys(term for term in terms if term))


def _derive_mood_energy_query_terms(normalized: dict) -> list[str]:
    raw = normalized.get("raw", {})
    mood = raw.get("mood")
    energy = raw.get("energy")
    inner_need = raw.get("inner_need")
    temperature = raw.get("temperature")

    # Observed runtime patterns:
    # - (-1, -1): relaxed / low-energy / want-to-rest expressions
    # - (0, 0): neutral / ordinary / undecided baseline mood
    # - (2, 2): energetic / high-arousal expressions
    pair_terms = {
        (-1, -1): ["잔잔한 영화", "편안한 영화", "calm low-energy film"],
        (0, 0): ["무난한 영화", "balanced accessible film"],
        (2, 2): ["에너지 넘치는 영화", "dynamic high-energy film", "fast-paced film"],
    }
    terms = list(pair_terms.get((mood, energy), []))

    if (mood, energy) == (-1, -1):
        if (inner_need is not None and inner_need <= -2) or (temperature is not None and temperature >= 1):
            terms.extend(["잔잔한 위로 영화", "따뜻한 영화", "healing comforting film"])
        elif inner_need is not None and inner_need >= 1:
            terms.extend(["기분 전환 영화", "uplifting recovery film"])

        if temperature is not None and temperature <= -1:
            terms.extend(["감정선 있는 영화", "melancholic reflective film", "quiet introspective film"])
        elif temperature is not None and temperature >= 1:
            terms.extend(["부드러운 영화", "warm gentle film", "soft restful film", "cozy healing film"])

    return terms


def _map_raw_signal_to_cognitive_scale(value: int | None, *, reverse: bool = False) -> int | None:
    if value is None:
        return None
    clamped = max(-2, min(2, int(value)))
    mapped = 3 - clamped if reverse else 3 + clamped
    return max(1, min(5, mapped))


def _score_cognitive_axis(value: int | None, target: int | None) -> float:
    if value is None or target is None:
        return 0.0
    distance = abs(int(value) - int(target))
    if distance == 0:
        return 1.0
    if distance == 1:
        return 0.45
    if distance == 2:
        return 0.1
    return -0.2


def score_candidate_against_profile(profile: dict, candidate: dict) -> dict:
    params = profile_to_search_params(profile)
    plot_score = _score_cognitive_axis(candidate.get("plot_complexity"), params.get("plot_complexity_target"))
    pacing_score = _score_cognitive_axis(candidate.get("pacing"), params.get("pacing_target"))
    visual_score = _score_cognitive_axis(candidate.get("visual_score"), params.get("visual_score_target"))
    total = plot_score + pacing_score + visual_score
    return {
        "targets": {
            "plot_complexity_target": params.get("plot_complexity_target"),
            "pacing_target": params.get("pacing_target"),
            "visual_score_target": params.get("visual_score_target"),
        },
        "axes": {
            "plot_complexity": plot_score,
            "pacing": pacing_score,
            "visual_score": visual_score,
        },
        "total": total,
    }


def _rerank_search_items(items: list[dict], params: dict) -> list[dict]:
    reranked = []
    for item in items:
        lexical_score = float(item.get("search_score") or 0.0)
        semantic_score = float(item.get("reranker_score") or 0.0)
        plot_score = _score_cognitive_axis(item.get("plot_complexity"), params.get("plot_complexity_target"))
        pacing_score = _score_cognitive_axis(item.get("pacing"), params.get("pacing_target"))
        visual_score = _score_cognitive_axis(item.get("visual_score"), params.get("visual_score_target"))
        cognitive_score = plot_score + pacing_score + visual_score
        final_score = semantic_score * 3.0 + lexical_score + cognitive_score

        reranked_item = {
            **item,
            "search_mode": params.get("mode"),
            "cognitive_rerank": {
                "plot_complexity": plot_score,
                "pacing": pacing_score,
                "visual_score": visual_score,
                "total": cognitive_score,
            },
            "final_rank_score": round(final_score, 6),
        }
        reranked.append(reranked_item)

    reranked.sort(
        key=lambda item: (
            float(item.get("final_rank_score") or 0.0),
            float(item.get("reranker_score") or 0.0),
            float(item.get("search_score") or 0.0),
        ),
        reverse=True,
    )
    return reranked


def profile_to_search_params(profile: dict) -> dict:
    normalized = decode_profile_labels(normalize_profile(profile))
    raw = normalized.get("raw", {})
    labels = normalized.get("labels", {})
    genres = _ensure_list(normalized.get("genres"))
    refs = normalized.get("refs", {})
    priority = normalized.get("priority", [])
    avoidance = normalized.get("avoidance", [])
    year_from, year_to = _pick_year_range(profile)

    references = _ensure_list(refs.get("movies"))
    directors = _ensure_list(refs.get("directors"))
    actors = _ensure_list(refs.get("actors"))

    query_parts: list[str] = []
    query_parts.extend(_derive_genre_query_terms(genres))
    query_parts.extend(_derive_mood_energy_query_terms(normalized))

    priority_aliases = {
        "story": "story-driven film",
        "visual": "cinematic visuals",
        "music": "music-forward film",
        "actor": "strong performances",
        "director": "director-driven film",
    }
    for item in priority:
        alias = priority_aliases.get(str(item).strip().lower())
        if alias:
            query_parts.append(alias)

    genre_priority_mode = bool(genres or avoidance)
    if len(genres) >= 2 or avoidance:
        reference_movie_limit = 0
        reference_people_limit = 0
    else:
        reference_movie_limit = 1 if genre_priority_mode else 3
        reference_people_limit = 0 if genre_priority_mode else 2

    if references:
        query_parts.extend(references[:reference_movie_limit])
    if directors:
        query_parts.extend(directors[:reference_people_limit])
    if actors and reference_people_limit > 0:
        query_parts.extend(actors[:reference_people_limit + (0 if genres else 1)])

    plot_complexity_target = _map_raw_signal_to_cognitive_scale(raw.get("complexity"))
    pacing_target = _map_raw_signal_to_cognitive_scale(raw.get("patience"), reverse=True)
    visual_score_target = _map_raw_signal_to_cognitive_scale(raw.get("visual_style"))

    query = " ".join(dict.fromkeys(part for part in query_parts if part)).strip() or "*"
    genre_filter = next(
        (GENRE_FILTER_VALUES.get(str(genre).strip().lower()) for genre in genres if GENRE_FILTER_VALUES.get(str(genre).strip().lower())),
        None,
    )

    params = {
        "query": query,
        "mode": "hybrid",
        "genre": genre_filter,
        "year_from": year_from,
        "year_to": year_to,
        "plot_complexity_target": plot_complexity_target,
        "pacing_target": pacing_target,
        "visual_score_target": visual_score_target,
        "excluded_genres": avoidance,
        "top": 50,
        "final_top": 15,
    }
    print(
        "[Searcher][params] "
        + json.dumps(
            {
                "raw": normalized.get("raw"),
                "labels": normalized.get("labels"),
                "genres": genres,
                "inner_need_used": normalized.get("raw", {}).get("inner_need"),
                "temperature_used": normalized.get("raw", {}).get("temperature"),
                "priority": priority,
                "avoidance": avoidance,
                "params": params,
            },
            ensure_ascii=False,
        )
    )
    return params


def run_searcher(profile: dict, mode: str = "hybrid") -> dict:
    params = {
        **profile_to_search_params(profile),
        "mode": mode,
    }

    def _finalize_result(result: dict) -> dict:
        reranked_items = (
            _rerank_search_items(result.get("items", []), params)
            if mode != "keyword"
            else result.get("items", [])
        )
        return {
            **result,
            "mode": mode,
            "items": reranked_items[: params["final_top"]],
        }

    def _search(search_params: dict) -> dict:
        payload = {key: value for key, value in search_params.items() if key != "final_top"}
        return search_movies(**payload)

    try:
        result = _finalize_result(_search(params))
        print(
            "[Searcher][result] "
            + json.dumps(
                {
                    "query": result.get("query"),
                    "mode": result.get("mode"),
                    "filter": result.get("filter"),
                    "count": result.get("count"),
                    "top_titles": [item.get("title_ko") or item.get("title") for item in result.get("items", [])[:5]],
                },
                ensure_ascii=False,
            )
        )
        if result.get("items"):
            return result
        print("[Deping] Agent 2 search fallback (0건 → query 완화, 인지 필터 유지)")
    except Exception as exc:
        print(f"[Deping] Agent 2 search fallback (query 완화): {exc}")

    try:
        softer_query_params = {
            **params,
            "query": "*",
        }
        result = _finalize_result(_search(softer_query_params))
        if result.get("items"):
            return result
        print("[Deping] Agent 2 search fallback (0건 → genre 제거, 인지 필터 유지)")
    except Exception as exc:
        print(f"[Deping] Agent 2 search fallback (genre 유지 단계 실패): {exc}")

    try:
        cognitive_only_params = {
            **params,
            "query": "*",
            "genre": None,
        }
        result = _finalize_result(_search(cognitive_only_params))
        if result.get("items"):
            return result
        print("[Deping] Agent 2 search fallback (0건 → 인지 필터 제거)")
    except Exception as exc:
        print(f"[Deping] Agent 2 search fallback (인지 필터 유지 단계 실패): {exc}")

    try:
        fallback_params = {
            "query": params["query"],
            "mode": "keyword",
            "top": params["top"],
            "final_top": params["final_top"],
            "genre": None,
            "year_from": None,
            "year_to": None,
            "plot_complexity_target": None,
            "pacing_target": None,
            "visual_score_target": None,
            "excluded_genres": params.get("excluded_genres"),
        }
        result = _finalize_result(_search(fallback_params))
        if result.get("items"):
            return result
        print("[Deping] Agent 2 search fallback (0건 → 전체 인기 후보)")
    except Exception as exc:
        print(f"[Deping] Agent 2 search 최종 실패: {exc}")

    try:
        return _finalize_result(search_movies(query="*", top=params["top"], mode="keyword"))
    except Exception as exc:
        print(f"[Deping] Agent 2 search 전체 fallback 실패: {exc}")
        return {
            "query": params["query"],
            "mode": mode,
            "filter": None,
            "top": params["final_top"],
            "count": 0,
            "items": [],
        }


if __name__ == "__main__":
    sample_profile = {
        "genres": ["SF"],
        "reference": ["Interstellar"],
        "directors": ["Christopher Nolan"],
        "actors": ["Matthew McConaughey"],
    }
    print(json.dumps(run_searcher(sample_profile), ensure_ascii=False, indent=2))
