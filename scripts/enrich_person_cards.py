import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
MOVIES_PATH = ROOT / "notebooks/data/processed/tmdb_data_mis.json"
ACTORS_PATH = ROOT / "frontend/src/data/actors.json"
DIRECTORS_PATH = ROOT / "frontend/src/data/directors.json"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_name(value: str | None) -> str:
    return " ".join(str(value or "").strip().lower().split())


def fetch_json(url: str, timeout: float = 20.0):
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.load(response)


def fetch_movie_credits(movie_id: int, api_key: str) -> dict | None:
    query = urllib.parse.urlencode({"api_key": api_key, "language": "ko-KR"})
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?{query}"
    try:
        return fetch_json(url)
    except urllib.error.HTTPError as exc:
        print(f"[warn] credits fetch failed for movie {movie_id}: HTTP {exc.code}")
    except Exception as exc:
        print(f"[warn] credits fetch failed for movie {movie_id}: {exc}")
    return None


def choose_best_candidate(candidates: dict[int, dict]) -> dict | None:
    if not candidates:
        return None
    return max(
        candidates.values(),
        key=lambda item: (
            item["count"],
            1 if item.get("profile_path") else 0,
            item.get("popularity", 0.0),
        ),
    )


def main() -> None:
    env = read_env(ENV_PATH)
    api_key = env.get("TMDB_API_KEY")
    if not api_key:
        raise SystemExit("TMDB_API_KEY가 .env에 없습니다.")

    movies = load_json(MOVIES_PATH)
    actors = load_json(ACTORS_PATH)
    directors = load_json(DIRECTORS_PATH)

    actor_targets = {normalize_name(item.get("name")) for item in actors}
    director_targets = {normalize_name(item.get("name")) for item in directors}

    actor_candidates: dict[str, dict[int, dict]] = defaultdict(dict)
    director_candidates: dict[str, dict[int, dict]] = defaultdict(dict)

    seen_movie_ids: set[int] = set()
    movie_ids: list[int] = []
    for movie in movies:
        raw_id = movie.get("tmdb_id")
        if raw_id in (None, ""):
            continue
        movie_id = int(float(raw_id))
        if movie_id not in seen_movie_ids:
            seen_movie_ids.add(movie_id)
            movie_ids.append(movie_id)

    print(f"[info] scanning {len(movie_ids)} movies for person credits")

    for index, movie_id in enumerate(movie_ids, start=1):
        credits = fetch_movie_credits(movie_id, api_key)
        if not credits:
            continue

        for person in credits.get("cast", []):
            name_key = normalize_name(person.get("name"))
            if name_key not in actor_targets:
                continue

            person_id = person.get("id")
            if person_id is None:
                continue

            candidate = actor_candidates[name_key].setdefault(
                person_id,
                {
                    "id": person_id,
                    "name": person.get("name", ""),
                    "profile_path": person.get("profile_path"),
                    "popularity": person.get("popularity", 0.0) or 0.0,
                    "count": 0,
                },
            )
            candidate["count"] += 1
            if not candidate.get("profile_path") and person.get("profile_path"):
                candidate["profile_path"] = person.get("profile_path")

        for person in credits.get("crew", []):
            if person.get("job") != "Director":
                continue

            name_key = normalize_name(person.get("name"))
            if name_key not in director_targets:
                continue

            person_id = person.get("id")
            if person_id is None:
                continue

            candidate = director_candidates[name_key].setdefault(
                person_id,
                {
                    "id": person_id,
                    "name": person.get("name", ""),
                    "profile_path": person.get("profile_path"),
                    "popularity": person.get("popularity", 0.0) or 0.0,
                    "count": 0,
                },
            )
            candidate["count"] += 1
            if not candidate.get("profile_path") and person.get("profile_path"):
                candidate["profile_path"] = person.get("profile_path")

        if index % 25 == 0:
            print(f"[info] processed {index}/{len(movie_ids)} movies")
        time.sleep(0.03)

    actor_hits = 0
    director_hits = 0

    for actor in actors:
        best = choose_best_candidate(actor_candidates.get(normalize_name(actor.get("name")), {}))
        if not best:
            continue
        actor["tmdb_person_id"] = best["id"]
        if best.get("profile_path"):
            actor["poster_url"] = f"{TMDB_IMAGE_BASE}{best['profile_path']}"
        actor_hits += 1

    for director in directors:
        best = choose_best_candidate(director_candidates.get(normalize_name(director.get("name")), {}))
        if not best:
            continue
        director["tmdb_person_id"] = best["id"]
        if best.get("profile_path"):
            director["poster_url"] = f"{TMDB_IMAGE_BASE}{best['profile_path']}"
        director_hits += 1

    save_json(ACTORS_PATH, actors)
    save_json(DIRECTORS_PATH, directors)

    actor_with_photo = sum(1 for actor in actors if actor.get("tmdb_person_id") and actor.get("poster_url"))
    director_with_photo = sum(1 for director in directors if director.get("tmdb_person_id") and director.get("poster_url"))

    print(f"[done] actors matched: {actor_hits}/{len(actors)}, with photo: {actor_with_photo}")
    print(f"[done] directors matched: {director_hits}/{len(directors)}, with photo: {director_with_photo}")


if __name__ == "__main__":
    main()
