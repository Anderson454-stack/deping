from __future__ import annotations

from typing import Any


NUMERIC_PROFILE_FIELDS = (
    "mood",
    "energy",
    "complexity",
    "patience",
    "visual_style",
    "ending_style",
    "inner_need",
    "temperature",
)


COMPLEXITY_MAP = {
    -2: "low",
    2: "high",
}

PATIENCE_MAP = {
    -2: "low",
    2: "high",
}

VISUAL_STYLE_MAP = {
    -2: "story_over_visuals",
    2: "visuals_over_story",
}

MOOD_MAP = {
    -2: "low_energy_mood",
    2: "high_energy_mood",
}

ENERGY_MAP = {
    -2: "unfocused",
    2: "fully_engaged",
}

ENDING_STYLE_MAP = {
    -2: "resolved",
    2: "lingering",
}

INNER_NEED_MAP = {
    -2: "healing",
    2: "energy",
}

TEMPERATURE_MAP = {
    -2: "cold_tense",
    2: "warm_emotional",
}


def _coerce_numeric(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _ensure_list(value: Any) -> list[str]:
    if isinstance(value, list):
        items = value
    elif value in (None, ""):
        items = []
    else:
        items = [value]

    normalized: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = str(item).strip()
        if not text or text in seen:
            continue
        normalized.append(text)
        seen.add(text)
    return normalized


def _normalize_refs(profile: dict) -> dict[str, list[str]]:
    refs = profile.get("refs") if isinstance(profile.get("refs"), dict) else {}
    return {
        "movies": _ensure_list(
            refs.get("movies")
            or profile.get("reference")
            or profile.get("reference_movies")
        ),
        "directors": _ensure_list(
            refs.get("directors")
            or profile.get("directors")
            or profile.get("reference_directors")
        ),
        "actors": _ensure_list(
            refs.get("actors")
            or profile.get("actors")
            or profile.get("reference_actors")
        ),
    }


def _normalize_genres(profile: dict) -> list[str]:
    return _ensure_list(
        profile.get("genres")
        or profile.get("genre_preferences")
        or profile.get("preferred_genres")
    )


def decode_profile_labels(profile: dict) -> dict:
    raw = profile.get("raw", {})
    labels = profile.setdefault("labels", {})

    labels["mood"] = MOOD_MAP.get(raw.get("mood"))
    labels["energy"] = ENERGY_MAP.get(raw.get("energy"))
    labels["complexity"] = COMPLEXITY_MAP.get(raw.get("complexity"))
    labels["patience"] = PATIENCE_MAP.get(raw.get("patience"))
    labels["visual_style"] = VISUAL_STYLE_MAP.get(raw.get("visual_style"))
    labels["ending_style"] = ENDING_STYLE_MAP.get(raw.get("ending_style"))
    labels["inner_need"] = INNER_NEED_MAP.get(raw.get("inner_need"))
    labels["temperature"] = TEMPERATURE_MAP.get(raw.get("temperature"))
    return profile


def normalize_profile(profile: dict | None) -> dict:
    source = profile if isinstance(profile, dict) else {}
    raw = {
        field: _coerce_numeric(source.get(field))
        for field in NUMERIC_PROFILE_FIELDS
    }

    normalized = {
        "raw": raw,
        "genres": _normalize_genres(source),
        "priority": _ensure_list(source.get("priority")),
        "avoidance": _ensure_list(source.get("avoidance") or source.get("avoid")),
        "refs": _normalize_refs(source),
        "labels": {
            "mood": None,
            "energy": None,
            "complexity": None,
            "patience": None,
            "visual_style": None,
            "ending_style": None,
            "inner_need": None,
            "temperature": None,
        },
    }
    return decode_profile_labels(normalized)
