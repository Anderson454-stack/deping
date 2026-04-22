from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Callable

import requests


logger = logging.getLogger("deping.curator")


def _chat_api_versions() -> list[str]:
    return [
        version
        for version in (
            os.getenv("AZURE_OPENAI_CHAT_API_VERSION", "").strip(),
            os.getenv("AZURE_OPENAI_API_VERSION", "").strip(),
            "2024-10-21",
            "2024-06-01",
        )
        if version
    ]

CURATOR_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "recommendation_selection",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "selected_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "reasoning_log": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": {"type": "string"},
                            "reason": {"type": "string"},
                            "cognitive_match": {"type": "string"},
                        },
                        "required": ["id", "reason", "cognitive_match"],
                    },
                },
                "overall_reasoning": {"type": "string"},
            },
            "required": ["selected_ids", "reasoning_log", "overall_reasoning"],
        },
    },
}

CURATOR_PROMPT = """당신은 영화 추천 전문가 디핑입니다.
사용자 프로필을 분석하여 후보 목록 안에서만 영화 3편을 고르세요.

[절대 규칙]
- 응답은 반드시 순수 JSON만 출력하세요. 설명, 주석, 마크다운, 코드펜스 절대 금지.
- 첫 글자는 반드시 { 여야 합니다.
- 응답은 반드시 단일 JSON object 하나만 반환하세요.
- selected_ids에는 후보 목록에 있는 id만 넣으세요.
- 후보 데이터에 없는 값은 추측해서 만들지 마세요.
- 영화 상세 정보(poster_url, rating, runtime, year)는 서버가 후보 데이터로 합칩니다.
- reasoning_log는 반드시 배열이어야 하며, 각 항목은 id와 reason을 포함해야 합니다.
- overviews는 만들지 마세요. 줄거리는 서버의 후보 overview를 그대로 사용합니다.
- reason은 최대 50자.
- cognitive_match는 최대 60자.
- overall_reasoning은 한두 문장 이내의 짧은 총평으로 작성하세요.
- 3편은 가능하면 서로 다른 매력 포인트를 가지게 고르세요.
- code fence, 설명 문장, 서문, 사족을 절대 추가하지 마세요.
"""

CURATOR_RETRY_PROMPT = """이전 응답이 JSON 파싱 또는 스키마 검증에 실패했습니다.
이번에는 아래 규칙만 지켜 다시 출력하세요.

[재시도 절대 규칙]
- JSON만 반환하세요.
- 단일 JSON object만 반환하세요.
- 코드펜스, 설명, 서문, 후문 금지.
- selected_ids는 후보 목록 안의 id만 사용하세요.
- overviews는 생성하지 마세요.
- reasoning_log의 reason과 cognitive_match는 매우 짧게 유지하세요.
- 필수 키: selected_ids, reasoning_log, overall_reasoning
- 첫 글자는 {, 마지막 글자는 } 여야 합니다."""


def _call_curator_model(
    messages: list[dict],
    max_completion_tokens: int = 450,
    temperature: float = 0.3,
    response_format: dict | None = None,
) -> tuple[str, dict]:
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip().rstrip("/")
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-chat")

    if not endpoint or not api_key:
        raise ValueError("Azure OpenAI 환경변수가 없습니다.")
    if endpoint.endswith("/v1"):
        endpoint = endpoint[:-3]
    endpoint = f"{endpoint}/openai/deployments/{deployment}/chat/completions"

    payload_json = {
        "messages": messages,
        "max_completion_tokens": max_completion_tokens,
        "temperature": temperature,
    }
    if response_format:
        payload_json["response_format"] = response_format

    response = None
    last_error = None
    for api_version in _chat_api_versions():
        response = requests.post(
            endpoint,
            params={"api-version": api_version},
            headers={
                "Content-Type": "application/json",
                "api-key": api_key,
            },
            json=payload_json,
            timeout=30,
        )
        if response.ok:
            break
        last_error = f"{response.status_code}: {response.text[:300]}"
    if response is None or not response.ok:
        raise RuntimeError(f"Curator Azure OpenAI 호출 실패: {last_error}")
    payload = response.json()
    choices = payload.get("choices") or []
    content = ((choices[0] or {}).get("message") or {}).get("content", "") if choices else ""
    return content.strip(), {
        "usage": payload.get("usage"),
        "finish_reason": (choices[0] or {}).get("finish_reason") if choices else None,
        "model": payload.get("model"),
        "request_id": response.headers.get("x-request-id"),
        "response_format_used": response_format.get("type") if isinstance(response_format, dict) else None,
    }


