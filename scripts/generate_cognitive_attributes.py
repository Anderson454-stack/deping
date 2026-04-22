"""
Deping — Cognitive Attribute Batch Generator
============================================
Fill the five cognitive fields in movies_index_ready.json with batch LLM calls.
Defaults:
  input  -> D:/deping/data/processed/movies_index_ready.json
  output -> D:/deping/data/processed/movies_index_enriched.json
  env    -> D:/deping/.env
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
import requests


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_FILE = ROOT_DIR / "data" / "processed" / "movies_index_ready.json"
DEFAULT_OUTPUT_FILE = ROOT_DIR / "data" / "processed" / "movies_index_enriched.json"
DEFAULT_BATCH_SIZE = 10
DEFAULT_SAVE_EVERY = 50
SLEEP_BETWEEN = 1.0
DEFAULT_DEPLOYMENT = "gpt-5"
COGNITIVE_FIELDS = (
    "pacing",
    "plot_complexity",
    "emotional_intensity",
    "visual_score",
    "sentiment_score",
)

load_dotenv(ROOT_DIR / ".env")

AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")


SYSTEM_PROMPT = """당신은 영화 분석 전문가입니다. 주어진 영화 정보를 바탕으로 인지적 감상 속성을 평가합니다.

각 영화에 대해 다음 5가지 속성을 JSON으로 반환하세요:

1. pacing: 전개 속도 ("fast" / "medium" / "slow")
   - fast: 액션 연속, 빠른 장면 전환, 120분 이하 액션/스릴러
   - medium: 균형 잡힌 전개
   - slow: 느린 전개, 명상적, 긴 호흡의 드라마

2. plot_complexity: 이야기 복잡도 (1~5 정수)
   - 1: 단순 명쾌한 구조 (직선형 서사)
   - 2: 약간의 반전이 있는 구조
   - 3: 복수의 서브플롯, 적당한 복잡도
   - 4: 시간 비선형, 다중 시점, 복잡한 구조
   - 5: 극도로 복잡 (테넷, 프라이머 수준)

3. emotional_intensity: 감정적 무게 (1~5 정수)
   - 1: 가벼움, 유쾌 (코미디, 가족 영화)
   - 2: 약간의 감정 변화
   - 3: 중간 수준의 감정적 몰입
   - 4: 깊은 감정적 울림, 여운
   - 5: 극도로 무거움 (전쟁, 비극, 트라우마)

4. visual_score: 영상미 점수 (0.0~1.0, 소수점 2자리)
   - 0.0~0.3: 평범한 영상
   - 0.4~0.6: 괜찮은 영상미
   - 0.7~0.8: 뛰어난 영상미
   - 0.9~1.0: 시각적 걸작 (그래비티, 블레이드러너 2049 수준)

5. sentiment_score: 전반적 관객 감성 (0.0~1.0, 소수점 2자리)
   - 0.0~0.3: 부정적/논란 많음
   - 0.4~0.6: 호불호 갈림
   - 0.7~0.8: 대체로 긍정적
   - 0.9~1.0: 압도적 호평

