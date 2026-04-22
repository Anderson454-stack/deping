import os
from pathlib import Path

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.search.documents.indexes import SearchIndexClient
from dotenv import load_dotenv
import requests

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


BASE_SELECT_FIELDS = [
    "doc_id",
    "id",
    "tmdb_id",
    "title",
    "title_ko",
    "original_title",
    "release_date",
    "year",
    "overview",
    "combined_text",
    "reviews_combined",
    "genres",
    "director",
    "cast_top5",
    "cast",
    "runtime",
    "vote_average",
    "vote_count",
    "poster_url",
]

COGNITIVE_SELECT_FIELDS = [
    "keywords",
    "plot_complexity",
    "pacing",
    "emotional_intensity",
    "visual_score",
]

_INDEX_FIELD_CACHE: dict[str, set[str]] = {}
SEMANTIC_CONFIGURATION_NAME = "movie-semantic-config"
VECTOR_FIELD_NAME = "combined_text_vector"
EMBED_VECTOR_DIMENSIONS = 1536
HYBRID_SEARCH_FIELDS = [
    "title",
    "title_ko",
    "original_title",
    "overview",
    "combined_text",
    "reviews_combined",
    "director",
    "cast_top5",
    "genres",
    "keywords",
]
EMBED_API_VERSION_CANDIDATES = (
    lambda configured: [
        version
        for version in (
            configured,
            os.getenv("AZURE_OPENAI_EMBED_API_VERSION", "").strip(),
            "2025-04-01-preview",
            "2024-10-21",
            "2024-06-01",
            "2024-02-01",
        )
        if version
    ]
)


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


def _sanitize_openai_endpoint(endpoint: str) -> str:
    trimmed = endpoint.strip().rstrip("/")
    if trimmed.endswith("/v1"):
        return trimmed[:-3]
    return trimmed


def _get_embedding_config() -> dict[str, str]:
    endpoint = _sanitize_openai_endpoint(os.getenv("AZURE_OPENAI_ENDPOINT", ""))
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    deployment = (
        os.getenv("AZURE_OPENAI_EMBED_DEPLOYMENT", "").strip()
        or os.getenv("AZURE_OPENAI_DEPLOY_EMBED", "").strip()
        or "text-embedding-3-small"
    )
    api_version = os.getenv("AZURE_OPENAI_EMBED_API_VERSION", "").strip() or os.getenv("AZURE_OPENAI_API_VERSION", "").strip()

    if not endpoint or not api_key:
        raise ValueError("Azure OpenAI 임베딩 환경변수가 없습니다.")

    return {
        "endpoint": endpoint,
        "api_key": api_key,
        "deployment": deployment,
        "api_version": api_version,
    }


def _request_embedding(text: str, *, endpoint: str, api_key: str, deployment: str, api_version: str) -> requests.Response:
    url = f"{endpoint}/openai/deployments/{deployment}/embeddings"
    response = requests.post(
        url,
        params={"api-version": api_version},
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
        },
        json={"input": text},
        timeout=20,
    )
    return response


def verify_query_embedding(text: str) -> dict:
    config = _get_embedding_config()
    errors: list[dict[str, str | int]] = []
    for api_version in EMBED_API_VERSION_CANDIDATES(config["api_version"]):
        response = _request_embedding(
            text,
            endpoint=config["endpoint"],
            api_key=config["api_key"],
            deployment=config["deployment"],
            api_version=api_version,
        )
        if response.ok:
            payload = response.json()
            vector = list(payload["data"][0]["embedding"])
            return {
                "ok": True,
                "deployment": config["deployment"],
                "api_version": api_version,
                "vector_length": len(vector),
                "vector": vector,
                "status_code": response.status_code,
                "error": None,
            }
        errors.append(
            {
                "api_version": api_version,
                "status_code": response.status_code,
                "error": response.text[:300],
            }
        )

    return {
        "ok": False,
        "deployment": config["deployment"],
        "api_version": config["api_version"],
        "vector_length": 0,
        "vector": None,
        "status_code": errors[-1]["status_code"] if errors else None,
        "error": errors[-1]["error"] if errors else "embedding request failed",
        "attempts": errors,
    }


