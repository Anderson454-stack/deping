import math
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from search_indexing import VECTOR_DIMENSIONS, normalize_movie_document


class SearchIndexingTestCase(unittest.TestCase):
    def test_normalize_movie_document_cleans_nan_and_preserves_vector(self):
        raw = {
            "title": "테스트 영화",
            "original_title": "Test Movie",
            "release_date": "2020-01-02",
            "tmdb_id": 12345.0,
            "overview": "줄거리",
            "vote_average": 7.5,
            "vote_count": 150.0,
            "director": "감독",
            "cast_top5": "배우1, 배우2",
            "poster_url": "https://example.com/poster.jpg",
            "genres": "드라마, 스릴러",
            "runtime": 118.0,
            "keywords": math.nan,
            "plot_complexity": 4.0,
            "pacing": math.nan,
            "emotional_intensity": 5.0,
            "visual_score": 3.0,
            "review_1": "리뷰 하나",
            "review_2": math.nan,
            "review_3": "리뷰 셋",
            "combined_text": "통합 텍스트",
            "combined_text_vector": [0.1] * VECTOR_DIMENSIONS,
        }

        normalized = normalize_movie_document(raw, row_number=1)

        self.assertEqual(normalized["doc_id"], "12345")
        self.assertEqual(normalized["id"], "12345")
        self.assertEqual(normalized["tmdb_id"], 12345)
        self.assertEqual(normalized["year"], 2020)
        self.assertEqual(normalized["genres"], ["드라마", "스릴러"])
        self.assertEqual(normalized["cast_top5"], ["배우1", "배우2"])
        self.assertIsNone(normalized["keywords"])
        self.assertIsNone(normalized["pacing"])
        self.assertEqual(normalized["reviews_combined"], "리뷰 하나\n\n리뷰 셋")
        self.assertEqual(len(normalized["combined_text_vector"]), VECTOR_DIMENSIONS)

    def test_normalize_movie_document_prefers_existing_doc_id(self):
        raw = {
            "doc_id": "stable-key",
            "title": "테스트 영화",
            "combined_text": "통합 텍스트",
            "combined_text_vector": [0.2] * VECTOR_DIMENSIONS,
        }

        normalized = normalize_movie_document(raw, row_number=7)

        self.assertEqual(normalized["doc_id"], "stable-key")
        self.assertEqual(normalized["id"], "stable-key")


if __name__ == "__main__":
    unittest.main()
