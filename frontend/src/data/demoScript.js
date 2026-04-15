export const DEMO_SCRIPT = {
  greeting: {
    bot: "안녕하세요! 저는 디핑이에요.\n오늘 어떤 기분이세요?",
    quickButtons: ["편하게 쉬고 싶어요", "뭔가 짜릿한 게 좋아요", "감성적인 날이에요", "머리를 비우고 싶어요"],
  },
  genre: {
    bot: "알겠어요! 어떤 장르를 좋아하세요?",
    quickButtons: ["액션 / 스릴러", "SF", "범죄 / 느와르", "다 좋아요"],
  },
  actor: {
    bot: "영상이 화려하면 더 좋다고 하셨죠 😎\n좋아하는 배우나 감독이 있으세요?",
    quickButtons: ["키아누 리브스", "채드윅 보스만", "없어요 / 상관없어요"],
  },
  selector: {
    bot: "좋아하는 영화, 배우, 감독을 골라볼까요?\n많이 고를수록 추천이 더 정확해져요 😊",
  },
  loading: {
    bot: "취향 분석 중이에요…",
    steps: [
      "Agent 1 프로파일링 완료",
      "Agent 2 검색 중 (KOFIC + TMDB)",
      "Agent 3 큐레이션 중",
    ],
  },
  result: {
    intro: "강렬하고 화려한 영화 3편 골라봤어요. 복잡한 건 다 뺐습니다 💪",
    movies: [
      {
        title: "존 윅: 챕터 4",
        year: 2023,
        genre: "액션 · 스릴러",
        runtime: "169분",
        rating: 7.7,
        reason:
          "화려한 영상 좋아하신다고 하셨죠? 이 영화의 액션 시퀀스는 거의 예술 수준이에요. 플롯은 단순 명쾌해서 부담 없이 몰입할 수 있어요.",
        complexity: 15,
        visual: 95,
        posterColor: "#2C2C2A",
        trailerUrl: "https://youtube.com/watch?v=qEVUtrk8_B4",
      },
      {
        title: "블랙 팬서",
        year: 2018,
        genre: "액션 · SF",
        runtime: "134분",
        rating: 7.3,
        reason:
          "채드윅 보스만 좋아하신다니 이건 필수예요. 와칸다 세계관 영상미가 압도적이고, 스토리도 군더더기 없이 탄탄합니다.",
        complexity: 25,
        visual: 85,
        posterColor: "#042C53",
        trailerUrl: "https://youtube.com/watch?v=xjDjIWPwcPU",
      },
      {
        title: "킬러의 보디가드",
        year: 2017,
        genre: "액션 · 코미디",
        runtime: "118분",
        rating: 6.9,
        reason:
          "짜릿하면서도 가볍게 즐기고 싶을 때 딱이에요. 유머가 섞여 있어서 피곤하지 않고, 액션은 충분히 화끈합니다.",
        complexity: 10,
        visual: 68,
        posterColor: "#173404",
        trailerUrl: "https://youtube.com/watch?v=8MvOFoQjCL0",
      },
    ],
    reasoningLog: [
      { movie: "테넷", verdict: "exclude", reason: "complexity=5 vs 사용자 복잡도 내성=low → 제외" },
      { movie: "인셉션", verdict: "exclude", reason: "complexity=4, 인지 부하 높음 → 제외" },
      { movie: "존 윅 4", verdict: "accept", reason: "complexity=1, visual_score=0.95, pacing=fast → 채택" },
      { movie: "블랙 팬서", verdict: "accept", reason: "complexity=2, 선호 배우 일치, visual=0.85 → 채택" },
      { movie: "킬러의 보디가드", verdict: "accept", reason: "complexity=1, tone=light, mood 일치 → 채택" },
    ],
  },
};