def _embed_query_text(text: str) -> list[float]:
    result = verify_query_embedding(text)
    if not result["ok"]:
        raise ValueError(result["error"])
    vector = result["vector"] or []
    if len(vector) != EMBED_VECTOR_DIMENSIONS:
        raise ValueError(
            f"unexpected embedding dimensions: expected {EMBED_VECTOR_DIMENSIONS}, got {len(vector)}"
        )
    return vector


def _average_vectors(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        raise ValueError("no vectors to average")
    dimension = len(vectors[0])
    sums = [0.0] * dimension
    for vector in vectors:
        if len(vector) != dimension:
            continue
        for index, value in enumerate(vector):
            sums[index] += float(value)
    count = float(len(vectors))
    return [value / count for value in sums]


def _build_seed_vector(
    client: SearchClient,
    search_text: str,
    filter_expression: str | None,
    search_fields: list[str],
    safe_top: int,
) -> list[float] | None:
    try:
        seed_results = client.search(
            search_text=search_text,
            top=max(5, min(10, safe_top)),
            filter=filter_expression,
            select=["doc_id", VECTOR_FIELD_NAME],
            search_fields=search_fields or None,
            include_total_count=False,
        )
        vectors = [doc.get(VECTOR_FIELD_NAME) for doc in seed_results if doc.get(VECTOR_FIELD_NAME)]
        if not vectors:
            return None
        return _average_vectors(vectors)
    except Exception as exc:
        print(f"[Deping] Azure Search seed vector fallback failed: {exc}")
        return None


def _build_vector_queries(
    client: SearchClient,
    search_text: str,
    filter_expression: str | None,
    search_fields: list[str],
    safe_top: int,
) -> list[VectorizedQuery] | None:
    query_vector: list[float] | None = None

    try:
        query_vector = _embed_query_text(search_text)
    except Exception as exc:
        print(f"[Deping] Azure OpenAI query embedding unavailable, fallback to seed vector: {exc}")
        query_vector = _build_seed_vector(
            client=client,
            search_text=search_text,
            filter_expression=filter_expression,
            search_fields=search_fields,
            safe_top=safe_top,
        )

    if not query_vector:
        return None

    return [
        VectorizedQuery(
            vector=query_vector,
            fields=VECTOR_FIELD_NAME,
            k_nearest_neighbors=max(safe_top * 3, 20),
            weight=1.5,
        )
    ]


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
    excluded_genres: list[str] | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
) -> str | None:
    filters: list[str] = []

    if genre:
        safe_genre = _escape_odata_string(genre.strip())
        filters.append(f"genres/any(g: g eq '{safe_genre}')")

    for excluded in excluded_genres or []:
        safe_genre = _escape_odata_string(str(excluded).strip())
        if safe_genre:
            filters.append(f"not genres/any(g: g eq '{safe_genre}')")

    if year_from is not None:
        filters.append(f"year ge {int(year_from)}")

    if year_to is not None:
        filters.append(f"year le {int(year_to)}")

    return " and ".join(filters) if filters else None


