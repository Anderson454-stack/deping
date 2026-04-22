from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from search_service import verify_query_embedding


def main() -> int:
    load_dotenv(ROOT_DIR / ".env")
    sample_query = "relaxed sci-fi cinematic visuals"
    result = verify_query_embedding(sample_query)
    payload = {
        "query": sample_query,
        "success": result.get("ok", False),
        "deployment": result.get("deployment"),
        "api_version": result.get("api_version"),
        "vector_length": result.get("vector_length"),
        "status_code": result.get("status_code"),
        "error": result.get("error"),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") and result.get("vector_length") == 1536 else 1


if __name__ == "__main__":
    raise SystemExit(main())
