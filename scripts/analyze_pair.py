"""
두 프로필의 top10 결과를 비교 분석한다.
공통 영화, 각자의 고유 영화, 쿼리 차이를 리포트로 출력한다.

사용법:
    python scripts/analyze_pair.py <run_file> <profile_id_a> <profile_id_b>

예시:
    python scripts/analyze_pair.py evaluations/runs/2026-04-19_keyword.jsonl p01_calm p02_down
"""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_run(run_file, profile_id):
    with open(run_file, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            if r["profile_id"] == profile_id:
                return r
    raise ValueError(f"profile_id not found: {profile_id}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_file")
    ap.add_argument("profile_a")
    ap.add_argument("profile_b")
    args = ap.parse_args()

    run_path = ROOT / args.run_file if not Path(args.run_file).is_absolute() else Path(args.run_file)

    a = load_run(run_path, args.profile_a)
    b = load_run(run_path, args.profile_b)

    titles_a = {r["title_ko"]: r for r in a["results"]}
    titles_b = {r["title_ko"]: r for r in b["results"]}

    common = set(titles_a) & set(titles_b)
    only_a = set(titles_a) - set(titles_b)
    only_b = set(titles_b) - set(titles_a)

    out_dir = ROOT / "evaluations" / "pair_analysis"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / f"{args.profile_a}_vs_{args.profile_b}.md"

    lines = [
        f"# Pair Analysis — {args.profile_a} vs {args.profile_b}",
        "",
        f"source: `{run_path.name}`",
        f"mode: `{a.get('mode', 'unknown')}`",
        "",
        "## 쿼리 비교",
        "",
        f"**{args.profile_a}** query: `{a.get('query', '')}`",
        f"**{args.profile_a}** filters: `{a.get('filters', '')}`",
        "",
        f"**{args.profile_b}** query: `{b.get('query', '')}`",
        f"**{args.profile_b}** filters: `{b.get('filters', '')}`",
        "",
        "## Jaccard",
        "",
        f"- 공통: {len(common)}편",
        f"- 합집합: {len(set(titles_a) | set(titles_b))}편",
        f"- Jaccard: {len(common) / max(len(set(titles_a) | set(titles_b)), 1):.3f}",
        "",
        "## 공통 영화",
        "",
        "| 영화 | 장르 | pacing | vote_average |",
        "|---|---|---|---|",
    ]
    for title in sorted(common):
        r = titles_a[title]
        genres = ", ".join(r.get("genres", []))
        lines.append(f"| {title} | {genres} | {r.get('pacing', '-')} | {r.get('vote_average', r.get('rating_imdb', '-'))} |")
    lines.append("")

    lines += [
        f"## {args.profile_a}만 등장한 영화",
        "",
        "| 영화 | 장르 | pacing | vote_average |",
        "|---|---|---|---|",
    ]
    for title in sorted(only_a):
        r = titles_a[title]
        genres = ", ".join(r.get("genres", []))
        lines.append(f"| {title} | {genres} | {r.get('pacing', '-')} | {r.get('vote_average', r.get('rating_imdb', '-'))} |")
    lines.append("")

    lines += [
        f"## {args.profile_b}만 등장한 영화",
        "",
        "| 영화 | 장르 | pacing | vote_average |",
        "|---|---|---|---|",
    ]
    for title in sorted(only_b):
        r = titles_b[title]
        genres = ", ".join(r.get("genres", []))
        lines.append(f"| {title} | {genres} | {r.get('pacing', '-')} | {r.get('vote_average', r.get('rating_imdb', '-'))} |")
    lines.append("")

    lines += [
        "## 해석 가이드 (수동 기입)",
        "",
        "- 공통 영화의 공통 특성은?",
        "- 차이 영화의 핵심 갈림 요인은? (장르/pacing/vote_average/키워드)",
        "- Hybrid 도입 시 이 쌍의 Jaccard가 어떻게 변할지 가설:",
        "",
    ]

    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"[done] {out_file}")


if __name__ == "__main__":
    main()
