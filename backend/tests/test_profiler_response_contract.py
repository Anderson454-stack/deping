import json
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agents.profiler import _enrich_affective_profile_updates, _parse_profiler_response


class ProfilerResponseContractTestCase(unittest.TestCase):
    def test_relaxed_input_keeps_mood_and_energy_in_profile_updates(self):
        raw = json.dumps(
            {
                "botMessage": "편안한 오후 같네요.",
                "profileUpdates": {
                    "mood": -1,
                    "energy": -1,
                    "complexity": None,
                    "patience": None,
                    "visual_style": None,
                    "temperature": None,
                    "ending_style": None,
                    "inner_need": None,
                    "priority": [],
                    "avoidance": [],
                },
                "quickButtons": [
                    {"label": "영상미가 좋아요", "maps": {"visual_style": 2}},
                ],
                "showModal": False,
                "isComplete": False,
            },
            ensure_ascii=False,
        )

        parsed = _parse_profiler_response(raw, "나른하고 편안해요 🌿")

        self.assertEqual(parsed["profileUpdates"]["mood"], -1)
        self.assertEqual(parsed["profileUpdates"]["energy"], -1)

    def test_quick_button_maps_promote_mood_and_energy_when_profile_updates_missing(self):
        raw = json.dumps(
            {
                "botMessage": "오늘 기분이 어때요?",
                "profileUpdates": {
                    "mood": None,
                    "energy": None,
                    "complexity": None,
                    "patience": None,
                    "visual_style": None,
                    "temperature": None,
                    "ending_style": None,
                    "inner_need": None,
                    "priority": [],
                    "avoidance": [],
                },
                "quickButtons": [
                    {"label": "에너지가 넘쳐요 ⚡", "maps": {"mood": 2, "energy": 2}},
                    {"label": "조금 나른해요 😴", "maps": {"mood": -1, "energy": -1}},
                    {"label": "편안해요 😊", "maps": {"mood": 1, "energy": 0}},
                ],
                "showModal": False,
                "isComplete": False,
            },
            ensure_ascii=False,
        )

        parsed = _parse_profiler_response(raw, "나른하고 편안해요 🌿")

        self.assertEqual(parsed["profileUpdates"]["mood"], -1)
        self.assertEqual(parsed["profileUpdates"]["energy"], -1)

    def test_nonstandard_plus_number_in_json_is_sanitized(self):
        raw = """
        {
          "botMessage": "다운된 기분이시군요.",
          "profileUpdates": {
            "mood": -1,
            "energy": -1,
            "complexity": null,
            "patience": null,
            "visual_style": null,
            "temperature": null,
            "ending_style": null,
            "inner_need": null,
            "priority": [],
            "avoidance": []
          },
          "quickButtons": [
            { "label": "위로받고 싶어요 💛", "maps": { "inner_need": -2 } },
            { "label": "기분 전환이 필요해요 ⚡", "maps": { "inner_need": +2 } }
          ],
          "showModal": false,
          "isComplete": false
        }
        """

        parsed = _parse_profiler_response(raw, "기분이 조금 가라앉아요 🌧️")

        self.assertEqual(parsed["profileUpdates"]["mood"], -1)
        self.assertEqual(parsed["profileUpdates"]["energy"], -1)
        self.assertEqual(parsed["quickButtons"][1]["maps"]["inner_need"], 2)

    def test_neutral_input_can_keep_zero_values(self):
        raw = json.dumps(
            {
                "botMessage": "오늘은 무난한 기분이군요.",
                "profileUpdates": {
                    "mood": 0,
                    "energy": 0,
                    "complexity": None,
                    "patience": None,
                    "visual_style": None,
                    "temperature": None,
                    "ending_style": None,
                    "inner_need": None,
                    "priority": [],
                    "avoidance": [],
                },
                "quickButtons": [
                    {"label": "편안해요", "maps": {"mood": 0, "energy": -1}},
                    {"label": "차분해요", "maps": {"mood": -1, "energy": 0}},
                ],
                "showModal": False,
                "isComplete": False,
            },
            ensure_ascii=False,
        )

        parsed = _parse_profiler_response(raw, "그냥 무난해요 🙂")

        self.assertEqual(parsed["profileUpdates"]["mood"], 0)
        self.assertEqual(parsed["profileUpdates"]["energy"], 0)

    def test_relaxed_low_energy_input_enriches_inner_need_and_temperature(self):
        result = {
            "profileUpdates": {
                "mood": -1,
                "energy": -1,
                "inner_need": None,
                "temperature": None,
            }
        }

        enriched = _enrich_affective_profile_updates(result, "나른하고 편안해요 🌿")

        self.assertEqual(enriched["profileUpdates"]["inner_need"], -2)
        self.assertEqual(enriched["profileUpdates"]["temperature"], 2)

    def test_depressed_low_energy_input_enriches_temperature(self):
        result = {
            "profileUpdates": {
                "mood": -1,
                "energy": -1,
                "inner_need": None,
                "temperature": None,
            }
        }

        enriched = _enrich_affective_profile_updates(result, "기분이 조금 가라앉아요 🌧️")

        self.assertIsNone(enriched["profileUpdates"]["inner_need"])
        self.assertEqual(enriched["profileUpdates"]["temperature"], -2)


if __name__ == "__main__":
    unittest.main()
