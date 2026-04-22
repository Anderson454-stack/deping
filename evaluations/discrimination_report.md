# Discrimination Report

- source run: `2026-04-19_keyword.jsonl`
- overall pair average Jaccard: `0.119`
- contrast pair average Jaccard: `0.000`

## Most Similar Pairs
- `p05_story` vs `p08_complex`: `1.000`
  overlap: 승부
- `p01_calm` vs `p02_down`: `0.700`
  overlap: 더 퍼스트 슬램덩크, 드림, 리바운드, 빅토리, 소울, 승부, 오펜하이머
- `p03_energy` vs `p10_intense`: `0.538`
  overlap: 닥터 스트레인지: 대혼돈의 멀티버스, 더 마블스, 분노의 질주: 더 얼티메이트, 블랙 위도우, 앤트맨과 와스프: 퀀텀매니아, 정글 크루즈, 토르: 러브 앤 썬더

## Most Distinct Pairs
- `p01_calm` vs `p03_energy`: `0.000`
  overlap: (none)
- `p01_calm` vs `p07_fast`: `0.000`
  overlap: (none)
- `p01_calm` vs `p10_intense`: `0.000`
  overlap: (none)

---

## Known Artifact — p05_story vs p08_complex

p05_story vs p08_complex는 searcher failure case로 해석하지 않는다.
이 쌍은 raw profile 설계상 구별 축이 충분히 분리되지 않아 입력 자체가 거의 동일하다.
따라서 이 쌍의 Jaccard 1.000은 retrieval 품질 저하보다 evaluation profile design artifact로 분류한다.
Step 1 이후 비교 지표에서는 제외하되, evaluation set v2 설계의 대표 개선 사례로 유지한다.

### 증빙

두 프로필은 10개 필드 중 9개가 동일하며, energy 한 필드만 0 vs 1로 다르다.

- 동일 필드: mood, complexity, patience, visual_style, ending_style, inner_need, temperature, priority, avoidance
- 차이 필드: energy (p05=0, p08=1)

### Step 1 이후 평가 지표 처리

- contrast pair 평균 Jaccard 계산 시 이 쌍은 제외
- most-similar pair top3 집계 시에도 제외
- 단, 원본 데이터(`runs/*.jsonl`)에서는 그대로 유지
