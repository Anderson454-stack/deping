"""
Deping — Azure Blob Storage 업로드
===================================

raw-data 컨테이너에 원본 JSON 업로드.
Azure AI Search가 이 Blob을 데이터 소스로 쓸 수도 있고,
백업/재처리용으로도 활용 가능.

실행 전 확인 사항:
1. .env 파일에 AZURE_STORAGE_CONNECTION_STRING 필요
2. pip install azure-storage-blob python-dotenv

실행:
   python upload_to_blob.py
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient, ContentSettings

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
assert CONNECTION_STRING, "AZURE_STORAGE_CONNECTION_STRING 누락"

blob_service = BlobServiceClient.from_connection_string(CONNECTION_STRING)


def upload_file(container_name: str, local_path: Path, blob_name: str = None):
    """단일 파일 업로드"""
    blob_name = blob_name or local_path.name

    # 컨테이너 생성 (없으면)
    try:
        blob_service.create_container(container_name)
        print(f"📦 컨테이너 생성: {container_name}")
    except Exception:
        pass  # 이미 존재

    blob_client = blob_service.get_blob_client(
        container=container_name,
        blob=blob_name
    )

    with open(local_path, "rb") as f:
        blob_client.upload_blob(
            f,
            overwrite=True,
            content_settings=ContentSettings(content_type="application/json")
        )

    size_kb = local_path.stat().st_size / 1024
    print(f"✅ 업로드 완료: {container_name}/{blob_name} ({size_kb:.1f} KB)")
    return blob_client.url


if __name__ == "__main__":
    base_dir = Path(__file__).parent

    # 원본 데이터 업로드
    print("=" * 60)
    print("Deping Azure Blob Storage 업로드")
    print("=" * 60)

    files_to_upload = [
        # (로컬 경로, 컨테이너, Blob 이름)
        (base_dir / "tmdb_data_mis.json", "raw-data", "tmdb_data_mis.json"),
        (base_dir / "deping_search_index.json", "processed", "movies_search_index.json"),
        (base_dir / "deping_search_index.jsonl", "processed", "movies_search_index.jsonl"),
    ]

    for local_path, container, blob_name in files_to_upload:
        if not local_path.exists():
            print(f"⚠️  파일 없음: {local_path} — 스킵")
            continue
        try:
            url = upload_file(container, local_path, blob_name)
            print(f"   URL: {url}\n")
        except Exception as e:
            print(f"❌ 실패: {local_path.name} — {e}\n")

    print("\n완료")
