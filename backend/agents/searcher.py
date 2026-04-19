import json

from search_service import search_movies


def _ensure_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _normalize_profile_refs(profile: dict) -> tuple[list[str], list[str], list[str]]:
    references = _ensure_list(profile.get("reference") or profile.get("reference_movies"))
    directors = _ensure_list(profile.get("directors") or profile.get("reference_directors"))
    actors = _ensure_list(profile.get("actors") or profile.get("reference_actors"))
    return references, directors, actors


def _pick_genre(profile: dict) -> str | None:
    genres = _ensure_list(profile.get("genres"))
    return genres[0] if genres else None


def _map_complexity(profile: dict) -> str | None:
    value = str(profile.get("complexity") or "").strip().lower()
    if value in {"low", "medium", "high"}:
        return value
    return None


def _map_pacing(profile: dict) -> str | None:
    value = str(profile.get("patience") or "").strip().lower()
    return {
        "low": "fast",
        "medium": "medium",
        "high": "slow",
    }.get(value)


def _map_visual_level(profile: dict) -> str | None:
    visual_style = str(profile.get("visual_style") or "").strip().lower()
    priorities = {item.lower() for item in _ensure_list(profile.get("priority"))}

    if visual_style in {"cinematic", "high", "visual"}:
        return "high"
    if "visuals" in priorities or "visual" in priorities:
        return "high"
    return None


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


def profile_to_search_params(profile: dict) -> dict:
    genres = _ensure_list(profile.get("genres"))
    references, directors, actors = _normalize_profile_refs(profile)
    year_from, year_to = _pick_year_range(profile)
    plot_complexity_level = _map_complexity(profile)
    pacing = _map_pacing(profile)
    visual_level = _map_visual_level(profile)

    query_parts: list[str] = []
    if genres:
        query_parts.extend(genres[:3])
    if directors:
        query_parts.extend(directors[:2])
    if actors:
        query_parts.extend(actors[:3])
    if references:
        query_parts.extend(references[:3])

    query = " ".join(dict.fromkeys(part for part in query_parts if part)).strip() or "*"

    return {
        "query": query,
        "genre": genres[0] if genres else None,
        "year_from": year_from,
        "year_to": year_to,
        "plot_complexity_level": plot_complexity_level,
        "pacing": pacing,
        "visual_level": visual_level,
        "top": 15,
    }


def run_searcher(profile: dict) -> dict:
    params = profile_to_search_params(profile)

    try:
        result = search_movies(**params)
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
        result = search_movies(**softer_query_params)
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
        result = search_movies(**cognitive_only_params)
        if result.get("items"):
            return result
        print("[Deping] Agent 2 search fallback (0건 → 인지 필터 제거)")
    except Exception as exc:
        print(f"[Deping] Agent 2 search fallback (인지 필터 유지 단계 실패): {exc}")

    try:
        fallback_params = {
            "query": params["query"],
            "top": params["top"],
            "genre": None,
            "year_from": None,
            "year_to": None,
            "plot_complexity_level": None,
            "pacing": None,
            "visual_level": None,
        }
        result = search_movies(**fallback_params)
        if result.get("items"):
            return result
        print("[Deping] Agent 2 search fallback (0건 → 전체 인기 후보)")
    except Exception as exc:
        print(f"[Deping] Agent 2 search 최종 실패: {exc}")

    try:
        return search_movies(query="*", top=params["top"])
    except Exception as exc:
        print(f"[Deping] Agent 2 search 전체 fallback 실패: {exc}")
        return {
            "query": params["query"],
            "filter": None,
            "top": params["top"],
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