def _safe_text(value, limit: int, default: str = "") -> str:
    text = value if isinstance(value, str) else default
    return text[:limit]


def _safe_list(value) -> list:
    return value if isinstance(value, list) else []


def _format_search_candidates(candidates: list[dict]) -> str:
    lines = []
    for movie in candidates:
        overview = (movie.get("overview") or "")[:80]
        lines.append(
            json.dumps(
                {
                    "id": str(movie.get("id") or ""),
                    "title_ko": movie.get("title_ko", ""),
                    "overview": overview,
                    "genres": movie.get("genres", []),
                    "director": movie.get("director", ""),
                    "year": movie.get("year"),
                },
                ensure_ascii=False,
            )
        )
    return "\n".join(lines)


def _sanitize_curator_json(text: str) -> str:
    cleaned = (text or "").replace("```json", "").replace("```", "").strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    return match.group(0).strip() if match else cleaned


def _has_unterminated_string(text: str) -> bool:
    in_string = False
    escaped = False
    for char in text:
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
    return in_string


def _detect_truncation_signals(text: str) -> list[str]:
    cleaned = (text or "").strip()
    signals: list[str] = []
    if not cleaned:
        signals.append("empty_response")
        return signals
    if _has_unterminated_string(cleaned):
        signals.append("unterminated_string")
    if cleaned.count("{") > cleaned.count("}"):
        signals.append("unclosed_object")
    if cleaned.count("[") > cleaned.count("]"):
        signals.append("unclosed_array")
    if cleaned and not cleaned.endswith("}"):
        signals.append("missing_closing_brace")
    return signals


def _summarize_raw_response(raw: str, edge: int = 300) -> dict:
    text = raw or ""
    return {
        "length": len(text),
        "head": text[:edge],
        "tail": text[-edge:] if len(text) > edge else text,
        "truncation_signals": _detect_truncation_signals(text),
    }


def _parse_curator_response(raw: str) -> tuple[dict | None, dict]:
    clean = _sanitize_curator_json(raw)
    diagnostics = {
        "raw_summary": _summarize_raw_response(raw),
        "sanitized_summary": _summarize_raw_response(clean),
        "parse_error": None,
    }
    try:
        return json.loads(clean), diagnostics
    except Exception as exc:
        diagnostics["parse_error"] = str(exc)
        return None, diagnostics


def normalize_candidate(candidate: dict) -> dict:
    normalized = dict(candidate or {})
    normalized["id"] = str(candidate.get("id") or candidate.get("doc_id") or "")
    normalized["doc_id"] = normalized["id"]
    normalized["title"] = candidate.get("title") or candidate.get("title_ko") or ""
    normalized["title_ko"] = candidate.get("title_ko") or normalized["title"]
    normalized["director"] = candidate.get("director") or ""
    normalized["genres"] = candidate.get("genres") if isinstance(candidate.get("genres"), list) else []
    cast = candidate.get("cast") if isinstance(candidate.get("cast"), list) else []
    cast_top5 = candidate.get("cast_top5") if isinstance(candidate.get("cast_top5"), list) else cast
    normalized["cast"] = cast or cast_top5
    normalized["cast_top5"] = cast_top5 or cast
    normalized["actors"] = normalized["cast"]
    normalized["overview"] = candidate.get("overview") or ""
    normalized["poster_url"] = candidate.get("poster_url") or ""
    normalized["poster_path"] = candidate.get("poster_path") or None
    normalized["vote_average"] = candidate.get("vote_average")
    normalized["runtime"] = candidate.get("runtime")
    normalized["year"] = candidate.get("year")
    normalized["release_date"] = candidate.get("release_date") or ""
    normalized["tmdb_id"] = candidate.get("tmdb_id")
    normalized["plot_complexity"] = candidate.get("plot_complexity")
    normalized["pacing"] = candidate.get("pacing")
    normalized["emotional_intensity"] = candidate.get("emotional_intensity")
    normalized["visual_score"] = candidate.get("visual_score")
    return normalized


