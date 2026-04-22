from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.profile_normalizer import NUMERIC_PROFILE_FIELDS  # noqa: E402
from agents.searcher import run_searcher  # noqa: E402


EVALUATIONS_DIR = ROOT / "evaluations"
RUNS_DIR = EVALUATIONS_DIR / "runs"
TEST_PROFILES_PATH = EVALUATIONS_DIR / "test_profiles.json"


def _load_test_profiles() -> list[dict]:
    return json.loads(TEST_PROFILES_PATH.read_text(encoding="utf-8"))


def _build_result_row(profile_entry: dict, mode: str, run_timestamp: str, result: dict) -> dict:
    raw_profile = profile_entry.get("profile", {})
    items = result.get("items", [])[:10]
    return {
        "profile_id": profile_entry["id"],
        "profile_desc": profile_entry.get("description", ""),
        "mode": mode,
        "timestamp": run_timestamp,
        "query": result.get("query"),
        "filters": result.get("filter"),
        "raw": {field: raw_profile.get(field) for field in NUMERIC_PROFILE_FIELDS},
        "priority": raw_profile.get("priority", []),
        "avoidance": raw_profile.get("avoidance", []),
        "results": [
            {
                "rank": index,
                "title_ko": item.get("title_ko"),
                "title": item.get("title"),
                "tmdb_id": item.get("tmdb_id"),
                "search_score": item.get("search_score"),
                "genres": item.get("genres", []),
                "pacing": item.get("pacing"),
                "plot_complexity": item.get("plot_complexity"),
                "plot_complexity_level": item.get("plot_complexity_level"),
                "vote_average": item.get("vote_average"),
                "rating_imdb": item.get("vote_average"),
                "visual_level": item.get("visual_level"),
                "year": item.get("year"),
            }
            for index, item in enumerate(items, start=1)
        ],
    }


def main() -> None:
    mode = "keyword"
    run_timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    run_date = datetime.now().strftime("%Y-%m-%d")
    output_path = RUNS_DIR / f"{run_date}_{mode}.jsonl"

    EVALUATIONS_DIR.mkdir(exist_ok=True)
    RUNS_DIR.mkdir(exist_ok=True)

    lines: list[str] = []
    for entry in _load_test_profiles():
        result = run_searcher(entry["profile"])
        row = _build_result_row(entry, mode, run_timestamp, result)
        lines.append(json.dumps(row, ensure_ascii=False))

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[BaselineEval] wrote {len(lines)} profiles to {output_path}")


if __name__ == "__main__":
    main()
