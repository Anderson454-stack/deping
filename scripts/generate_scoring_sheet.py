from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVALUATIONS_DIR = ROOT / "evaluations"
RUNS_DIR = EVALUATIONS_DIR / "runs"
SCORING_SHEET_PATH = EVALUATIONS_DIR / "scoring_sheet.csv"
RUN_MAPPING_PATH = EVALUATIONS_DIR / "run_mapping.json"


def _latest_run_file() -> Path:
    run_files = sorted(RUNS_DIR.glob("*.jsonl"))
    if not run_files:
        raise FileNotFoundError("evaluations/runs/*.jsonl 파일이 없습니다. 먼저 baseline eval을 실행하세요.")
    return run_files[-1]


def main() -> None:
    run_file = _latest_run_file()
    run_id = run_file.stem
    rows: list[dict] = []

    with run_file.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            for item in row.get("results", []):
                rows.append(
                    {
                        "run_id": run_id,
                        "profile_id": row.get("profile_id"),
                        "profile_desc": row.get("profile_desc", ""),
                        "rank": item.get("rank"),
                        "title_ko": item.get("title_ko") or item.get("title") or "",
                        "genre_fit": "",
                        "mood_fit": "",
                        "emotion_fit": "",
                        "overall": "",
                        "note": "",
                    }
                )

    with SCORING_SHEET_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "run_id",
                "profile_id",
                "profile_desc",
                "rank",
                "title_ko",
                "genre_fit",
                "mood_fit",
                "emotion_fit",
                "overall",
                "note",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    RUN_MAPPING_PATH.write_text(
        json.dumps(
            {
                run_id: {
                    "mode": "keyword",
                    "source_run_file": str(run_file.relative_to(ROOT)).replace("\\", "/"),
                }
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"[ScoringSheet] wrote {len(rows)} rows to {SCORING_SHEET_PATH}")


if __name__ == "__main__":
    main()
