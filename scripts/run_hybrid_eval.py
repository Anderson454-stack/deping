from __future__ import annotations

"""
GPT-5 실호출이 포함되므로 API 비용이 발생합니다.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.curator import run_curator_pipeline
from agents.profile_normalizer import normalize_profile
from agents.searcher import run_searcher


EVALUATIONS_DIR = ROOT / "evaluations"
RUNS_DIR = EVALUATIONS_DIR / "runs"
TEST_PROFILES_PATH = EVALUATIONS_DIR / "test_profiles.json"
OUTPUT_PATH = RUNS_DIR / "2026-04-21_hybrid_full.jsonl"


def _load_test_profiles() -> list[dict]:
    return json.loads(TEST_PROFILES_PATH.read_text(encoding="utf-8"))


def _candidate_row(item: dict) -> dict:
    return {
        "doc_id": item.get("doc_id") or item.get("id"),
        "title": item.get("title"),
        "title_ko": item.get("title_ko"),
        "search_score": item.get("search_score"),
        "rerank_score": item.get("reranker_score"),
        "final_rank_score": item.get("final_rank_score"),
    }


def _recommendation_row(item: dict) -> dict:
    return {
        "title": item.get("title"),
        "title_ko": item.get("title_ko"),
        "reason": item.get("reason"),
        "cognitive_match": item.get("cognitive_match"),
    }


def main() -> int:
    load_dotenv(ROOT / ".env")
    EVALUATIONS_DIR.mkdir(exist_ok=True)
    RUNS_DIR.mkdir(exist_ok=True)

    records: list[str] = []
    failed_profiles = 0

    for index, entry in enumerate(_load_test_profiles(), start=1):
        profile_id = entry.get("id")
        profile = entry.get("profile") or {}
        normalized_profile = normalize_profile(profile)
        timestamp = datetime.now().astimezone().isoformat(timespec="seconds")

        search_result = run_searcher(profile, mode="hybrid")
        candidates = search_result.get("items", [])[:15]

        record = {
            "profile_id": profile_id,
            "profile_desc": entry.get("description", ""),
            "timestamp": timestamp,
            "searcher_candidates": [_candidate_row(item) for item in candidates],
            "curator_recommendations": [],
            "reasoning_log": None,
        }

        try:
            recommendations, diagnostics = run_curator_pipeline(
                profile=profile,
                normalized_profile=normalized_profile,
                candidates=candidates,
            )
            payload = diagnostics.get("payload") if isinstance(diagnostics, dict) else {}
            record["curator_recommendations"] = [_recommendation_row(item) for item in recommendations[:3]]
            record["reasoning_log"] = payload.get("overall_reasoning") if isinstance(payload, dict) else None
        except Exception as exc:
            failed_profiles += 1
            record["curator_recommendations"] = []
            record["reasoning_log"] = str(exc)

        records.append(json.dumps(record, ensure_ascii=False))

        if index < len(_load_test_profiles()):
            time.sleep(2)

    OUTPUT_PATH.write_text("\n".join(records) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output_path": str(OUTPUT_PATH),
                "profile_count": len(records),
                "failed_profiles": failed_profiles,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
