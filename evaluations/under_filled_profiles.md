# Under-filled Profiles (< 10 results)

baseline run: `2026-04-19_keyword.jsonl`
총 프로필 수: 10
10편 미만 프로필 수: 4

## 전체 프로필 결과 수

| profile_id | count |
|---|---|
| p01_calm | 7 |
| p02_down | 10 |
| p03_energy | 10 |
| p04_neutral | 10 |
| p05_story | 1 |
| p06_visual | 10 |
| p07_fast | 10 |
| p08_complex | 1 |
| p09_comfort | 2 |
| p10_intense | 10 |

## 10편 미만 프로필 상세

### p01_calm (7편)

- **query**: `잔잔한 영화 편안한 영화 calm low-energy film 잔잔한 위로 영화 따뜻한 영화 healing comforting film 부드러운 영화 warm gentle film soft restful film cozy healing film story-driven film`
- **filters**: `pacing eq 'slow'`
- **raw profile**:
  ```json
  {
  "mood": -1,
  "energy": -1,
  "complexity": 0,
  "patience": 2,
  "visual_style": -2,
  "ending_style": -2,
  "inner_need": -2,
  "temperature": 1
}
  ```

**추정 원인 분류** (수동 기입 필요):
- [ ] 필터가 강함 → 완화 검토
- [ ] query가 좁음 → query 확장 검토
- [ ] 문서 수 자체 부족 → 인덱스 확장 대기

### p05_story (1편)

- **query**: `무난한 영화 balanced accessible film story-driven film`
- **filters**: `plot_complexity_level eq 'high' and pacing eq 'slow'`
- **raw profile**:
  ```json
  {
  "mood": 0,
  "energy": 0,
  "complexity": 2,
  "patience": 2,
  "visual_style": -2,
  "ending_style": 2,
  "inner_need": null,
  "temperature": null
}
  ```

**추정 원인 분류** (수동 기입 필요):
- [ ] 필터가 강함 → 완화 검토
- [ ] query가 좁음 → query 확장 검토
- [ ] 문서 수 자체 부족 → 인덱스 확장 대기

### p08_complex (1편)

- **query**: `story-driven film`
- **filters**: `plot_complexity_level eq 'high' and pacing eq 'slow'`
- **raw profile**:
  ```json
  {
  "mood": 0,
  "energy": 1,
  "complexity": 2,
  "patience": 2,
  "visual_style": -2,
  "ending_style": 2,
  "inner_need": null,
  "temperature": null
}
  ```

**추정 원인 분류** (수동 기입 필요):
- [ ] 필터가 강함 → 완화 검토
- [ ] query가 좁음 → query 확장 검토
- [ ] 문서 수 자체 부족 → 인덱스 확장 대기

### p09_comfort (2편)

- **query**: `잔잔한 영화 편안한 영화 calm low-energy film 잔잔한 위로 영화 따뜻한 영화 healing comforting film 부드러운 영화 warm gentle film soft restful film cozy healing film story-driven film`
- **filters**: `not genres/any(g: g eq 'gore') and not genres/any(g: g eq 'horror') and plot_complexity_level eq 'low' and pacing eq 'slow'`
- **raw profile**:
  ```json
  {
  "mood": -1,
  "energy": -1,
  "complexity": -2,
  "patience": 2,
  "visual_style": -2,
  "ending_style": -2,
  "inner_need": -2,
  "temperature": 2
}
  ```

**추정 원인 분류** (수동 기입 필요):
- [ ] 필터가 강함 → 완화 검토
- [ ] query가 좁음 → query 확장 검토
- [ ] 문서 수 자체 부족 → 인덱스 확장 대기

## Step 1 진입 전 결정 사항

10편 미만 프로필이 존재할 경우, Phase B 완료 후 Hybrid 도입 전에 원인 분류를 마친다.
필터/쿼리 문제는 Hybrid 도입으로 해결되지 않으므로 입력 설계 수정이 선행되어야 한다.