def validate_candidate_fields(candidates: list[dict]) -> dict:
    required_fields = [
        "title",
        "overview",
        "genres",
        "director",
        "cast_top5",
        "runtime",
        "vote_average",
        "poster_url",
        "tmdb_id",
        "pacing",
        "plot_complexity",
        "emotional_intensity",
        "visual_score",
    ]
    missing_by_field: dict[str, int] = {field: 0 for field in required_fields}
    normalized_candidates = [normalize_candidate(candidate) for candidate in candidates]
    for candidate in normalized_candidates:
        for field in required_fields:
            value = candidate.get(field)
            if value in (None, "", []):
                missing_by_field[field] += 1
    return {
        "candidate_count": len(normalized_candidates),
        "missing_by_field": missing_by_field,
        "sample_candidate": normalized_candidates[0] if normalized_candidates else None,
    }


def _fallback_reasoning(candidate_id: str, reason: str, cognitive_match: str = "") -> dict:
    return {
        "id": candidate_id,
        "reason": _safe_text(reason, 80, "추천 영화입니다."),
        "cognitive_match": _safe_text(cognitive_match, 100, ""),
    }


def _normalize_llm_response(result: dict) -> dict:
    payload = result if isinstance(result, dict) else {}
    selected_ids = [str(item) for item in _safe_list(payload.get("selected_ids")) if str(item).strip()]
    reasoning_log = []
    for item in _safe_list(payload.get("reasoning_log")):
        if not isinstance(item, dict):
            continue
        candidate_id = str(item.get("id") or "").strip()
        if not candidate_id:
            continue
        reasoning_log.append(
            {
                "id": candidate_id,
                "reason": _safe_text(item.get("reason"), 80, "추천 영화입니다."),
                "cognitive_match": _safe_text(item.get("cognitive_match"), 100, ""),
            }
        )
    return {
        "selected_ids": selected_ids,
        "reasoning_log": reasoning_log,
        "overall_reasoning": _safe_text(payload.get("overall_reasoning"), 500, ""),
        "overviews": {},
    }


def _validate_curator_payload(payload: dict, candidate_ids: set[str]) -> tuple[bool, str | None]:
    normalized = _normalize_llm_response(payload)
    selected_ids = normalized.get("selected_ids", [])
    if not selected_ids:
        return False, "empty_selected_ids"
    valid_selected_ids = [candidate_id for candidate_id in selected_ids if candidate_id in candidate_ids]
    if not valid_selected_ids:
        return False, "selected_ids_not_in_candidates"
    reasoning_map = {
        item.get("id"): item
        for item in normalized.get("reasoning_log", [])
        if isinstance(item, dict) and item.get("id")
    }
    for candidate_id in valid_selected_ids:
        if candidate_id not in reasoning_map:
            return False, "reasoning_log_mismatch"
    return True, None


def _build_curator_user_message(
    profile: dict,
    normalized_profile: dict,
    candidates: list[dict],
    extra_instruction: str = "",
) -> str:
    message = (
        f"사용자 프로필:\n"
        f"{json.dumps(profile, ensure_ascii=False, indent=2)}\n\n"
        f"해석된 프로필:\n"
        f"{json.dumps(normalized_profile, ensure_ascii=False, indent=2)}\n\n"
        f"검색 후보 {len(candidates)}편:\n"
        f"{_format_search_candidates(candidates)}\n\n"
        f"위 후보 목록 안에서만 이 프로필에 맞는 영화 3편을 고르세요."
    )
    if extra_instruction:
        message += f"\n\n[추가 지시]\n{extra_instruction}"
    return message


def _select_retry_candidates(candidates: list[dict], limit: int = 10) -> list[dict]:
    return candidates[: max(1, min(limit, len(candidates)))]


