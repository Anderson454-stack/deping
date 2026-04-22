# Raw Profile Schema Notes

## source of truth
- `backend/agents/profile_normalizer.py`
- `backend/agents/searcher.py`
- `backend/agents/profiler.py`
- `backend/tests/test_profile_normalizer.py`
- `backend/tests/test_profiler_response_contract.py`

## canonical fields
- `mood`: `int | null`
- `energy`: `int | null`
- `complexity`: `int | null`
- `patience`: `int | null`
- `visual_style`: `int | null`
- `ending_style`: `int | null`
- `inner_need`: `int | null`
- `temperature`: `int | null`
- `priority`: `string[]`
- `avoidance`: `string[]`
- `refs.movies`: `string[]`
- `refs.directors`: `string[]`
- `refs.actors`: `string[]`

## observed code ranges
- `mood`: `-2`, `-1`, `0`, `1`, `2` observed in prompt/tests/runtime
- `energy`: `-2`, `-1`, `0`, `1`, `2` observed in prompt/tests/runtime
- `complexity`: `-2`, `0`, `1`, `2`, unknown integers allowed by normalizer
- `patience`: `-2`, `0`, `1`, `2`, unknown integers allowed by normalizer
- `visual_style`: `-2`, `2`, `null` observed
- `ending_style`: `-2`, `0`, `2`, `null` mentioned in prompt/tests
- `inner_need`: `-2`, `-1`, `1`, `2`, `null` observed in tests/runtime
- `temperature`: `-2`, `-1`, `1`, `2`, `null` observed in tests/runtime

## field behavior confirmed from code
- numeric fields are coerced with `int(value)` when possible
- invalid numeric values are normalized to `null`
- unknown integer values are preserved in `raw` and usually stay `label=None`
- `priority` is normalized to a de-duplicated `string[]`
- canonical avoidance field is `avoidance`
- `avoid` is accepted only as backward-compatible input and normalized into `avoidance`
- `refs` is the canonical card/reference container
- legacy `reference`, `reference_movies`, `reference_directors`, `reference_actors`, `directors`, `actors` are folded into `refs`

## normalizer label behavior
- labels are intentionally conservative
- only confirmed mappings are converted to strings
- anything else remains `null`

### confirmed label mappings
- `complexity`
  - `-2 -> "low"`
  - `2 -> "high"`
- `patience`
  - `-2 -> "low"`
  - `2 -> "high"`
- `visual_style`
  - `-2 -> "story_over_visuals"`
  - `2 -> "visuals_over_story"`
- `mood`
  - `-2 -> "low_energy_mood"`
  - `2 -> "high_energy_mood"`
- `energy`
  - `-2 -> "unfocused"`
  - `2 -> "fully_engaged"`
- `ending_style`
  - `-2 -> "resolved"`
  - `2 -> "lingering"`
- `inner_need`
  - `-2 -> "healing"`
  - `2 -> "energy"`
- `temperature`
  - `-2 -> "cold_tense"`
  - `2 -> "warm_emotional"`

### confirmed non-mappings
- `complexity: 0 -> label null`
- `patience: 0 -> label null`
- `mood: -1 -> label null`
- `energy: -1 -> label null`
- `temperature: -1 -> label null`
- `temperature: 1 -> label null`
- `inner_need: -1 -> label null`
- `inner_need: 1 -> label null`

## searcher usage confirmed from code
- searcher always runs `normalize_profile(profile)` first
- query terms currently use:
  - raw `mood`, `energy`
  - raw `inner_need`, `temperature`
  - normalized `priority`
  - normalized `refs`
- filters currently use:
  - label-based `complexity -> plot_complexity_level`
  - label-based `patience -> pacing`
  - label-based `visual_style` and/or `priority=visual -> visual_level`
  - normalized `avoidance -> excluded_genres`
- current low-energy split rules in `searcher.py`
  - `(-1, -1)` base: calm / low-energy query terms
  - warm/comfort branch: `inner_need <= -2` or `temperature >= 1`
  - melancholic branch: `temperature <= -1`
  - uplifting branch: `inner_need >= 1`

## runtime interpretation notes
- `0` is currently used in tests/runtime as a central or default-ish value, but code does not give it a label
- `-1` and `1` are used in runtime outputs for softer affective signals
- for Step 0 evaluation, raw numeric profile is the only fixed contract
- any semantics beyond the mappings above should be treated as provisional unless reconfirmed in code
