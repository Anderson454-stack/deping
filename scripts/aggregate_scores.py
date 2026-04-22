from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVALUATIONS_DIR = ROOT / "evaluations"
SCORING_SHEET_PATH = EVALUATIONS_DIR / "scoring_sheet.csv"
RUN_MAPPING_PATH = EVALUATIONS_DIR / "run_mapping.json"
REPORT_PATH = EVALUATIONS_DIR / "aggregate_report.md"

SCORE_FIELDS = ("genre_fit", "mood_fit", "emotion_fit", "overall")


def _load_scores() -> list[dict]:
    if not SCORING_SHEET_PATH.exists():
        raise FileNotFoundError("evaluations/scoring_sheet.csv 파일이 없습니다.")
    with SCORING_SHEET_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _load_run_mapping() -> dict:
    if not RUN_MAPPING_PATH.exists():
        raise FileNotFoundError("evaluations/run_mapping.json 파일이 없습니다.")
    return json.loads(RUN_MAPPING_PATH.read_text(encoding="utf-8"))


def _to_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def main() -> None:
    rows = _load_scores()
    mapping = _load_run_mapping()

    mode_scores: dict[str, dict[str, list[float]]] = {}
    profile_scores: dict[str, dict[str, list[float]]] = {}

    for row in rows:
        run_id = row.get("run_id", "")
        mode = mapping.get(run_id, {}).get("mode", "unknown")
        mode_scores.setdefault(mode, {field: [] for field in SCORE_FIELDS})
        profile_id = row.get("profile_id", "")
        profile_scores.setdefault(profile_id, {field: [] for field in SCORE_FIELDS})

        for field in SCORE_FIELDS:
            score = _to_float(row.get(field, ""))
            if score is None:
                continue
            mode_scores[mode][field].append(score)
            profile_scores[profile_id][field].append(score)

    lines = [
        "# Aggregate Score Report",
        "",
        "## By Mode",
    ]
    for mode, scores in sorted(mode_scores.items()):
        lines.append(f"- `{mode}`")
        for field in SCORE_FIELDS:
            avg = _mean(scores[field])
            lines.append(f"  {field}: {avg:.3f}" if avg is not None else f"  {field}: (no scored rows)")

    lines.extend(["", "## By Profile"])
    for profile_id, scores in sorted(profile_scores.items()):
        lines.append(f"- `{profile_id}`")
        for field in SCORE_FIELDS:
            avg = _mean(scores[field])
            lines.append(f"  {field}: {avg:.3f}" if avg is not None else f"  {field}: (no scored rows)")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[AggregateScores] wrote report to {REPORT_PATH}")


if __name__ == "__main__":
    main()
