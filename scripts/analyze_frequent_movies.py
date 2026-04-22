"""
모든 프로필의 top10을 합쳐서 3회 이상 등장한 영화를 집계한다.
등장 이유 분석용 메타데이터(장르, pacing, vote_average)를 함께 기록한다.

출력: evaluations/frequent_movies_report.md
"""

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUN_FILE = ROOT / "evaluations" / "runs" / "2026-04-19_keyword.jsonl"
OUT_FILE = ROOT / "evaluations" / "frequent_movies_report.md"

MIN_OCCURRENCE = 3


def main():
    movie_to_profiles = defaultdict(list)
    movie_meta = {}

    with open(RUN_FILE, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            pid = r["profile_id"]
            for result in r.get("results", []):
                title = result["title_ko"]
                movie_to_profiles[title].append(pid)
                if title not in movie_meta:
                    movie_meta[title] = {
                        "genres": result.get("genres", []),
                        "pacing": result.get("pacing", ""),
                        "vote_average": result.get("vote_average", result.get("rating_imdb", 0)),
                        "plot_complexity": result.get("plot_complexity", None),
                    }

    frequent = [
        (title, profiles) for title, profiles in movie_to_profiles.items()
        if len(profiles) >= MIN_OCCURRENCE
    ]
    frequent.sort(key=lambda x: -len(x[1]))

    lines = [
        "# Frequent Movies Report",
        "",
        f"source: `{RUN_FILE.name}`",
        f"기준: {MIN_OCCURRENCE}회 이상 등장",
        f"식별된 영화 수: {len(frequent)}",
        "",
        "## 반복 등장 영화 목록",
        "",
        "| 영화 | 등장 횟수 | 장르 | pacing | vote_average | 등장 프로필 |",
        "|---|---|---|---|---|---|",
    ]
    for title, profiles in frequent:
        meta = movie_meta[title]
        genres = ", ".join(meta["genres"])
        lines.append(
            f"| {title} | {len(profiles)} | {genres} | {meta['pacing']} | "
            f"{meta['vote_average']} | {', '.join(profiles)} |"
        )
    lines.append("")

    lines += [
        "## 반복 원인 분류 (수동 기입)",
        "",
        "각 영화가 왜 여러 프로필에 반복 등장하는지 분류:",
        "",
        "- [ ] 장르 매칭이 광범위 (예: 드라마가 여러 프로필에 걸침)",
        "- [ ] vote_average/popularity bias (인기작이 keyword score에서 유리)",
        "- [ ] overview 키워드 과다 매칭 (특정 단어가 여러 query에 걸림)",
        "- [ ] 기타:",
        "",
        "## Step 1 진입 시 관찰 포인트",
        "",
        "- Hybrid 도입 후 반복 횟수가 감소하는가?",
        "- 감소한다면 어떤 유형의 반복이 우선적으로 사라지는가?",
        "",
    ]

    OUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"[done] {OUT_FILE}")


if __name__ == "__main__":
    main()
