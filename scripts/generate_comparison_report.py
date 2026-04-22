from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.searcher import run_searcher, score_candidate_against_profile


KEYWORD_PATH = ROOT / "evaluations" / "runs" / "2026-04-19_keyword.jsonl"
HYBRID_PATH = ROOT / "evaluations" / "runs" / "2026-04-21_hybrid_full.jsonl"
COMPARE_PATH = ROOT / "evaluations" / "runs" / "2026-04-21_search_mode_compare.json"
PROFILES_PATH = ROOT / "evaluations" / "test_profiles.json"
OUTPUT_PATH = ROOT / "evaluations" / "keyword_vs_hybrid_report.md"


def _load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def _build_profile_lookup() -> dict[str, dict]:
    profiles = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
    return {entry["id"]: entry.get("profile") or {} for entry in profiles}


def _title_list(items: list[dict], key: str | None = None, limit: int = 3) -> list[str]:
    titles = []
    for item in items[:limit]:
        if key:
            titles.append(item.get(key) or item.get("title") or item.get("title_ko") or "")
        else:
            titles.append(item.get("title_ko") or item.get("title") or "")
    return titles


def _cognitive_summary(profile: dict, recommendations: list[dict]) -> dict:
    if not recommendations:
        return {"avg_total": None, "details": []}
    details = []
    totals = []
    for item in recommendations:
        score = score_candidate_against_profile(profile, item)
        details.append(
            {
                "title": item.get("title_ko") or item.get("title"),
                "total": round(score["total"], 3),
                "axes": score["axes"],
            }
        )
        totals.append(score["total"])
    return {
        "avg_total": round(sum(totals) / len(totals), 3),
        "details": details,
    }


def _compare_summary(compare_row: dict) -> dict:
    hybrid = compare_row.get("hybrid_results", [])[:15]
    keyword = compare_row.get("keyword_results", [])[:15]
    hybrid_ids = {str(item.get("doc_id")) for item in hybrid if item.get("doc_id") is not None}
    keyword_ids = {str(item.get("doc_id")) for item in keyword if item.get("doc_id") is not None}
    intersection = hybrid_ids & keyword_ids
    union = hybrid_ids | keyword_ids
    jaccard = (len(intersection) / len(union)) if union else 1.0
    hybrid_only = [
        item.get("title") or item.get("title_ko") or ""
        for item in hybrid
        if str(item.get("doc_id")) in (hybrid_ids - keyword_ids)
    ]
    keyword_only = [
        item.get("title") or item.get("title_ko") or ""
        for item in keyword
        if str(item.get("doc_id")) in (keyword_ids - hybrid_ids)
    ]
    return {
        "jaccard": jaccard,
        "hybrid_only_top5": hybrid_only[:5],
        "keyword_only_top5": keyword_only[:5],
    }


def _normalize_title(value: str | None) -> str:
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum())


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _candidate_lookup(candidates: list[dict]) -> tuple[dict[str, dict], dict[str, dict]]:
    by_doc_id: dict[str, dict] = {}
    by_title: dict[str, dict] = {}
    for candidate in candidates:
        doc_id = str(candidate.get("doc_id") or candidate.get("id") or "").strip()
        if doc_id:
            by_doc_id[doc_id] = candidate
        for title_key in ("title_ko", "title"):
            normalized = _normalize_title(candidate.get(title_key))
            if normalized and normalized not in by_title:
                by_title[normalized] = candidate
    return by_doc_id, by_title


