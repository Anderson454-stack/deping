from __future__ import annotations

import itertools
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVALUATIONS_DIR = ROOT / "evaluations"
RUNS_DIR = EVALUATIONS_DIR / "runs"
REPORT_PATH = EVALUATIONS_DIR / "discrimination_report.md"

CONTRAST_PAIRS = [
    ("p01_calm", "p03_energy"),
    ("p01_calm", "p10_intense"),
    ("p02_down", "p03_energy"),
    ("p05_story", "p06_visual"),
    ("p07_fast", "p08_complex"),
    ("p09_comfort", "p10_intense"),
]


def _latest_run_file() -> Path:
    run_files = sorted(RUNS_DIR.glob("*.jsonl"))
    if not run_files:
        raise FileNotFoundError("evaluations/runs/*.jsonl 파일이 없습니다. 먼저 baseline eval을 실행하세요.")
    return run_files[-1]


def _jaccard(left: set[str], right: set[str]) -> float:
    if not left and not right:
        return 1.0
    union = left | right
    if not union:
        return 0.0
    return len(left & right) / len(union)


def main() -> None:
    run_file = _latest_run_file()
    profile_rows = {}

    with run_file.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            profile_rows[row["profile_id"]] = row

    comparisons = []
    for left_id, right_id in itertools.combinations(sorted(profile_rows), 2):
        left_titles = {
            item.get("title_ko") or item.get("title")
            for item in profile_rows[left_id].get("results", [])[:10]
            if item.get("title_ko") or item.get("title")
        }
        right_titles = {
            item.get("title_ko") or item.get("title")
            for item in profile_rows[right_id].get("results", [])[:10]
            if item.get("title_ko") or item.get("title")
        }
        comparisons.append(
            {
                "pair": (left_id, right_id),
                "jaccard": _jaccard(left_titles, right_titles),
                "overlap": sorted(left_titles & right_titles),
            }
        )

    overall_avg = sum(item["jaccard"] for item in comparisons) / len(comparisons)
    contrast_items = [item for item in comparisons if item["pair"] in CONTRAST_PAIRS or tuple(reversed(item["pair"])) in CONTRAST_PAIRS]
    contrast_avg = sum(item["jaccard"] for item in contrast_items) / len(contrast_items) if contrast_items else 0.0
    most_similar = sorted(comparisons, key=lambda item: item["jaccard"], reverse=True)[:3]
    most_distinct = sorted(comparisons, key=lambda item: item["jaccard"])[:3]

    lines = [
        "# Discrimination Report",
        "",
        f"- source run: `{run_file.name}`",
        f"- overall pair average Jaccard: `{overall_avg:.3f}`",
        f"- contrast pair average Jaccard: `{contrast_avg:.3f}`",
        "",
        "## Most Similar Pairs",
    ]
    for item in most_similar:
        lines.append(f"- `{item['pair'][0]}` vs `{item['pair'][1]}`: `{item['jaccard']:.3f}`")
        lines.append(f"  overlap: {', '.join(item['overlap']) if item['overlap'] else '(none)'}")

    lines.extend(["", "## Most Distinct Pairs"])
    for item in most_distinct:
        lines.append(f"- `{item['pair'][0]}` vs `{item['pair'][1]}`: `{item['jaccard']:.3f}`")
        lines.append(f"  overlap: {', '.join(item['overlap']) if item['overlap'] else '(none)'}")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[Discrimination] wrote report to {REPORT_PATH}")


if __name__ == "__main__":
    main()
