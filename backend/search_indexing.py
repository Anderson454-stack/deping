from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    AzureOpenAIVectorizer,
    AzureOpenAIVectorizerParameters,
    HnswAlgorithmConfiguration,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SearchableField,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE_PATH = ROOT_DIR / "notebooks" / "data" / "processed" / "tmdb_movies_final.json"
SEMANTIC_CONFIGURATION_NAME = "movie-semantic-config"
VECTOR_PROFILE_NAME = "movie-vector-profile"
VECTOR_FIELD_NAME = "combined_text_vector"
VECTOR_DIMENSIONS = 1536


@dataclass(slots=True)
class UploadVerification:
    source_count: int
    uploaded_count: int
    empty_combined_text: int
    empty_reviews_combined: int
    empty_vectors: int
    missing_plot_complexity: int
    missing_pacing: int
    missing_emotional_intensity: int
    missing_visual_score: int
    sample_doc_id: str | None
    sample_vector_length: int


def _is_nan(value: Any) -> bool:
    return isinstance(value, float) and math.isnan(value)


def _clean_value(value: Any) -> Any:
    if _is_nan(value):
        return None
    return value


def _clean_text(value: Any) -> str | None:
    value = _clean_value(value)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _coerce_int(value: Any) -> int | None:
    value = _clean_value(value)
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _coerce_float(value: Any) -> float | None:
    value = _clean_value(value)
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _split_csv(value: Any) -> list[str]:
    text = _clean_text(value)
    if not text:
        return []
    return [part.strip() for part in text.split(",") if part.strip()]


def _normalize_vector(value: Any) -> list[float]:
    if not isinstance(value, list):
        raise ValueError("combined_text_vector must be a list")

    normalized: list[float] = []
    for item in value:
        item = _clean_value(item)
        if item is None:
            raise ValueError("combined_text_vector contains null/NaN")
        normalized.append(float(item))

    if len(normalized) != VECTOR_DIMENSIONS:
        raise ValueError(
            f"combined_text_vector must have {VECTOR_DIMENSIONS} dimensions, got {len(normalized)}"
        )
    return normalized


def _derive_doc_id(record: dict[str, Any], row_number: int) -> str:
    explicit_doc_id = _clean_text(record.get("doc_id"))
    if explicit_doc_id:
        return explicit_doc_id

    tmdb_id = _coerce_int(record.get("tmdb_id"))
    if tmdb_id is not None:
        return str(tmdb_id)

    raise ValueError(f"stable doc_id missing at row {row_number}")


def _build_reviews_combined(record: dict[str, Any]) -> str | None:
    reviews = []
    for index in range(1, 6):
        review = _clean_text(record.get(f"review_{index}"))
        if review:
            reviews.append(review)
    return "\n\n".join(reviews) if reviews else None


def _release_year(release_date: str | None) -> int | None:
    if not release_date:
        return None
    year_text = release_date[:4]
    return _coerce_int(year_text)


def normalize_movie_document(record: dict[str, Any], row_number: int) -> dict[str, Any]:
    doc_id = _derive_doc_id(record, row_number)
    title = _clean_text(record.get("title")) or _clean_text(record.get("original_title")) or doc_id
    original_title = _clean_text(record.get("original_title")) or title
    release_date = _clean_text(record.get("release_date"))
    cast_top5 = _split_csv(record.get("cast_top5"))
    combined_text = _clean_text(record.get("combined_text"))
    reviews_combined = _build_reviews_combined(record)
    vector = _normalize_vector(record.get(VECTOR_FIELD_NAME))

    if not combined_text:
        raise ValueError(f"combined_text missing for doc_id={doc_id}")

    document = {
        "doc_id": doc_id,
        "id": doc_id,
        "title": title,
        "title_ko": title,
        "original_title": original_title,
        "release_date": release_date,
        "year": _release_year(release_date),
        "tmdb_id": _coerce_int(record.get("tmdb_id")),
        "overview": _clean_text(record.get("overview")),
        "vote_average": _coerce_float(record.get("vote_average")),
        "vote_count": _coerce_int(record.get("vote_count")),
        "director": _clean_text(record.get("director")),
        "cast_top5": cast_top5,
        "cast": cast_top5,
        "poster_url": _clean_text(record.get("poster_url")),
        "genres": _split_csv(record.get("genres")),
        "runtime": _coerce_int(record.get("runtime")),
        "keywords": _clean_text(record.get("keywords")),
        "plot_complexity": _coerce_int(record.get("plot_complexity")),
        "pacing": _coerce_int(record.get("pacing")),
        "emotional_intensity": _coerce_int(record.get("emotional_intensity")),
        "visual_score": _coerce_int(record.get("visual_score")),
        "combined_text": combined_text,
        "reviews_combined": reviews_combined,
        VECTOR_FIELD_NAME: vector,
    }
    return document