def normalize_search_movie(document: dict) -> dict:
    genres = document.get("genres")
    cast = document.get("cast") or document.get("cast_top5")
    cast_top5 = document.get("cast_top5") or cast

    if isinstance(genres, str):
        genres = [item.strip() for item in genres.split(",") if item.strip()]
    if isinstance(cast, str):
        cast = [item.strip() for item in cast.split(",") if item.strip()]
    if isinstance(cast_top5, str):
        cast_top5 = [item.strip() for item in cast_top5.split(",") if item.strip()]
    if document.get("year") is None and document.get("release_date"):
        try:
            year = int(str(document.get("release_date"))[:4])
        except Exception:
            year = None
    else:
        year = document.get("year")

    return {
        "id": str(document.get("doc_id") or document.get("id") or ""),
        "doc_id": str(document.get("doc_id") or document.get("id") or ""),
        "tmdb_id": document.get("tmdb_id"),
        "search_score": document.get("@search.score"),
        "reranker_score": document.get("@search.reranker_score"),
        "title": document.get("title") or "",
        "title_ko": document.get("title_ko") or document.get("title") or "",
        "original_title": document.get("original_title") or "",
        "release_date": document.get("release_date") or "",
        "overview": document.get("overview") or "",
        "combined_text": document.get("combined_text") or "",
        "reviews_combined": document.get("reviews_combined") or "",
        "genres": genres if isinstance(genres, list) else [],
        "director": document.get("director") or "",
        "cast": cast if isinstance(cast, list) else [],
        "cast_top5": cast_top5 if isinstance(cast_top5, list) else [],
        "year": year,
        "runtime": document.get("runtime"),
        "vote_average": document.get("vote_average"),
        "vote_count": document.get("vote_count"),
        "poster_url": document.get("poster_url") or None,
        "keywords": document.get("keywords") or "",
        "plot_complexity": document.get("plot_complexity"),
        "pacing": document.get("pacing"),
        "emotional_intensity": document.get("emotional_intensity"),
        "visual_score": document.get("visual_score"),
    }


def search_movies(
    query: str,
    top: int = 10,
    mode: str = "hybrid",
    genre: str | None = None,
    excluded_genres: list[str] | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    plot_complexity_target: int | None = None,
    pacing_target: int | None = None,
    visual_score_target: int | None = None,
) -> dict:
    client = _get_search_client()
    existing_fields = _get_index_fields()
    safe_top = max(1, min(int(top), 50))
    search_text = query.strip() or "*"
    filter_expression = _build_search_filter(
        genre=genre,
        excluded_genres=excluded_genres,
        year_from=year_from,
        year_to=year_to,
    )

    search_fields = [field for field in HYBRID_SEARCH_FIELDS if field in existing_fields]
    use_hybrid = mode == "hybrid" and search_text != "*" and VECTOR_FIELD_NAME in existing_fields
    vector_queries = None
    if use_hybrid:
        vector_queries = _build_vector_queries(
            client=client,
            search_text=search_text,
            filter_expression=filter_expression,
            search_fields=search_fields,
            safe_top=safe_top,
        )
        use_hybrid = bool(vector_queries)

    search_kwargs = {
        "top": safe_top,
        "filter": filter_expression,
        "select": _available_select_fields(),
        "include_total_count": True,
    }
    if search_fields:
        search_kwargs["search_fields"] = search_fields
    if use_hybrid:
        search_kwargs["query_type"] = "semantic"
        search_kwargs["semantic_configuration_name"] = SEMANTIC_CONFIGURATION_NAME
        search_kwargs["semantic_query"] = search_text
        search_kwargs["vector_queries"] = vector_queries
        search_kwargs["vector_filter_mode"] = "postFilter"

    try:
        results = client.search(search_text=search_text, **search_kwargs)

        items = [normalize_search_movie(doc) for doc in results]
        total_count = results.get_count()
        return {
            "query": search_text,
            "mode": "hybrid" if use_hybrid else "keyword",
            "top": safe_top,
            "filter": filter_expression,
            "count": total_count if total_count is not None else len(items),
            "items": items,
        }
    except HttpResponseError as exc:
        if use_hybrid:
            print(f"[Deping] Azure Search hybrid query failed, fallback to lexical: {exc}")
            lexical_results = client.search(
                search_text=search_text,
                top=safe_top,
                filter=filter_expression,
                select=_available_select_fields(),
                include_total_count=True,
                search_fields=search_fields or None,
            )
            items = [normalize_search_movie(doc) for doc in lexical_results]
            total_count = lexical_results.get_count()
            return {
                "query": search_text,
                "mode": "keyword",
                "top": safe_top,
                "filter": filter_expression,
                "count": total_count if total_count is not None else len(items),
                "items": items,
            }
        print(f"[Deping] Azure Search query failed: {exc}")
        raise
    except Exception as exc:
        print(f"[Deping] Azure Search unexpected error: {exc}")
        raise
