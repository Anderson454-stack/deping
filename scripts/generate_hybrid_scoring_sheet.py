from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "evaluations" / "runs" / "2026-04-21_hybrid_full.jsonl"
OUTPUT_PATH = ROOT / "evaluations" / "hybrid_scoring_sheet.csv"


def main() -> int:
    rows: list[dict] = []
    with INPUT_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            entry = json.loads(line)
            for rank, item in enumerate(entry.get("curator_recommendations", []), start=1):
                rows.append(
                    {
                        "profile_id": entry.get("profile_id"),
                        "rec_rank": rank,
                        "title": item.get("title_ko") or item.get("title") or "",
                        "reason": item.get("reason") or "",
                        "cognitive_match": item.get("cognitive_match") or "",
                        "relevance_score": "",
                        "reasoning_quality": "",
                        "personalization_score": "",
                        "total": "",
                    }
                )

    with OUTPUT_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "profile_id",
                "rec_rank",
                "title",
                "reason",
                "cognitive_match",
                "relevance_score",
                "reasoning_quality",
                "personalization_score",
                "total",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"[HybridScoringSheet] wrote {len(rows)} rows to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
