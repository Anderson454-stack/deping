import json
import os
from pathlib import Path

from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[3] / ".env")

INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX_NAME", "movies-index")

client = SearchIndexClient(
    endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
    credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY")),
)
index = client.get_index(INDEX_NAME)

output_path = Path(__file__).parent / "backup_current_schema.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(index.as_dict(), f, ensure_ascii=False, indent=2)

print(f"백업 파일: {output_path}")
print(f"현재 필드 수: {len(index.fields)}")
for field in index.fields:
    print(f"  {field.name:30s} {field.type}")
