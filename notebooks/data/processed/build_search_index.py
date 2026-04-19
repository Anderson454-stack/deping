"""
Deping — Azure AI Search 인덱스 구축 및 데이터 업로드
=====================================================

실행 전 확인 사항:
1. 루트 .env 파일에 아래 환경변수 필요
   - AZURE_SEARCH_ENDPOINT
   - AZURE_SEARCH_API_KEY
   - AZURE_OPENAI_ENDPOINT
   - AZURE_OPENAI_API_KEY
   - AZURE_OPENAI_EMBED_DEPLOYMENT (예: text-embedding-3-small)
2. deping_search_index.json 파일과 movies_index_schema.json 필요
3. pip install azure-search-documents openai python-dotenv

실행:
   python build_search_index.py
"""

import json
import os
from pathlib import Path
from urllib.parse import urlsplit
import requests
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import SearchIndex

# ── 환경변수 로드 ───────────────────────────────────────
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_API_KEY")
AOAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AOAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
EMBED_DEPLOYMENT = (
    os.getenv("AZURE_OPENAI_EMBED_DEPLOYMENT")
    or os.getenv("AZURE_OPENAI_DEPLOY_EMBED")
    or "text-embedding-3-small"
)
AOAI_API_VERSION = os.getenv("AZURE_OPENAI_EMBED_API_VERSION", "2024-02-01")
INDEX_NAME = "movies-index"

assert SEARCH_ENDPOINT and SEARCH_KEY, "Azure Search 환경변수 누락"
assert AOAI_ENDPOINT and AOAI_KEY, "Azure OpenAI 환경변수 누락"


def _extract_resource_uri(endpoint: str) -> str:
    parsed = urlsplit(endpoint)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"Azure OpenAI endpoint 형식이 잘못되었습니다: {endpoint}")
    return f"{parsed.scheme}://{parsed.netloc}"


AOAI_RESOURCE_URI = _extract_resource_uri(AOAI_ENDPOINT)

# ── 클라이언트 초기화 ──────────────────────────────────
index_client = SearchIndexClient(
    endpoint=SEARCH_ENDPOINT,
    credential=AzureKeyCredential(SEARCH_KEY)
)
search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(SEARCH_KEY)
)
def create_or_update_index():
    """movies_index_schema.json을 읽어 인덱스 생성 또는 업데이트"""
    schema_path = Path(__file__).parent / "movies_index_schema.json"
    with open(schema_path, encoding="utf-8") as f:
        schema = json.load(f)

    # vectorizer에 실제 키/엔드포인트 주입
    for vec in schema["vectorSearch"]["vectorizers"]:
        vec["azureOpenAIParameters"]["resourceUri"] = AOAI_RESOURCE_URI
        vec["azureOpenAIParameters"]["apiKey"] = AOAI_KEY
        vec["azureOpenAIParameters"]["deploymentId"] = EMBED_DEPLOYMENT
        vec["azureOpenAIParameters"]["modelName"] = EMBED_DEPLOYMENT

    # SearchIndex 객체로 변환
    index = SearchIndex.deserialize(schema)
    try:
        result = index_client.create_or_update_index(index)
        print(f"✅ 인덱스 생성/업데이트 완료: {result.name}")
    except HttpResponseError as exc:
        if "CannotChangeExistingField" not in str(exc):
            raise
        print("⚠️ 기존 필드 변경이 불가해 인덱스를 삭제 후 재생성합니다.")
        index_client.delete_index(INDEX_NAME)
        result = index_client.create_index(index)
        print(f"✅ 인덱스 재생성 완료: {result.name}")


def embed_text(text: str) -> list[float]:
    """텍스트를 1536차원 벡터로 변환"""
    if not text:
        return [0.0] * 1536
    response = requests.post(
        f"{AOAI_RESOURCE_URI}/openai/deployments/{EMBED_DEPLOYMENT}/embeddings",
        params={"api-version": AOAI_API_VERSION},
        headers={
            "Content-Type": "application/json",
            "api-key": AOAI_KEY,
        },
        json={"input": text[:8000]},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["data"][0]["embedding"]


def upload_documents(batch_size: int = 50):
    """deping_search_index.json을 읽어 임베딩 추가 후 업로드"""
    data_path = Path(__file__).parent / "deping_search_index.json"
    with open(data_path, encoding="utf-8") as f:
        documents = json.load(f)

    print(f"📦 총 {len(documents)}개 문서 업로드 시작")

    enriched = []
    for i, doc in enumerate(documents, 1):
        # overview를 기반으로 벡터 생성 (제목 + 키워드 포함)
        embed_source = " ".join([
            doc.get("title", ""),
            doc.get("overview", ""),
            " ".join(doc.get("keywords_ko", [])),
            " ".join(doc.get("genres", [])),
        ])
        doc["overview_vector"] = embed_text(embed_source)
        enriched.append(doc)

        if i % 10 == 0:
            print(f"  임베딩 진행: {i}/{len(documents)}")

        # 배치 업로드
        if len(enriched) >= batch_size:
            result = search_client.upload_documents(documents=enriched)
            print(f"  📤 배치 업로드: {len(enriched)}건 — {sum(1 for r in result if r.succeeded)}건 성공")
            enriched = []

    # 남은 문서 업로드
    if enriched:
        result = search_client.upload_documents(documents=enriched)
        print(f"  📤 최종 배치: {len(enriched)}건")

    print(f"\n✅ 업로드 완료")


def verify_index():
    """업로드 검증"""
    results = search_client.search(search_text="*", include_total_count=True, top=3)
    count = results.get_count()
    print(f"\n🔍 인덱스 내 문서 수: {count}")

    print("\n샘플 문서 3건:")
    for doc in results:
        title = doc.get("title_ko") or doc.get("title") or ""
        genres = doc.get("genres") or []
        print(f"  [{doc['id']}] {title} ({doc['year']}) — {', '.join(genres)}")


if __name__ == "__main__":
    print("=" * 60)
    print("Deping Azure AI Search 인덱스 구축")
    print("=" * 60)

    print("\n[1/3] 인덱스 스키마 생성")
    create_or_update_index()

    print("\n[2/3] 문서 업로드 (임베딩 포함)")
    upload_documents()

    print("\n[3/3] 검증")
    verify_index()
