"""
baseline run에서 top10이 10편 미만으로 반환된 프로필을 식별한다.
출력: evaluations/under_filled_profiles.md
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUN_FILE = ROOT / "evaluations" / "runs" / "2026-04-19_keyword.jsonl"
OUT_FILE = ROOT / "evaluations" / "under_filled_profiles.md"


def main():
    under_filled = []
    all_counts = []

    with open(RUN_FILE, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            count = len(r.get("results", []))
            all_counts.append((r["profile_id"], count))
            if count < 10:
                under_filled.append(
                    {
                        "profile_id": r["profile_id"],
                        "count": count,
                        "query": r.get("query", ""),
                        "filters": r.get("filters", ""),
                        "raw": r.get("raw", {}),
                    }
                )

    lines = [
        "# Under-filled Profiles (< 10 results)",
        "",
        f"baseline run: `{RUN_FILE.name}`",
        f"총 프로필 수: {len(all_counts)}",
        f"10편 미만 프로필 수: {len(under_filled)}",
        "",
        "## 전체 프로필 결과 수",
        "",
        "| profile_id | count |",
        "|---|---|",
    ]
    for pid, cnt in all_counts:
        lines.append(f"| {pid} | {cnt} |")
    lines.append("")

    if under_filled:
        lines += [
            "## 10편 미만 프로필 상세",
            "",
        ]
        for u in under_filled:
            lines += [
                f"### {u['profile_id']} ({u['count']}편)",
                "",
                f"- **query**: `{u['query']}`",
                f"- **filters**: `{u['filters']}`",
                f"- **raw profile**:",
                "  ```json",
                f"  {json.dumps(u['raw'], ensure_ascii=False, indent=2)}",
                "  ```",
                "",
                "**추정 원인 분류** (수동 기입 필요):",
                "- [ ] 필터가 강함 → 완화 검토",
                "- [ ] query가 좁음 → query 확장 검토",
                "- [ ] 문서 수 자체 부족 → 인덱스 확장 대기",
                "",
            ]
    else:
        lines.append("## 결과")
        lines.append("")
        lines.append("모든 프로필이 10편을 반환함. 조치 불필요.")
        lines.append("")

    lines += [
        "## Step 1 진입 전 결정 사항",
        "",
        "10편 미만 프로필이 존재할 경우, Phase B 완료 후 Hybrid 도입 전에 원인 분류를 마친다.",
        "필터/쿼리 문제는 Hybrid 도입으로 해결되지 않으므로 입력 설계 수정이 선행되어야 한다.",
        "",
    ]

    OUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"[done] {OUT_FILE}")


if __name__ == "__main__":
    main()
