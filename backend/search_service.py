import os
from pathlib import Path

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


BASE_SELECT_FIELDS = [
    "id",
    "tmdb_id",
    "title",
    "title_ko",
    "original_title",
    "overview",
    "genres",
    "director",
    "cast",
    "year",
    "runtime",
    "vote_average",
    "audience",
    "poster_url",
]

COGNITIVE_SELECT_FIELDS = [
    "keywords",
    "keywords_ko",
    "plot_complexity",
    "plot_complexity_level",
    "pacing_score",
    "pacing",
    "emotional_intensity",
    "emotional_intensity_level",
    "visual_score",
    "visual_level",
    "review_samples",
]

_INDEX_FIELD_CACHE: dict[str, set[str]] = {}


def _get_search_config() -> tuple[str, str, str]:
    endpoint = os.getenv("AZURE_SEARCH_ENDPOINT", "").strip()
    api_key = os.getenv("AZURE_SEARCH_API_KEY", "").strip()
    index_name = os.getenv("AZURE_SEARCH_INDEX_NAME", "").strip()

    missing = [
        name
        for name, value in (
            ("AZURE_SEARCH_ENDPOINT", endpoint),
            ("AZURE_SEARCH_API_KEY", api_key),
            ("AZURE_SEARCH_INDEX_NAME", index_name),
        )
        if not value
    ]
    if missing:
        raise ValueError(f"Azure Search 환경변수가 없습니다: {', '.join(missing)}")

    return endpoint, api_key, index_name


def _get_search_client() -> SearchClient:
    endpoint, api_key, index_name = _get_search_config()
    return SearchClient(
        endpoint=endpoint,
        index_name=index_name,
        credential=AzureKeyCredential(api_key),
    )


def _get_index_fields() -> set[str]:
    endpoint, api_key, index_name = _get_search_config()
    cache_key = f"{endpoint}|{index_name}"
    if cache_key in _INDEX_FIELD_CACHE:
        return _INDEX_FIELD_CACHE[cache_key]

    client = SearchIndexClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(api_key),
    )
    index = client.get_index(index_name)
    field_names = {field.name for field in index.fields}
    _INDEX_FIELD_CACHE[cache_key] = field_names
    return field_names


def _available_select_fields() -> list[str]:
    existing = _get_index_fields()
    return [field for field in BASE_SELECT_FIELDS + COGNITIVE_SELECT_FIELDS if field in existing]


def _escape_odata_string(value: str) -> str:
    return value.replace("'", "''")


def _build_search_filter(
    genre: str | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    plot_complexity_level: str | None = None,
    pacing: str | None = None,
    visual_level: str | None = None,
) -> str | None:
    filters: list[str] = []
    existing_fields = _get_index_fields()

    if genre:
        safe_genre = _escape_odata_string(genre.strip())
        filters.append(f"genres/any(g: g eq '{safe_genre}')")

    if year_from is not None:
        filters.append(f"year ge {int(year_from)}")

    if year_to is not None:
        filters.append(f"year le {int(year_to)}")

    if plot_complexity_level and "plot_complexity_level" in existing_fields:
        safe_value = _escape_odata_string(plot_complexity_level.strip())
        filters.append(f"plot_complexity_level eq '{safe_value}'")

    if pacing and "pacing" in existing_fields:
        safe_value = _escape_odata_string(pacing.strip())
        filters.append(f"pacing eq '{safe_value}'")

    if visual_level and "visual_level" in existing_fields:
        safe_value = _escape_odata_string(visual_level.strip())
        filters.append(f"visual_level eq '{safe_value}'")

    return " and ".join(filters) if filters else None


def normalize_search_movie(document: dict) -> dict:
    genres = document.get("genres")
    cast = document.get("cast")

    if isinstance(genres, str):
        genres = [item.strip() for item in genres.split(",") if item.strip()]
    if isinstance(cast, str):
        cast = [item.strip() for item in cast.split(",") if item.strip()]

    return {
        "id": str(document.get("id") or ""),
        "tmdb_id": document.get("tmdb_id"),
        "title": document.get("title") or "",
        "title_ko": document.get("title_ko") or "",
        "original_title": document.get("original_title") or "",
        "overview": document.get("overview") or "",
        "genres": genres if isinstance(genres, list) else [],
        "director": document.get("director") or "",
        "cast": cast if isinstance(cast, list) else [],
        "year": document.get("year"),
        "runtime": document.get("runtime"),
        "vote_average": document.get("vote_average"),
        "audience": document.get("audience"),
        "poster_url": document.get("poster_url") or None,
        "keywords": document.get("keywords") if isinstance(document.get("keywords"), list) else [],
        "keywords_ko": document.get("keywords_ko") if isinstance(document.get("keywords_ko"), list) else [],
        "plot_complexity": document.get("plot_complexity"),
        "plot_complexity_level": document.get("plot_complexity_level"),
        "pacing_score": document.get("pacing_score"),
        "pacing": document.get("pacing"),
        "emotional_intensity": document.get("emotional_intensity"),
        "emotional_intensity_level": document.get("emotional_intensity_level"),
        "visual_score": document.get("visual_score"),
        "visual_level": document.get("visual_level"),
        "review_samples": document.get("review_samples") if isinstance(document.get("review_samples"), list) else [],
    }


def search_movies(
    query: str,
    top: int = 10,
    genre: str | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    plot_complexity_level: str | None = None,
    pacing: str | None = None,
    visual_level: str | None = None,
) -> dict:
    client = _get_search_client()
    safe_top = max(1, min(int(top), 50))
    search_text = query.strip() or "*"
    filter_expression = _build_search_filter(
        genre=genre,
        year_from=year_from,
        year_to=year_to,
        plot_complexity_level=plot_complexity_level,
        pacing=pacing,
        visual_level=visual_level,
    )

    try:
        results = client.search(
            search_text=search_text,
            top=safe_top,
            filter=filter_expression,
            select=_available_select_fields(),
            include_total_count=True,
        )

        items = [normalize_search_movie(doc) for doc in results]
        total_count = results.get_count()
        return {
            "query": search_text,
            "top": safe_top,
            "filter": filter_expression,
            "count": total_count if total_count is not None else len(items),
            "items": items,
        }
    except HttpResponseError as exc:
        print(f"[Deping] Azure Search query failed: {exc}")
        raise
    except Exception as exc:
        print(f"[Deping] Azure Search unexpected error: {exc}")
        raise