def load_source_documents(source_path: Path = DEFAULT_SOURCE_PATH) -> list[dict[str, Any]]:
    with source_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("source JSON must be a top-level array")
    return data


def normalize_documents(raw_documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for row_number, record in enumerate(raw_documents, start=1):
        normalized.append(normalize_movie_document(record, row_number))
    return normalized


def _sanitize_openai_endpoint(endpoint: str) -> str:
    trimmed = endpoint.strip().rstrip("/")
    if trimmed.endswith("/v1"):
        return trimmed[:-3]
    return trimmed


def build_search_index(index_name: str) -> SearchIndex:
    vector_search = VectorSearch(
        algorithms=[HnswAlgorithmConfiguration(name="hnsw-config")],
        profiles=[
            VectorSearchProfile(
                name=VECTOR_PROFILE_NAME,
                algorithm_configuration_name="hnsw-config",
                vectorizer_name="openai-vectorizer",
            )
        ],
        vectorizers=[
            AzureOpenAIVectorizer(
                vectorizer_name="openai-vectorizer",
                parameters=AzureOpenAIVectorizerParameters(
                    resource_url=_sanitize_openai_endpoint(os.getenv("AZURE_OPENAI_ENDPOINT", "")),
                    api_key=os.getenv("AZURE_OPENAI_API_KEY", "").strip(),
                    deployment_name=os.getenv("AZURE_OPENAI_DEPLOY_EMBED", "text-embedding-3-small").strip(),
                    model_name="text-embedding-3-small",
                ),
            )
        ],
    )

    semantic_search = SemanticSearch(
        configurations=[
            SemanticConfiguration(
                name=SEMANTIC_CONFIGURATION_NAME,
                prioritized_fields=SemanticPrioritizedFields(
                    title_field=SemanticField(field_name="title"),
                    content_fields=[
                        SemanticField(field_name="combined_text"),
                        SemanticField(field_name="overview"),
                        SemanticField(field_name="reviews_combined"),
                    ],
                    keywords_fields=[
                        SemanticField(field_name="genres"),
                        SemanticField(field_name="director"),
                        SemanticField(field_name="keywords"),
                    ],
                ),
            )
        ]
    )

    fields = [
        SimpleField(name="doc_id", type="Edm.String", key=True, filterable=True, sortable=True),
        SimpleField(name="id", type="Edm.String", filterable=True, sortable=True),
        SearchableField(name="title", type="Edm.String", analyzer_name="ko.lucene", sortable=True),
        SearchableField(name="title_ko", type="Edm.String", analyzer_name="ko.lucene"),
        SearchableField(name="original_title", type="Edm.String"),
        SimpleField(name="release_date", type="Edm.String", filterable=True, sortable=True),
        SimpleField(name="year", type="Edm.Int32", filterable=True, sortable=True, facetable=True),
        SimpleField(name="tmdb_id", type="Edm.Int32", filterable=True, sortable=True),
        SearchableField(name="overview", type="Edm.String", analyzer_name="ko.lucene"),
        SimpleField(name="vote_average", type="Edm.Double", filterable=True, sortable=True),
        SimpleField(name="vote_count", type="Edm.Int32", filterable=True, sortable=True),
        SearchableField(name="director", type="Edm.String", analyzer_name="ko.lucene", filterable=True),
        SearchField(
            name="cast_top5",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
        ),
        SearchField(
            name="cast",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
        ),
        SimpleField(name="poster_url", type="Edm.String"),
        SearchField(
            name="genres",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
            filterable=True,
            facetable=True,
        ),
        SimpleField(name="runtime", type="Edm.Int32", filterable=True, sortable=True),
        SearchableField(name="keywords", type="Edm.String"),
        SimpleField(name="plot_complexity", type="Edm.Int32", filterable=True, sortable=True, facetable=True),
        SimpleField(name="pacing", type="Edm.Int32", filterable=True, sortable=True, facetable=True),
        SimpleField(name="emotional_intensity", type="Edm.Int32", filterable=True, sortable=True, facetable=True),
        SimpleField(name="visual_score", type="Edm.Int32", filterable=True, sortable=True, facetable=True),
        SearchableField(name="combined_text", type="Edm.String", analyzer_name="ko.lucene"),
        SearchableField(name="reviews_combined", type="Edm.String", analyzer_name="ko.lucene"),
        SearchField(
            name=VECTOR_FIELD_NAME,
            type="Collection(Edm.Single)",
            searchable=True,
            hidden=False,
            vector_search_dimensions=VECTOR_DIMENSIONS,
            vector_search_profile_name=VECTOR_PROFILE_NAME,
        ),
    ]

    return SearchIndex(
        name=index_name,
        fields=fields,
        vector_search=vector_search,
        semantic_search=semantic_search,
    )


def create_search_clients() -> tuple[SearchIndexClient, SearchClient, str]:
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

    credential = AzureKeyCredential(api_key)
    index_client = SearchIndexClient(endpoint=endpoint, credential=credential)
    search_client = SearchClient(endpoint=endpoint, index_name=index_name, credential=credential)
    return index_client, search_client, index_name


def recreate_index(index_client: SearchIndexClient, index_name: str) -> None:
    try:
        index_client.delete_index(index_name)
    except ResourceNotFoundError:
        pass
    index_client.create_index(build_search_index(index_name))


def upload_documents_in_batches(
    search_client: SearchClient,
    documents: list[dict[str, Any]],
    batch_size: int = 200,
) -> tuple[int, list[dict[str, str]]]:
    success_count = 0
    failures: list[dict[str, str]] = []

    for start in range(0, len(documents), batch_size):
        batch = documents[start : start + batch_size]
        results = search_client.upload_documents(documents=batch)
        batch_success = 0

        for result in results:
            if result.succeeded:
                success_count += 1
                batch_success += 1
                continue

            failures.append(
                {
                    "key": result.key,
                    "error_message": getattr(result, "error_message", "") or "unknown error",
                }
            )

        print(
            f"[AzureSearchUpload] batch={start // batch_size + 1} "
            f"size={len(batch)} success={batch_success} failure={len(batch) - batch_success}"
        )

    return success_count, failures


def verify_uploaded_documents(
    search_client: SearchClient,
    source_count: int,
) -> UploadVerification:
    uploaded_count = search_client.get_document_count()
    docs: list[dict[str, Any]] = []
    page_size = 1000
    for offset in range(0, uploaded_count, page_size):
        results = search_client.search(
            search_text="*",
            include_total_count=(offset == 0),
            top=page_size,
            skip=offset,
            select=[
                "doc_id",
                "combined_text",
                "reviews_combined",
                "plot_complexity",
                "pacing",
                "emotional_intensity",
                "visual_score",
                VECTOR_FIELD_NAME,
            ],
        )
        docs.extend(list(results))
    empty_combined_text = 0
    empty_reviews_combined = 0
    empty_vectors = 0
    missing_plot_complexity = 0
    missing_pacing = 0
    missing_emotional_intensity = 0
    missing_visual_score = 0

    for doc in docs:
        if not doc.get("combined_text"):
            empty_combined_text += 1
        if not doc.get("reviews_combined"):
            empty_reviews_combined += 1
        if not doc.get(VECTOR_FIELD_NAME):
            empty_vectors += 1
        if doc.get("plot_complexity") is None:
            missing_plot_complexity += 1
        if doc.get("pacing") is None:
            missing_pacing += 1
        if doc.get("emotional_intensity") is None:
            missing_emotional_intensity += 1
        if doc.get("visual_score") is None:
            missing_visual_score += 1

    sample = docs[0] if docs else {}
    return UploadVerification(
        source_count=source_count,
        uploaded_count=uploaded_count,
        empty_combined_text=empty_combined_text,
        empty_reviews_combined=empty_reviews_combined,
        empty_vectors=empty_vectors,
        missing_plot_complexity=missing_plot_complexity,
        missing_pacing=missing_pacing,
        missing_emotional_intensity=missing_emotional_intensity,
        missing_visual_score=missing_visual_score,
        sample_doc_id=sample.get("doc_id"),
        sample_vector_length=len(sample.get(VECTOR_FIELD_NAME) or []),
    )
