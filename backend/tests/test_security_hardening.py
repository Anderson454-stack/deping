import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main


class SecurityHardeningTestCase(unittest.TestCase):
    def setUp(self):
        storage = getattr(main.limiter, "_storage", None)
        if storage and hasattr(storage, "reset"):
            storage.reset()
        self.client = TestClient(main.app)

    def test_chat_request_validation_rejects_messages_over_2000_chars(self):
        response = self.client.post(
            "/api/chat",
            json={
                "message": "a" * 2001,
                "conversation_history": [],
                "current_profile": {},
                "turn": 0,
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_request_size_limit_returns_413_before_validation(self):
        response = self.client.post(
            "/api/chat",
            json={
                "message": "a" * (1_000_100),
                "conversation_history": [],
                "current_profile": {},
                "turn": 0,
            },
        )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json(), {"error": "요청이 너무 큽니다"})

    def test_rate_limit_blocks_recommend_after_ten_requests(self):
        fallback_payload = {
            "selected_ids": ["1", "2", "3"],
            "reasoning_log": [
                {"id": "1", "reason": "a", "cognitive_match": "a"},
                {"id": "2", "reason": "b", "cognitive_match": "b"},
                {"id": "3", "reason": "c", "cognitive_match": "c"},
            ],
            "overall_reasoning": "ok",
        }
        candidates = [
            {"id": "1", "title_ko": "A", "overview": "", "genres": [], "director": "", "year": "2024"},
            {"id": "2", "title_ko": "B", "overview": "", "genres": [], "director": "", "year": "2024"},
            {"id": "3", "title_ko": "C", "overview": "", "genres": [], "director": "", "year": "2024"},
        ]

        with patch.object(main, "run_searcher", return_value={"items": candidates}), patch.object(
            main,
            "_run_curator_with_retry",
            return_value=(fallback_payload, {"attempts": [], "retry_performed": False, "first_parse_failed": False}),
        ):
            last_response = None
            for _ in range(11):
                last_response = self.client.post("/api/recommend", json={"profile": {}})

        self.assertIsNotNone(last_response)
        self.assertEqual(last_response.status_code, 429)

    def test_chat_masks_internal_exception_details(self):
        with patch.object(main, "call_profiler", side_effect=RuntimeError("secret-key-123")):
            response = self.client.post(
                "/api/chat",
                json={
                    "message": "안녕",
                    "conversation_history": [],
                    "current_profile": {},
                    "turn": 0,
                },
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "서버 오류가 발생했습니다.")

    def test_security_headers_are_attached(self):
        with patch.object(main, "search_movies", return_value={"items": [], "count": 0, "query": "*"}):
            response = self.client.get("/api/search")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")


if __name__ == "__main__":
    unittest.main()