def _fallback_payload_for_candidates(candidates: list[dict], reason: str, overall_reasoning: str) -> dict:
    fallback_ids = [str(candidate.get("id")) for candidate in candidates[:3] if candidate.get("id") is not None]
    return {
        "selected_ids": fallback_ids,
        "reasoning_log": [_fallback_reasoning(candidate_id, reason) for candidate_id in fallback_ids],
        "overall_reasoning": overall_reasoning,
        "overviews": {},
    }


def run_curator_with_retry(
    profile: dict,
    normalized_profile: dict,
    candidates: list[dict],
) -> tuple[dict | None, dict]:
    normalized_candidates = [normalize_candidate(candidate) for candidate in candidates]
    attempts_config = [
        {
            "system_prompt": CURATOR_PROMPT,
            "extra_instruction": "JSON object 하나로만 응답하고 overviews는 만들지 마세요. selected_ids와 짧은 reasoning_log만 반환하세요.",
            "max_completion_tokens": 450,
            "temperature": 0.2,
            "response_format": CURATOR_RESPONSE_FORMAT,
            "candidate_limit": len(normalized_candidates),
        },
        {
            "system_prompt": CURATOR_RETRY_PROMPT,
            "extra_instruction": "JSON만 반환하세요. overviews는 만들지 말고 selected_ids와 짧은 reasoning_log만 반환하세요.",
            "max_completion_tokens": 320,
            "temperature": 0.1,
            "response_format": CURATOR_RESPONSE_FORMAT,
            "candidate_limit": 10,
        },
    ]

    diagnostics = {
        "attempts": [],
        "retry_performed": False,
        "first_parse_failed": False,
        "retry_failed": False,
        "fallback_reason": None,
    }

    for attempt_index, config in enumerate(attempts_config, start=1):
        attempt_candidates = (
            normalized_candidates
            if config["candidate_limit"] >= len(normalized_candidates)
            else _select_retry_candidates(normalized_candidates, config["candidate_limit"])
        )
        attempt_candidate_ids = {
            str(candidate.get("id"))
            for candidate in attempt_candidates
            if candidate.get("id") is not None
        }
        user_message = _build_curator_user_message(
            profile=profile,
            normalized_profile=normalized_profile,
            candidates=attempt_candidates,
            extra_instruction=config["extra_instruction"],
        )
        started_at = time.perf_counter()
        raw, call_meta = _call_curator_model(
            messages=[
                {"role": "system", "content": config["system_prompt"]},
                {"role": "user", "content": user_message},
            ],
            max_completion_tokens=config["max_completion_tokens"],
            temperature=config["temperature"],
            response_format=config["response_format"],
        )
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        finish_reason = call_meta.get("finish_reason") if isinstance(call_meta, dict) else None
        parsed, parse_diagnostics = _parse_curator_response(raw)
        attempt_info = {
            "attempt": attempt_index,
            "latency_ms": latency_ms,
            "finish_reason": finish_reason,
            "candidate_count": len(attempt_candidates),
            "raw_summary": _summarize_raw_response(raw),
            "parse_error": parse_diagnostics.get("parse_error"),
            "validation_error": None,
        }

        if parsed is None:
            diagnostics["attempts"].append(attempt_info)
            diagnostics["first_parse_failed"] = diagnostics["first_parse_failed"] or attempt_index == 1
            diagnostics["retry_performed"] = attempt_index == 1
            if attempt_index == 1:
                continue
            diagnostics["retry_failed"] = True
            diagnostics["fallback_reason"] = "json_parse_error"
            return None, diagnostics

        is_valid, validation_error = _validate_curator_payload(parsed, attempt_candidate_ids)
        attempt_info["validation_error"] = validation_error
        diagnostics["attempts"].append(attempt_info)
        if is_valid:
            return parsed, diagnostics
        diagnostics["retry_performed"] = attempt_index == 1
        if attempt_index == 1:
            continue
        diagnostics["retry_failed"] = True
        diagnostics["fallback_reason"] = validation_error or "invalid_schema"
        return None, diagnostics

    diagnostics["fallback_reason"] = diagnostics["fallback_reason"] or "invalid_schema"
    return None, diagnostics


