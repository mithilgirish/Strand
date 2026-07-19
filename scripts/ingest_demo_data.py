import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

# Add the Strand root to the path so we can import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ingestion.pipeline import ingest_document

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

files_to_ingest = [
    os.path.join(BASE_DIR, "data", "test_scenarios", "clean", "supplier_graph_clean.json"),
    os.path.join(BASE_DIR, "data", "test_scenarios", "clean", "submittal_clean.json"),
    os.path.join(BASE_DIR, "data", "test_scenarios", "clean", "rfi_data_clean.json"),
    os.path.join(BASE_DIR, "data", "supplier_graph_data.json")
]

for f in files_to_ingest:
    print(f"Ingesting {f}...")
    try:
        res = ingest_document(f, tenant_id="demo-123")
        print(f"Success: {res}")
    except Exception as e:
        print(f"Error ingesting {f}: {e}")
