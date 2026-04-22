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

from agents.curator import run_curator_pipeline, validate_candidate_fields
from agents.profile_normalizer import normalize_profile
from agents.profiler import call_profiler
from agents.searcher import run_searcher


DEFAULT_MESSAGE = "오늘은 조금 나른하고 편안해서 잔잔하지만 몰입감 있는 영화를 보고 싶어요."


def _load_profile(profile_id: str | None) -> dict:
    profiles = json.loads((ROOT_DIR / "evaluations" / "test_profiles.json").read_text(encoding="utf-8"))
    if not profile_id:
        return profiles[0]["profile"]
    for entry in profiles:
        if entry.get("id") == profile_id:
            return entry.get("profile") or {}
    raise ValueError(f"profile not found: {profile_id}")


def main() -> int:
    """
    curator 포함 end-to-end 검증은 Azure OpenAI GPT 호출 비용이 발생할 수 있음.
    searcher 문제와 curator/LLM 문제를 분리하기 위해 단계별 검증을 우선 수행할 것.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=["profiler-searcher", "searcher-curator", "full"], default="searcher-curator")
    parser.add_argument("--profile-id", default=None)
    parser.add_argument("--message", default=DEFAULT_MESSAGE)
    args = parser.parse_args()

    load_dotenv(ROOT_DIR / ".env")

    if args.stage == "profiler-searcher":
        profiler_result = call_profiler(
            user_message=args.message,
            conversation_history=[],
            current_profile={},
            turn=0,
        )
        merged_profile = {**(profiler_result.get("profileUpdates") or {})}
        search_result = run_searcher(merged_profile)
        print(
            json.dumps(
                {
                    "stage": args.stage,
                    "profiler_profile_updates": profiler_result.get("profileUpdates"),
                    "search_count": search_result.get("count"),
                    "top_titles": [item.get("title_ko") or item.get("title") for item in search_result.get("items", [])[:5]],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    if args.stage == "searcher-curator":
        profile = _load_profile(args.profile_id)
        normalized_profile = normalize_profile(profile)
        search_result = run_searcher(profile)
        candidate_check = validate_candidate_fields(search_result.get("items", []))
        recommendations, diagnostics = run_curator_pipeline(
            profile=profile,
            normalized_profile=normalized_profile,
            candidates=search_result.get("items", []),
        )
        print(
            json.dumps(
                {
                    "stage": args.stage,
                    "candidate_check": candidate_check,
                    "recommendation_titles": [item.get("title_ko") or item.get("title") for item in recommendations],
                    "diagnostics": diagnostics,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    profiler_result = call_profiler(
        user_message=args.message,
        conversation_history=[],
        current_profile={},
        turn=0,
    )
    profile = profiler_result.get("profileUpdates") or {}
    normalized_profile = normalize_profile(profile)
    search_result = run_searcher(profile)
    candidate_check = validate_candidate_fields(search_result.get("items", []))
    recommendations, diagnostics = run_curator_pipeline(
        profile=profile,
        normalized_profile=normalized_profile,
        candidates=search_result.get("items", []),
    )
    print(
        json.dumps(
            {
                "stage": args.stage,
                "profile": profile,
                "candidate_check": candidate_check,
                "recommendation_titles": [item.get("title_ko") or item.get("title") for item in recommendations],
                "diagnostics": diagnostics,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