def finalize_curator_output(
    candidates: list[dict],
    llm_response: dict | None = None,
    enricher: Callable[[dict], dict] | None = None,
) -> tuple[list[dict], dict]:
    normalized_candidates = [normalize_candidate(candidate) for candidate in candidates]
    candidate_lookup = {candidate["id"]: candidate for candidate in normalized_candidates if candidate.get("id")}
    llm_response = _normalize_llm_response(llm_response or {})

    valid_ids = [candidate_id for candidate_id in llm_response["selected_ids"] if candidate_id in candidate_lookup]
    seen: set[str] = set()
    deduped_ids: list[str] = []
    for candidate_id in valid_ids:
        if candidate_id not in seen:
            deduped_ids.append(candidate_id)
            seen.add(candidate_id)
    valid_ids = deduped_ids

    if len(valid_ids) == 0:
        valid_ids = [candidate["id"] for candidate in normalized_candidates[:3]]
        llm_response["reasoning_log"] = [
            _fallback_reasoning(candidate_id, "LLM 응답 처리 실패, 검색 상위 추천")
            for candidate_id in valid_ids
        ]
        llm_response["overall_reasoning"] = (
            llm_response["overall_reasoning"]
            or "AI 큐레이터 응답이 불안정해 검색 결과 상위를 우선 추천드립니다."
        )

    if 0 < len(valid_ids) < 3:
        used = set(valid_ids)
        for candidate in normalized_candidates:
            candidate_id = candidate["id"]
            if len(valid_ids) >= min(3, len(normalized_candidates)):
                break
            if candidate_id not in used:
                valid_ids.append(candidate_id)
                used.add(candidate_id)
                llm_response["reasoning_log"].append(
                    _fallback_reasoning(candidate_id, "후보군 적합도가 높아 보완 추천합니다.")
                )

    if len(valid_ids) > 3:
        valid_ids = valid_ids[:3]

    recommendations = []
    for candidate_id in valid_ids:
        if candidate_id not in candidate_lookup:
            continue
        candidate = candidate_lookup[candidate_id]
        reason_obj = next(
            (item for item in llm_response.get("reasoning_log", []) if item.get("id") == candidate_id),
            None,
        )
        item = {
            "tmdb_id": candidate.get("tmdb_id"),
            "title": candidate.get("title") or candidate.get("title_ko") or "",
            "title_ko": candidate.get("title_ko") or candidate.get("title") or "",
            "overview": _safe_text(candidate.get("overview"), 150, ""),
            "genres": candidate.get("genres") or [],
            "director": candidate.get("director") or "",
            "cast_top5": candidate.get("cast_top5") or candidate.get("cast") or [],
            "cast": candidate.get("cast") or candidate.get("cast_top5") or [],
            "runtime": candidate.get("runtime"),
            "vote_average": candidate.get("vote_average"),
            "poster_url": candidate.get("poster_url") or "",
            "release_date": candidate.get("release_date") or "",
            "year": candidate.get("year"),
            "pacing": candidate.get("pacing"),
            "plot_complexity": candidate.get("plot_complexity"),
            "emotional_intensity": candidate.get("emotional_intensity"),
            "visual_score": candidate.get("visual_score"),
            "reason": _safe_text((reason_obj or {}).get("reason"), 80, "추천 영화입니다."),
            "cognitive_match": _safe_text((reason_obj or {}).get("cognitive_match"), 100, ""),
        }
        recommendations.append(enricher(item) if enricher else item)

    return recommendations, llm_response


def run_curator_pipeline(
    profile: dict,
    normalized_profile: dict,
    candidates: list[dict],
    enricher: Callable[[dict], dict] | None = None,
) -> tuple[list[dict], dict]:
    payload, diagnostics = run_curator_with_retry(
        profile=profile,
        normalized_profile=normalized_profile,
        candidates=candidates,
    )
    if payload is None:
        payload = _fallback_payload_for_candidates(
            [normalize_candidate(candidate) for candidate in candidates],
            reason="추천 엔진 일시 오류, 검색 기반 추천",
            overall_reasoning="AI 큐레이터 응답 지연으로 검색 결과 상위를 추천드립니다.",
        )
    recommendations, normalized_payload = finalize_curator_output(
        candidates=candidates,
        llm_response=payload,
        enricher=enricher,
    )
    return recommendations, {
        **diagnostics,
        "payload": normalized_payload,
    }
