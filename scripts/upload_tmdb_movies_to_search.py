from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from search_indexing import (
    DEFAULT_SOURCE_PATH,
    UploadVerification,
    create_search_clients,
    load_source_documents,
    normalize_documents,
    recreate_index,
    upload_documents_in_batches,
    verify_uploaded_documents,
)
from search_service import search_movies


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Normalize tmdb_movies_final.json and push documents to Azure AI Search."
    )
    parser.add_argument(
        "--source",
        default=str(DEFAULT_SOURCE_PATH),
        help="Path to the source top-level JSON array.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=200,
        help="Azure Search upload batch size.",
    )
    parser.add_argument(
        "--skip-recreate",
        action="store_true",
        help="Upload into the existing index without deleting/recreating it first.",
    )
    return parser


def _print_verification(verification: UploadVerification) -> None:
    print("[AzureSearchUpload] verification")
    print(
        json.dumps(
            {
                "source_count": verification.source_count,
                "uploaded_count": verification.uploaded_count,
                "empty_combined_text": verification.empty_combined_text,
                "empty_reviews_combined": verification.empty_reviews_combined,
                "empty_vectors": verification.empty_vectors,
                "missing_plot_complexity": verification.missing_plot_complexity,
                "missing_pacing": verification.missing_pacing,
                "missing_emotional_intensity": verification.missing_emotional_intensity,
                "missing_visual_score": verification.missing_visual_score,
                "sample_doc_id": verification.sample_doc_id,
                "sample_vector_length": verification.sample_vector_length,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    load_dotenv(ROOT_DIR / ".env")

    source_path = Path(args.source).resolve()
    raw_documents = load_source_documents(source_path)
    normalized_documents = normalize_documents(raw_documents)

    index_client, search_client, index_name = create_search_clients()

    print(
        f"[AzureSearchUpload] source={source_path} raw_count={len(raw_documents)} "
        f"normalized_count={len(normalized_documents)} index={index_name}"
    )

    if not args.skip_recreate:
        print(f"[AzureSearchUpload] recreating index={index_name}")
        recreate_index(index_client, index_name)

    success_count, failures = upload_documents_in_batches(
        search_client=search_client,
        documents=normalized_documents,
        batch_size=max(1, int(args.batch_size)),
    )
    print(
        f"[AzureSearchUpload] upload_complete success={success_count} "
        f"failure={len(failures)}"
    )

    for failure in failures[:20]:
        print(
            "[AzureSearchUpload][failure] "
            + json.dumps(failure, ensure_ascii=False)
        )

    verification = verify_uploaded_documents(
        search_client=search_client,
        source_count=len(normalized_documents),
    )
    _print_verification(verification)

    try:
        hybrid_check = search_movies(
            query="historical drama friendship",
            top=3,
            plot_complexity_target=3,
            pacing_target=3,
            visual_score_target=3,
        )
        print(
            "[AzureSearchUpload] hybrid_check "
            + json.dumps(
                {
                    "count": hybrid_check.get("count"),
                    "top_titles": [
                        item.get("title_ko") or item.get("title")
                        for item in hybrid_check.get("items", [])
                    ],
                },
                ensure_ascii=False,
            )
        )
    except Exception as exc:
        print(f"[AzureSearchUpload] hybrid_check_failed: {exc}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
