from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.searcher import run_searcher


def _summarize_items(items: list[dict], include_rerank: bool) -> list[dict]:
    summarized = []
    for item in items[:15]:
        row = {
            "doc_id": item.get("doc_id") or item.get("id"),
            "title": item.get("title_ko") or item.get("title"),
            "search_score": item.get("search_score"),
        }
        if include_rerank:
            row["rerank_score"] = item.get("reranker_score")
            row["final_rank_score"] = item.get("final_rank_score")
        summarized.append(row)
    return summarized


def main() -> int:
    load_dotenv(ROOT_DIR / ".env")
    profiles = json.loads((ROOT_DIR / "evaluations" / "test_profiles.json").read_text(encoding="utf-8"))
    comparisons = []

    for entry in profiles[:10]:
        profile = entry.get("profile") or {}
        hybrid = run_searcher(profile, mode="hybrid")
        keyword = run_searcher(profile, mode="keyword")
        comparisons.append(
            {
                "profile_id": entry.get("id"),
                "description": entry.get("description"),
                "hybrid_results": _summarize_items(hybrid.get("items", []), include_rerank=True),
                "keyword_results": _summarize_items(keyword.get("items", []), include_rerank=False),
            }
        )

    output_path = ROOT_DIR / "evaluations" / "runs" / f"{datetime.now().strftime('%Y-%m-%d')}_search_mode_compare.json"
    output_path.write_text(json.dumps(comparisons, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output_path": str(output_path), "profiles": len(comparisons)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
