import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.profile_normalizer import normalize_profile
from agents.searcher import profile_to_search_params


class ProfileNormalizerTestCase(unittest.TestCase):
    def test_normalize_profile_with_raw_numeric_profile(self):
        profile = {
            "complexity": 0,
            "patience": 0,
            "visual_style": -2,
            "priority": ["story"],
            "avoidance": [],
        }

        normalized = normalize_profile(profile)

        self.assertEqual(normalized["raw"]["complexity"], 0)
        self.assertEqual(normalized["raw"]["visual_style"], -2)
        self.assertEqual(normalized["priority"], ["story"])
        self.assertEqual(normalized["avoidance"], [])
        self.assertEqual(normalized["labels"]["visual_style"], "story_over_visuals")
        self.assertIsNone(normalized["labels"]["complexity"])
        self.assertIsNone(normalized["labels"]["patience"])
        self.assertIn("labels", normalized)

    def test_normalize_profile_with_unknown_values_keeps_labels_none(self):
        profile = {
            "complexity": 999,
            "patience": None,
        }

        normalized = normalize_profile(profile)

        self.assertEqual(normalized["raw"]["complexity"], 999)
        self.assertIsNone(normalized["raw"]["patience"])
        self.assertIsNone(normalized["labels"]["complexity"])
        self.assertIsNone(normalized["labels"]["patience"])

    def test_profile_to_search_params_with_missing_optional_fields(self):
        profile = {
            "complexity": 0,
            "patience": 0,
            "priority": [],
        }

        params = profile_to_search_params(profile)

        self.assertEqual(params["query"], "*")
        self.assertEqual(params["plot_complexity_target"], 3)
        self.assertEqual(params["pacing_target"], 3)
        self.assertIsNone(params["visual_score_target"])
        self.assertEqual(params["excluded_genres"], [])

    def test_profile_to_search_params_uses_normalized_labels_and_refs(self):
        profile = {
            "complexity": 2,
            "patience": -2,
            "visual_style": 2,
            "priority": ["story", "visual"],
            "avoidance": ["horror", "war"],
            "refs": {
                "movies": ["Interstellar"],
                "directors": ["Christopher Nolan"],
                "actors": ["Matthew McConaughey"],
            },
        }

        params = profile_to_search_params(profile)

        self.assertEqual(params["plot_complexity_target"], 5)
        self.assertEqual(params["pacing_target"], 5)
        self.assertEqual(params["visual_score_target"], 5)
        self.assertEqual(params["excluded_genres"], ["horror", "war"])
        self.assertIn("Interstellar", params["query"])
        self.assertIn("Christopher Nolan", params["query"])

    def test_profile_to_search_params_uses_mood_energy_mapping_for_relaxed_case(self):
        profile = {
            "mood": -1,
            "energy": -1,
            "priority": [],
            "avoidance": [],
        }

        params = profile_to_search_params(profile)

        self.assertIn("잔잔한 영화", params["query"])
        self.assertIn("편안한 영화", params["query"])

    def test_profile_to_search_params_uses_mood_energy_mapping_for_high_energy_case(self):
        profile = {
            "mood": 2,
            "energy": 2,
            "priority": [],
            "avoidance": [],
        }

        params = profile_to_search_params(profile)

        self.assertIn("에너지 넘치는 영화", params["query"])
        self.assertIn("fast-paced film", params["query"])

    def test_profile_to_search_params_splits_relaxed_low_energy_by_inner_need_temperature(self):
        profile = {
            "mood": -1,
            "energy": -1,
            "inner_need": -2,
            "temperature": 2,
        }

        params = profile_to_search_params(profile)

        self.assertIn("잔잔한 위로 영화", params["query"])
        self.assertIn("따뜻한 영화", params["query"])

    def test_profile_to_search_params_splits_depressed_low_energy_by_temperature(self):
        profile = {
            "mood": -1,
            "energy": -1,
            "temperature": -2,
        }

        params = profile_to_search_params(profile)

        self.assertIn("감정선 있는 영화", params["query"])
        self.assertIn("melancholic reflective film", params["query"])

    def test_profile_to_search_params_uses_soft_temperature_signal_for_relaxed_case(self):
        profile = {
            "mood": -1,
            "energy": -1,
            "inner_need": -1,
            "temperature": 1,
        }

        params = profile_to_search_params(profile)

        self.assertIn("잔잔한 위로 영화", params["query"])
        self.assertIn("warm gentle film", params["query"])

    def test_profile_to_search_params_uses_soft_temperature_signal_for_melancholic_case(self):
        profile = {
            "mood": -1,
            "energy": -1,
            "inner_need": -1,
            "temperature": -1,
        }

        params = profile_to_search_params(profile)

        self.assertIn("감정선 있는 영화", params["query"])
        self.assertIn("quiet introspective film", params["query"])
        self.assertNotIn("잔잔한 위로 영화", params["query"])


if __name__ == "__main__":
    unittest.main()
