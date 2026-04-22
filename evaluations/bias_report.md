# Baseline Bias Report

- source run: `2026-04-19_keyword.jsonl`
- total evaluated results: `71`
- average vote_average (TMDB proxy for popularity/quality): `7.06`
- min vote_average: `5.50`
- max vote_average: `8.20`
- note: `rating_imdb` field is not available in the current Azure Search document shape, so this report uses `vote_average`.

## Genre Distribution
- `드라마`: `39`
- `액션`: `28`
- `코미디`: `22`
- `모험`: `19`
- `범죄`: `12`
- `애니메이션`: `12`
- `판타지`: `10`
- `SF`: `9`
- `역사`: `9`
- `스릴러`: `4`

## Shared Titles Across Contrast Pairs
- `p01_calm` vs `p03_energy`
  shared_titles: (none)
  left_query: 잔잔한 영화 편안한 영화 calm low-energy film 잔잔한 위로 영화 따뜻한 영화 healing comforting film 부드러운 영화 warm gentle film soft restful film cozy healing film story-driven film
  right_query: 에너지 넘치는 영화 dynamic high-energy film fast-paced film cinematic visuals
- `p01_calm` vs `p10_intense`
  shared_titles: (none)
  left_query: 잔잔한 영화 편안한 영화 calm low-energy film 잔잔한 위로 영화 따뜻한 영화 healing comforting film 부드러운 영화 warm gentle film soft restful film cozy healing film story-driven film
  right_query: 에너지 넘치는 영화 dynamic high-energy film fast-paced film cinematic visuals story-driven film
- `p02_down` vs `p03_energy`
  shared_titles: (none)
  left_query: 잔잔한 영화 편안한 영화 calm low-energy film 감정선 있는 영화 melancholic reflective film quiet introspective film story-driven film
  right_query: 에너지 넘치는 영화 dynamic high-energy film fast-paced film cinematic visuals
- `p05_story` vs `p06_visual`
  shared_titles: (none)
  left_query: 무난한 영화 balanced accessible film story-driven film
  right_query: 무난한 영화 balanced accessible film cinematic visuals
- `p07_fast` vs `p08_complex`
  shared_titles: (none)
  left_query: story-driven film
  right_query: story-driven film
- `p09_comfort` vs `p10_intense`
  shared_titles: (none)
  left_query: 잔잔한 영화 편안한 영화 calm low-energy film 잔잔한 위로 영화 따뜻한 영화 healing comforting film 부드러운 영화 warm gentle film soft restful film cozy healing film story-driven film
  right_query: 에너지 넘치는 영화 dynamic high-energy film fast-paced film cinematic visuals story-driven film