평가 시 장르, 줄거리, 런타임, 평점을 종합적으로 고려하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  {
    "id": "영화 id",
    "pacing": "fast|medium|slow",
    "plot_complexity": 1-5,
    "emotional_intensity": 1-5,
    "visual_score": 0.00-1.00,
    "sentiment_score": 0.00-1.00
  }
]"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate cognitive attributes for movies_index_ready.json.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT_FILE,
        help=f"Input JSON path (default: {DEFAULT_INPUT_FILE})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_FILE,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT_FILE})",
    )
    parser.add_argument(
        "--deployment",
        type=str,
        default=None,
        help="Azure OpenAI deployment name. Priority: CLI > .env > gpt-5",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Batch size for each LLM call (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--save-every",
        type=int,
        default=DEFAULT_SAVE_EVERY,
        help=f"Save after this many successful updates (default: {DEFAULT_SAVE_EVERY})",
    )
    parser.add_argument(
        "--resume",
        dest="resume",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Resume from output file when it already exists (default: True)",
    )
    return parser.parse_args()


def resolve_deployment(cli_value: str | None) -> str:
    return (
        (cli_value or "").strip()
        or os.getenv("AZURE_OPENAI_DEPLOYMENT", "").strip()
        or DEFAULT_DEPLOYMENT
    )


def normalize_chat_completions_endpoint(endpoint: str | None) -> str:
    value = (endpoint or "").strip().rstrip("/")
    if not value:
        return ""

    if value.endswith("/chat/completions"):
        return value
    if "/openai/v1" in value:
        return value + "/chat/completions"
    if "/openai/" in value:
        base = value.split("/openai/", 1)[0]
        return base + "/openai/v1/chat/completions"
    return value + "/openai/v1/chat/completions"


def build_user_prompt(movies: list[dict]) -> str:
    entries = []
    for movie in movies:
        genres_str = ", ".join(movie.get("genres") or [])
        entry = (
            f'- id: {movie["id"]}\n'
            f'  제목: {movie.get("title_ko") or movie.get("title", "")}\n'
            f"  장르: {genres_str}\n"
            f'  줄거리: {(movie.get("overview") or "정보 없음")[:300]}\n'
            f'  런타임: {movie.get("runtime") or "정보 없음"}분\n'
            f'  평점: {movie.get("rating_imdb") or "정보 없음"}'
        )
        entries.append(entry)
    return f"다음 {len(movies)}편의 영화를 평가해주세요:\n\n" + "\n\n".join(entries)


def parse_llm_response(content: str | list | None) -> list[dict]:
    if isinstance(content, list):
        text = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
    else:
        text = str(content or "")

    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
    return json.loads(text.strip())


def has_cognitive_values(movie: dict) -> bool:
    return all(movie.get(field) is not None for field in COGNITIVE_FIELDS)


def safe_int(value, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def safe_float(value, default: float, minimum: float, maximum: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, round(parsed, 2)))


def validate_cognitive(item: dict) -> dict:
    pacing = str(item.get("pacing", "medium")).strip().lower()
    if pacing not in {"fast", "medium", "slow"}:
        pacing = "medium"

    return {
        "pacing": pacing,
        "plot_complexity": safe_int(item.get("plot_complexity"), default=3, minimum=1, maximum=5),
        "emotional_intensity": safe_int(item.get("emotional_intensity"), default=3, minimum=1, maximum=5),
        "visual_score": safe_float(item.get("visual_score"), default=0.5, minimum=0.0, maximum=1.0),
        "sentiment_score": safe_float(item.get("sentiment_score"), default=0.5, minimum=0.0, maximum=1.0),
    }


def load_movies(input_file: Path, output_file: Path, resume: bool) -> tuple[list[dict], Path]:
    if resume and output_file.exists():
        source_path = output_file
    else:
        source_path = input_file

    if not source_path.exists():
        print(f"❌ 입력 파일을 찾을 수 없습니다: {source_path}")
        sys.exit(1)

    with source_path.open("r", encoding="utf-8") as file:
        movies = json.load(file)
    return movies, source_path


def call_chat_completion(deployment_name: str, messages: list[dict]) -> str:
    response = requests.post(
        normalize_chat_completions_endpoint(AZURE_ENDPOINT),
        headers={
            "Content-Type": "application/json",
            "api-key": AZURE_API_KEY or "",
        },
        json={
            "model": deployment_name,
            "messages": messages,
            "temperature": 0.3,
            "max_completion_tokens": 2000,
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    return (((payload.get("choices") or [{}])[0]).get("message") or {}).get("content", "")


def save_movies(output_file: Path, movies: list[dict]) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as file:
        json.dump(movies, file, ensure_ascii=False, indent=2)


def summarize_dataset(movies: list[dict]) -> dict[str, int]:
    total = len(movies)
    no_overview = sum(1 for movie in movies if not str(movie.get("overview") or "").strip())
    already_processed = sum(1 for movie in movies if has_cognitive_values(movie))
    kobis_only = sum(1 for movie in movies if movie.get("tmdb_id") is None)
    return {
        "total": total,
        "no_overview": no_overview,
        "already_processed": already_processed,
        "processable": total - no_overview - already_processed,
        "kobis_only": kobis_only,
    }


def build_processing_queue(movies: list[dict], resume: bool) -> list[tuple[int, dict]]:
    queue: list[tuple[int, dict]] = []
    for index, movie in enumerate(movies):
        if resume and has_cognitive_values(movie):
            continue
        if not str(movie.get("overview") or "").strip():
            continue
        queue.append((index, movie))
    return queue


def print_start_summary(
    source_path: Path,
    input_file: Path,
    output_file: Path,
    deployment_name: str,
    batch_size: int,
    save_every: int,
    resume: bool,
    summary: dict[str, int],
    queue_size: int,
) -> None:
    print("✅ OpenAI 호환 Azure endpoint 설정 확인 완료")
    print(f"   Endpoint: {normalize_chat_completions_endpoint(AZURE_ENDPOINT)}")
    print(f"   Deployment: {deployment_name}")
    print(f"   Source file: {source_path}")
    print(f"   Input file: {input_file}")
    print(f"   Output file: {output_file}")
    print(f"   Resume: {resume}")
    print(f"   Batch size: {batch_size}")
    print(f"   Save every: {save_every}")
    print()
    print("📊 입력 데이터 요약")
    print(f"   전체 레코드 수: {summary['total']}")
    print(f"   overview 없는 레코드 수: {summary['no_overview']}")
    print(f"   실제 처리 대상 수: {queue_size}")
    print(f"   이미 처리된 레코드 수: {summary['already_processed']}")
    print(f"   KOBIS-only 수: {summary['kobis_only']}")
    print()


def print_final_summary(
    movies: list[dict],
    failed_batches: list[int],
    parse_failed_batches: list[int],
    elapsed_seconds: float,
) -> None:
    filled = sum(1 for movie in movies if has_cognitive_values(movie))
    still_null = len(movies) - filled
    kobis_only = sum(1 for movie in movies if movie.get("tmdb_id") is None)

    print("\n" + "=" * 60)
    print("✅ 완료")
    print(f"   소요 시간: {elapsed_seconds:.0f}초 ({elapsed_seconds / 60:.1f}분)")
    print(f"   cognitive 채워진 수: {filled}")
    print(f"   여전히 null인 수: {still_null}")
    print(f"   KOBIS-only 수: {kobis_only}")
    print(f"   실패 배치 목록: {failed_batches or '없음'}")
    print(f"   JSON 파싱 실패 배치 목록: {parse_failed_batches or '없음'}")


def main() -> None:
    args = parse_args()

    input_file = args.input.resolve()
    output_file = args.output.resolve()
    batch_size = max(1, int(args.batch_size))
    save_every = max(1, int(args.save_every))
    deployment_name = resolve_deployment(args.deployment)

    if not AZURE_ENDPOINT or not AZURE_API_KEY:
        print("❌ .env에 AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY가 설정되어 있는지 확인하세요.")
        sys.exit(1)

    movies, source_path = load_movies(input_file=input_file, output_file=output_file, resume=args.resume)
    summary = summarize_dataset(movies)
    queue = build_processing_queue(movies, resume=args.resume)

    print_start_summary(
        source_path=source_path,
        input_file=input_file,
        output_file=output_file,
        deployment_name=deployment_name,
        batch_size=batch_size,
        save_every=save_every,
        resume=args.resume,
        summary=summary,
        queue_size=len(queue),
    )

    if not queue:
        print("✅ 처리할 레코드가 없습니다.")
        save_movies(output_file, movies)
        print_final_summary(movies, failed_batches=[], parse_failed_batches=[], elapsed_seconds=0.0)
        return

    total_batches = (len(queue) + batch_size - 1) // batch_size
    successful_updates = 0
    failed_updates = 0
    unsaved_successes = 0
    failed_batches: list[int] = []
    parse_failed_batches: list[int] = []
    started_at = time.time()

    for batch_index, batch_start in enumerate(range(0, len(queue), batch_size), start=1):
        batch = queue[batch_start:batch_start + batch_size]
        batch_movies = [movie for _, movie in batch]
        requested_ids = [str(movie["id"]) for movie in batch_movies]

        print(f"🔄 배치 {batch_index}/{total_batches} 처리 시작 ({len(batch_movies)}편)")

        try:
            result_text = call_chat_completion(
                deployment_name=deployment_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(batch_movies)},
                ],
            )
            results = parse_llm_response(result_text)
            if not isinstance(results, list):
                raise json.JSONDecodeError("Response root is not a list", str(results), 0)

            if len(results) != len(batch_movies):
                print(
                    f"   ⚠️ 응답 영화 수 불일치: 요청 {len(batch_movies)}편 / 응답 {len(results)}편"
                )

            result_map = {
                str(item.get("id")): validate_cognitive(item)
                for item in results
                if isinstance(item, dict) and item.get("id") is not None
            }

            missing_ids = [movie_id for movie_id in requested_ids if movie_id not in result_map]
            matched = 0

            for index, movie in batch:
                movie_id = str(movie["id"])
                if movie_id not in result_map:
                    continue
                movies[index].update(result_map[movie_id])
                matched += 1

            batch_success = matched
            batch_failure = len(batch_movies) - matched
            successful_updates += batch_success
            failed_updates += batch_failure
            unsaved_successes += batch_success

            print(f"   ✅ 배치 성공 수: {batch_success}")
            print(f"   ⚠️ 배치 실패 수: {batch_failure}")
            if missing_ids:
                print(f"   ⚠️ 응답에 없는 id 샘플: {missing_ids[:5]}")
            if batch_failure > 0:
                failed_batches.append(batch_index)

        except json.JSONDecodeError as exc:
            failed_updates += len(batch_movies)
            failed_batches.append(batch_index)
            parse_failed_batches.append(batch_index)
            print(f"   ⚠️ JSON 파싱 실패 (배치 {batch_index}): {exc}")
        except Exception as exc:
            failed_updates += len(batch_movies)
            failed_batches.append(batch_index)
            print(f"   ❌ API 오류 (배치 {batch_index}): {exc}")
            time.sleep(5)

        if unsaved_successes >= save_every:
            save_movies(output_file, movies)
            print(f"   💾 중간 저장 완료 ({successful_updates}편 반영)")
            unsaved_successes = 0

        time.sleep(SLEEP_BETWEEN)

    save_movies(output_file, movies)
    print(f"\n💾 최종 저장 완료: {output_file}")
    print(f"   총 성공 수: {successful_updates}")
    print(f"   총 실패 수: {failed_updates}")
    print_final_summary(
        movies=movies,
        failed_batches=failed_batches,
        parse_failed_batches=parse_failed_batches,
        elapsed_seconds=time.time() - started_at,
    )


if __name__ == "__main__":
    main()
