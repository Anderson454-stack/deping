from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVALUATIONS_DIR = ROOT / "evaluations"
RUNS_DIR = EVALUATIONS_DIR / "runs"
REPORT_PATH = EVALUATIONS_DIR / "bias_report.md"

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


def main() -> None:
    run_file = _latest_run_file()
    rows = []
    with run_file.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))

    genre_counts: dict[str, int] = {}
    vote_averages: list[float] = []
    profile_title_map: dict[str, dict[str, dict]] = {}
    for row in rows:
        title_map = {}
        for item in row.get("results", [])[:10]:
            title = item.get("title_ko") or item.get("title")
            if not title:
                continue
            title_map[title] = item
            for genre in item.get("genres", []) or []:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
            vote_average = item.get("vote_average")
            if isinstance(vote_average, (int, float)):
                vote_averages.append(float(vote_average))
        profile_title_map[row["profile_id"]] = title_map

    top_genres = sorted(genre_counts.items(), key=lambda item: (-item[1], item[0]))[:10]
    avg_vote = sum(vote_averages) / len(vote_averages) if vote_averages else 0.0
    min_vote = min(vote_averages) if vote_averages else 0.0
    max_vote = max(vote_averages) if vote_averages else 0.0

    lines = [
        "# Baseline Bias Report",
        "",
        f"- source run: `{run_file.name}`",
        f"- total evaluated results: `{sum(len(row.get('results', [])[:10]) for row in rows)}`",
        f"- average vote_average (TMDB proxy for popularity/quality): `{avg_vote:.2f}`",
        f"- min vote_average: `{min_vote:.2f}`",
        f"- max vote_average: `{max_vote:.2f}`",
        "- note: `rating_imdb` field is not available in the current Azure Search document shape, so this report uses `vote_average`.",
        "",
        "## Genre Distribution",
    ]
    for genre, count in top_genres:
        lines.append(f"- `{genre}`: `{count}`")

    lines.extend(["", "## Shared Titles Across Contrast Pairs"])
    for left_id, right_id in CONTRAST_PAIRS:
        left_titles = set(profile_title_map.get(left_id, {}))
        right_titles = set(profile_title_map.get(right_id, {}))
        shared = sorted(left_titles & right_titles)
        left_query = next((row.get("query") for row in rows if row.get("profile_id") == left_id), "")
        right_query = next((row.get("query") for row in rows if row.get("profile_id") == right_id), "")
        lines.append(f"- `{left_id}` vs `{right_id}`")
        lines.append(f"  shared_titles: {', '.join(shared) if shared else '(none)'}")
        lines.append(f"  left_query: {left_query}")
        lines.append(f"  right_query: {right_query}")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[BiasReport] wrote report to {REPORT_PATH}")


if __name__ == "__main__":
    main()