def _match_recommendations_to_candidates(
    recommendations: list[dict],
    candidates: list[dict],
) -> list[dict]:
    by_doc_id, by_title = _candidate_lookup(candidates)
    matched = []
    for recommendation in recommendations:
        doc_id = str(recommendation.get("doc_id") or recommendation.get("id") or recommendation.get("tmdb_id") or "").strip()
        candidate = by_doc_id.get(doc_id) if doc_id else None
        match_type = "doc_id" if candidate else None
        if candidate is None:
            for title_key in ("title_ko", "title"):
                normalized = _normalize_title(recommendation.get(title_key))
                if normalized and normalized in by_title:
                    candidate = by_title[normalized]
                    match_type = f"title:{title_key}"
                    break
        matched.append(
            {
                "recommendation": recommendation,
                "candidate": candidate,
                "match_type": match_type,
            }
        )
    return matched


def _hybrid_candidate_pool(profile: dict, row: dict) -> list[dict]:
    expected_ids = {
        str(item.get("doc_id") or item.get("id") or "").strip()
        for item in row.get("searcher_candidates", [])
        if str(item.get("doc_id") or item.get("id") or "").strip()
    }
    live_candidates = run_searcher(profile, mode="hybrid").get("items", [])
    if not expected_ids:
        return live_candidates
    filtered = [
        candidate
        for candidate in live_candidates
        if str(candidate.get("doc_id") or candidate.get("id") or "").strip() in expected_ids
    ]
    return filtered or live_candidates


def _keyword_candidate_pool(row: dict) -> list[dict] | None:
    results = row.get("results", [])
    if not results:
        return None
    first = results[0]
    if not any(field in first for field in ("title_ko", "title")):
        return None
    numeric_axes = ("pacing", "plot_complexity", "emotional_intensity", "visual_score")
    if not any(_is_number(first.get(axis)) for axis in numeric_axes):
        return None
    candidates = []
    for item in results:
        if any(
            item.get(axis) is not None and not _is_number(item.get(axis))
            for axis in numeric_axes
        ):
            return None
        candidates.append(
            {
                "doc_id": str(item.get("tmdb_id") or item.get("doc_id") or ""),
                "tmdb_id": item.get("tmdb_id"),
                "title": item.get("title"),
                "title_ko": item.get("title_ko") or item.get("title"),
                "pacing": item.get("pacing"),
                "plot_complexity": item.get("plot_complexity"),
                "emotional_intensity": item.get("emotional_intensity"),
                "visual_score": item.get("visual_score"),
            }
        )
    return candidates


def _cognitive_summary_from_matches(profile: dict, matches: list[dict]) -> dict:
    details = []
    totals = []
    for matched in matches:
        recommendation = matched["recommendation"]
        candidate = matched["candidate"]
        if candidate is None:
            details.append(
                {
                    "title": recommendation.get("title_ko") or recommendation.get("title"),
                    "matched": False,
                    "match_type": None,
                    "total": None,
                    "axes": None,
                }
            )
            continue
        score = score_candidate_against_profile(profile, candidate)
        details.append(
            {
                "title": recommendation.get("title_ko") or recommendation.get("title"),
                "matched": True,
                "match_type": matched.get("match_type"),
                "total": round(score["total"], 3),
                "axes": score["axes"],
            }
        )
        totals.append(score["total"])
    return {
        "avg_total": round(sum(totals) / len(totals), 3) if totals else None,
        "details": details,
    }


