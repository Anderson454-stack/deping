import os
from pathlib import Path

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[3] / ".env")

endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
key = os.getenv("AZURE_SEARCH_API_KEY")
index_name = os.getenv("AZURE_SEARCH_INDEX_NAME", "movies-index")

idx_client = SearchIndexClient(endpoint=endpoint, credential=AzureKeyCredential(key))
index = idx_client.get_index(index_name)
print(f"✅ 필드 수: {len(index.fields)} (기대: 25개 이상)")

required = [
    "plot_complexity_level",
    "pacing",
    "visual_level",
    "keywords",
    "keywords_ko",
    "overview_vector",
]
existing = {field.name for field in index.fields}
missing = [field for field in required if field not in existing]
if missing:
    print(f"❌ 누락 필드: {missing}")
else:
    print("✅ 모든 인지 필드 존재")

search_client = SearchClient(
    endpoint=endpoint,
    index_name=index_name,
    credential=AzureKeyCredential(key),
)

results = search_client.search(search_text="*", include_total_count=True, top=1)
print(f"✅ 총 문서 수: {results.get_count()} (기대: 242)")

results = search_client.search(
    search_text="*",
    filter="plot_complexity_level eq 'low'",
    select=["title_ko", "plot_complexity_level", "pacing", "visual_level"],
    top=5,
)
print("\n=== 복잡도 낮은 영화 5편 ===")
for doc in results:
    print(
        f"  {doc['title_ko']} — "
        f"복잡도: {doc.get('plot_complexity_level')}, "
        f"전개: {doc.get('pacing')}, "
        f"영상미: {doc.get('visual_level')}"
    )

results = search_client.search(
    search_text="*",
    filter="keywords/any(k: k eq 'superhero')",
    select=["title_ko"],
    top=5,
)
print("\n=== 슈퍼히어로 키워드 영화 ===")
for doc in results:
    print(f"  {doc['title_ko']}")
