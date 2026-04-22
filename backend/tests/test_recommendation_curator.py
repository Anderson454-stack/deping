import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main


def _sample_candidates():
    return [
        {
            "id": "760497",
            "title_ko": "샘플 1",
            "overview": "첫 번째 후보 줄거리",
            "genres": ["Drama"],
            "director": "감독 A",
            "year": "2023",
        },
        {
            "id": "634649",
            "title_ko": "샘플 2",
            "overview": "두 번째 후보 줄거리",
            "genres": ["Action"],
            "director": "감독 B",
            "year": "2022",
        },
        {
            "id": "569094",
            "title_ko": "샘플 3",
            "overview": "세 번째 후보 줄거리",
            "genres": ["Animation"],
            "director": "감독 C",
            "year": "2021",
        },
    ]


def _valid_payload():
    return {
        "selected_ids": ["760497", "634649", "569094"],
        "reasoning_log": [
            {"id": "760497", "reason": "감정선이 잘 맞습니다.", "cognitive_match": "부담이 적습니다."},
            {"id": "634649", "reason": "전개가 선명합니다.", "cognitive_match": "몰입 흐름이 좋습니다."},
            {"id": "569094", "reason": "여운이 부드럽습니다.", "cognitive_match": "정서 톤이 맞습니다."},
        ],
        "overall_reasoning": "현재 프로필에 맞춰 결이 다른 세 편을 골랐습니다.",
    }


class RecommendationCuratorTestCase(unittest.TestCase):
    def test_parse_curator_response_detects_truncation(self):
        raw = '{"selected_ids":["760497"],"overviews":{"760497":"다른 차원의 스파이더맨에서'

        parsed, diagnostics = main._parse_curator_response(raw)

        self.assertIsNone(parsed)
        self.assertIn("unterminated_string", diagnostics["raw_summary"]["truncation_signals"])
        self.assertTrue(diagnostics["parse_error"])

    def test_validate_curator_payload_allows_missing_overviews(self):
        payload = _valid_payload()

        is_valid, reason = main._validate_curator_payload(payload, {"760497", "634649", "569094"})

        self.assertTrue(is_valid)
        self.assertIsNone(reason)

    def test_run_curator_with_retry_succeeds_after_parse_failure(self):
        truncated = '{"selected_ids":["760497"],"overviews":{"760497":"다른 차원의 스파이더맨에서'
        valid_raw = json.dumps(_valid_payload(), ensure_ascii=False)

        with patch.object(
            main,
            "_call_curator_model",
            side_effect=[
                (
                    truncated,
                    {
                        "usage": {"prompt_tokens": 100, "completion_tokens": 80, "total_tokens": 180},
                        "finish_reason": "length",
                        "response_format_used": "json_schema",
                    },
                ),
                (
                    valid_raw,
                    {
                        "usage": {"prompt_tokens": 110, "completion_tokens": 70, "total_tokens": 180},
                        "finish_reason": "stop",
                        "response_format_used": "json_schema",
                    },
                ),
            ],
        ):
            parsed, diagnostics = main._run_curator_with_retry(
                profile={"mood": -1, "energy": -1},
                normalized_profile={"raw": {"mood": -1, "energy": -1}, "labels": {}, "priority": [], "avoidance": []},
                candidates=_sample_candidates(),
            )

        self.assertIsNotNone(parsed)
        self.assertTrue(diagnostics["first_parse_failed"])
        self.assertTrue(diagnostics["retry_performed"])
        self.assertFalse(diagnostics["retry_failed"])
        self.assertEqual(parsed["selected_ids"], ["760497", "634649", "569094"])
        self.assertEqual(diagnostics["attempts"][-1]["finish_reason"], "stop")

    def test_run_curator_with_retry_falls_back_after_two_failures(self):
        invalid_raw = json.dumps(
            {
                "selected_ids": ["760497"],
                "reasoning_log": [],
                "overall_reasoning": "짧은 총평",
            },
            ensure_ascii=False,
        )

        with patch.object(
            main,
            "_call_curator_model",
            side_effect=[
                (
                    invalid_raw,
                    {
                        "usage": {"prompt_tokens": 90, "completion_tokens": 50, "total_tokens": 140},
                        "finish_reason": "stop",
                        "response_format_used": "json_schema",
                    },
                ),
                (
                    invalid_raw,
                    {
                        "usage": {"prompt_tokens": 95, "completion_tokens": 45, "total_tokens": 140},
                        "finish_reason": "stop",
                        "response_format_used": "json_schema",
                    },
                ),
            ],
        ):
            parsed, diagnostics = main._run_curator_with_retry(
                profile={"mood": -1, "energy": -1},
                normalized_profile={"raw": {"mood": -1, "energy": -1}, "labels": {}, "priority": [], "avoidance": []},
                candidates=_sample_candidates(),
            )

        self.assertIsNone(parsed)
        self.assertTrue(diagnostics["retry_performed"])
        self.assertTrue(diagnostics["retry_failed"])
        self.assertEqual(diagnostics["fallback_reason"], "reasoning_log_mismatch")

    def test_run_curator_with_retry_retries_on_finish_reason_length_and_shrinks_candidates(self):
        valid_raw = json.dumps(_valid_payload(), ensure_ascii=False)
        captured_messages = []

        def _fake_call(*, messages, max_completion_tokens, temperature, response_format):
            captured_messages.append(
                {
                    "messages": messages,
                    "max_completion_tokens": max_completion_tokens,
                    "response_format": response_format,
                }
            )
            if len(captured_messages) == 1:
                return valid_raw, {
                    "usage": {"prompt_tokens": 120, "completion_tokens": 80, "total_tokens": 200},
                    "finish_reason": "length",
                    "response_format_used": "json_schema",
                }
            return valid_raw, {
                "usage": {"prompt_tokens": 100, "completion_tokens": 60, "total_tokens": 160},
                "finish_reason": "stop",
                "response_format_used": "json_schema",
            }

        candidates = _sample_candidates() + [
            {"id": str(700000 + i), "title_ko": f"추가 {i}", "overview": "추가 후보", "genres": [], "director": "", "year": "2020"}
            for i in range(10)
        ]

        with patch.object(main, "_call_curator_model", side_effect=_fake_call):
            parsed, diagnostics = main._run_curator_with_retry(
                profile={"mood": -1, "energy": -1},
                normalized_profile={"raw": {"mood": -1, "energy": -1}, "labels": {}, "priority": [], "avoidance": []},
                candidates=candidates,
            )

        self.assertIsNotNone(parsed)
        self.assertTrue(diagnostics["retry_performed"])
        self.assertEqual(diagnostics["attempts"][0]["finish_reason"], "length")
        self.assertEqual(diagnostics["attempts"][0]["validation_error"], "length_truncation")
        self.assertEqual(diagnostics["attempts"][1]["candidate_count"], 10)
        self.assertIn("검색 후보 13편", captured_messages[0]["messages"][1]["content"])
        self.assertIn("검색 후보 10편", captured_messages[1]["messages"][1]["content"])


if __name__ == "__main__":
    unittest.main()