def main() -> int:
    keyword_rows = {row["profile_id"]: row for row in _load_jsonl(KEYWORD_PATH)}
    hybrid_rows = {row["profile_id"]: row for row in _load_jsonl(HYBRID_PATH)}
    compare_rows = {row["profile_id"]: row for row in json.loads(COMPARE_PATH.read_text(encoding="utf-8"))}
    profile_lookup = _build_profile_lookup()

    compare_summaries = {profile_id: _compare_summary(row) for profile_id, row in compare_rows.items()}
    jaccards = [row["jaccard"] for row in compare_summaries.values()]
    lines = [
        "# Keyword vs Hybrid Report",
        "",
        f"- 평균 Jaccard: {sum(jaccards)/len(jaccards):.4f}" if jaccards else "- 평균 Jaccard: 0.0000",
        "",
        "## Profile Breakdown",
        "",
    ]

    for profile_id in sorted(compare_rows.keys()):
        compare = compare_rows[profile_id]
        compare_summary = compare_summaries[profile_id]
        keyword = keyword_rows.get(profile_id, {})
        hybrid = hybrid_rows.get(profile_id, {})
        profile = profile_lookup.get(profile_id, {})
        keyword_titles = _title_list(keyword.get("results", []), key="title_ko", limit=3)
        hybrid_titles = _title_list(hybrid.get("curator_recommendations", []), limit=3)

        hybrid_candidates = _hybrid_candidate_pool(profile, hybrid)
        hybrid_matches = _match_recommendations_to_candidates(
            hybrid.get("curator_recommendations", []),
            hybrid_candidates,
        )
        hybrid_cognitive = _cognitive_summary_from_matches(profile, hybrid_matches)

        keyword_candidate_pool = _keyword_candidate_pool(keyword)
        keyword_matches = (
            _match_recommendations_to_candidates(keyword.get("results", [])[:3], keyword_candidate_pool)
            if keyword_candidate_pool is not None
            else []
        )
        keyword_cognitive = (
            _cognitive_summary_from_matches(profile, keyword_matches)
            if keyword_candidate_pool is not None
            else None
        )

        lines.extend(
            [
                f"### {profile_id}",
                f"- 설명: {compare.get('description', '')}",
                f"- Jaccard: {compare_summary['jaccard']:.4f}",
                f"- Hybrid-only 상위 5편: {', '.join(compare_summary.get('hybrid_only_top5', [])) or '-'}",
                f"- Keyword-only 상위 5편: {', '.join(compare_summary.get('keyword_only_top5', [])) or '-'}",
                f"- Keyword 상위 3편: {', '.join(keyword_titles) or '-'}",
                f"- Hybrid 최종 추천 3편: {', '.join(hybrid_titles) or '-'}",
                (
                    f"- Hybrid 추천 cognitive 평균 점수: {hybrid_cognitive['avg_total']:.3f}"
                    if hybrid_cognitive["avg_total"] is not None
                    else "- Hybrid 추천 cognitive 평균 점수: 매칭 불가"
                ),
                (
                    f"- Keyword baseline cognitive 평균 점수: {keyword_cognitive['avg_total']:.3f}"
                    if keyword_cognitive and keyword_cognitive["avg_total"] is not None
                    else "- Keyword baseline에는 cognitive 필드가 포함되지 않아 비교 불가"
                ),
                "",
            ]
        )
        lines.append("- Hybrid 추천 cognitive 상세:")
        for detail in hybrid_cognitive["details"]:
            if not detail["matched"]:
                lines.append(f"  - {detail['title']}: 매칭 불가")
                continue
            lines.append(
                f"  - {detail['title']}: total={detail['total']:.3f}, "
                f"match={detail['match_type']}, "
                f"plot={detail['axes']['plot_complexity']:.3f}, "
                f"pacing={detail['axes']['pacing']:.3f}, "
                f"visual={detail['axes']['visual_score']:.3f}"
            )
        if keyword_cognitive is None:
            lines.append("- Keyword baseline cognitive 상세: keyword baseline에는 cognitive 필드가 포함되지 않아 비교 불가")
        else:
            lines.append("- Keyword baseline cognitive 상세:")
            for detail in keyword_cognitive["details"]:
                if not detail["matched"]:
                    lines.append(f"  - {detail['title']}: 매칭 불가")
                    continue
                lines.append(
                    f"  - {detail['title']}: total={detail['total']:.3f}, "
                    f"match={detail['match_type']}, "
                    f"plot={detail['axes']['plot_complexity']:.3f}, "
                    f"pacing={detail['axes']['pacing']:.3f}, "
                    f"visual={detail['axes']['visual_score']:.3f}"
                )
        lines.append("")

    OUTPUT_PATH.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"[ComparisonReport] wrote report to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
