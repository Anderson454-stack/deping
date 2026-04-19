import json, re

INPUT = "notebooks/data/processed/tmdb_data_mis.json"

with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"총 영화 수: {len(data)}")
print(f"필드 목록: {list(data[0].keys())}")

# ── 영화 파일 ──
movies_data = []
for movie in data:
    genres = movie.get("genres", "")
    genre_list = [g.strip() for g in genres.split(",")] if genres else []

    # 버그 1 수정: tmdb_id가 float(634649.0)으로 저장된 경우 int로 변환
    tmdb_id = movie.get("tmdb_id", "")
    clean_id = str(int(float(tmdb_id))) if tmdb_id else ""

    movies_data.append({
        "id": clean_id,
        "name": movie.get("title", ""),
        "poster_url": movie.get("poster_url", ""),
        "genres": genre_list,
        "director": movie.get("director", ""),
        "year": str(movie.get("release_date", ""))[:4],
        "vote_average": movie.get("vote_average", 0),
        "movies": [movie.get("title", "")]
    })

# 장르 겹치는 영화를 연관 영화로 (10개로 확대 — 초기 12편 순환 방지)
for m in movies_data:
    m["related"] = [
        other["id"] for other in movies_data
        if other["id"] != m["id"]
        and set(m["genres"]) & set(other["genres"])
    ][:10]

# 초기 12편 다양성 확보: 장르 겹침 없는 영화를 앞으로
# (배우와 동일한 로직 — related에 포함된 영화를 초기12에서 제외)
# vote_average 내림차순으로 먼저 정렬해 품질 확보
movies_data.sort(key=lambda x: float(x.get("vote_average") or 0), reverse=True)

def pick_diverse_movies(movies, n=12):
    selected = []
    blocked_ids = set()
    for m in movies:
        if m["id"] not in blocked_ids:
            selected.append(m)
            blocked_ids.update(m.get("related", []))
        if len(selected) >= n:
            break
    rest = [m for m in movies if m not in selected]
    return selected + rest

movies_data = pick_diverse_movies(movies_data, n=12)

with open("frontend/src/data/movies.json", "w", encoding="utf-8") as f:
    json.dump(movies_data, f, ensure_ascii=False, indent=2)
print(f"영화 {len(movies_data)}편 저장 완료")

# ── 배우 파일 ──
actors_raw = {}  # name → {movies, poster_url}

for movie in data:
    cast_raw = movie.get("cast_top5") or ""
    cast_list = [a.strip() for a in cast_raw.split(",") if a.strip()]

    for actor in cast_list:
        # 한글 포함 여부로 필터 (한글 표기 외국배우 포함)
        if not re.search("[가-힣]", actor):
            continue
        if actor not in actors_raw:
            actors_raw[actor] = {
                "movies": [],
                "poster_url": movie.get("poster_url", "")
            }
        title = movie.get("title", "")
        if title not in actors_raw[actor]["movies"]:
            actors_raw[actor]["movies"].append(title)

# 연관 배우: 같은 영화에 출연한 배우
actors_data = []
for actor, info in actors_raw.items():
    co_actors = []
    for movie in data:
        cast_list = [a.strip() for a in (movie.get("cast_top5") or "").split(",")]
        if actor in cast_list:
            co_actors.extend([
                a for a in cast_list
                if a != actor
                and a
                and re.search("[가-힣]", a)
            ])

    related = list(dict.fromkeys(co_actors))[:12]

    actors_data.append({
        "id": actor,
        "name": actor,
        "movies": info["movies"],
        "poster_url": info["poster_url"],
        "related": related
    })

# 버그 2 수정: 초기 12개가 서로 related에 포함돼 확장이 안 되는 문제
# → 출연작 많은 순으로 정렬하되, 초기 12개는 서로 related가 겹치지 않도록 다양성 확보
def pick_diverse_initial(actors, n=12):
    sorted_actors = sorted(actors, key=lambda x: len(x["movies"]), reverse=True)
    selected = []
    selected_ids = set()

    for actor in sorted_actors:
        if actor["id"] not in selected_ids:
            selected.append(actor)
            selected_ids.update(actor.get("related", []))
        if len(selected) >= n:
            break

    rest = [a for a in sorted_actors if a not in selected]
    return selected + rest

actors_data = pick_diverse_initial(actors_data, n=12)

with open("frontend/src/data/actors.json", "w", encoding="utf-8") as f:
    json.dump(actors_data, f, ensure_ascii=False, indent=2)
print(f"배우 {len(actors_data)}명 저장 완료")

# ── 감독 파일 ──
seen_dirs = set()
directors_data = []

for movie in data:
    d = movie.get("director", "")
    if not d or d in seen_dirs:
        continue
    seen_dirs.add(d)

    directed = [m["title"] for m in data if m.get("director") == d]

    co_actors = []
    for m in data:
        if m.get("director") == d:
            co_actors.extend([
                a.strip() for a in (m.get("cast_top5") or "").split(",")
                if a.strip()
            ])

    related = list(dict.fromkeys([
        m.get("director") for m in data
        if m.get("director") and m.get("director") != d
        and any(a in (m.get("cast_top5") or "") for a in co_actors)
    ]))[:10]

    rep = next((m for m in data if m.get("director") == d), None)
    directors_data.append({
        "id": d,
        "name": d,
        "movies": directed,
        "poster_url": rep.get("poster_url", "") if rep else "",
        "related": related
    })

directors_data.sort(key=lambda x: len(x["movies"]), reverse=True)

with open("frontend/src/data/directors.json", "w", encoding="utf-8") as f:
    json.dump(directors_data, f, ensure_ascii=False, indent=2)
print(f"감독 {len(directors_data)}명 저장 완료")
print("\n완료! frontend/src/data/ 폴더 확인하세요.")
