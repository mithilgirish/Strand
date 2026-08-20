import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.deps import CurrentUser, get_optional_current_user
from backend.ingestion.pipeline import ingest_document
from backend.redis_client import redis_client

router = APIRouter()
UPLOAD_DIR = Path(tempfile.gettempdir()) / "strand_documents"


def _infer_document_type(filename: str) -> str | None:
    lower = (filename or "").lower()
    if "spec" in lower or "tia" in lower:
        return "spec"
    if "submittal" in lower or "vendor" in lower:
        return "submittal"
    if "schedule" in lower or lower.endswith(".csv"):
        return "schedule"
    if "supplier" in lower:
        return "supplier"
    if "checklist" in lower:
        return "checklist"
    return None


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name
    doc_token = uuid4().hex[:8].upper()
    upload_path = UPLOAD_DIR / f"{doc_token}-{safe_name}"
    upload_path.write_bytes(await file.read())
    tenant_id = user.tenant_id if user else "default"

    try:
        result = ingest_document(
            str(upload_path),
            document_type=_infer_document_type(safe_name),
            tenant_id=tenant_id,
        )
        result["source"] = "ingest_pipeline"
        result["degraded"] = result.get("status") not in {"ingested"}
        result["provenance_note"] = "" if not result["degraded"] else f"Ingestion status: {result.get('status')}"
        redis_client.set_json(f"document:{result.get('document_id')}", result, ttl=86400)
        return result
    except Exception as e:
        fallback = {
            "document_id": f"DOC-{doc_token}",
            "filename": safe_name,
            "status": "degraded",
            "node_count": 0,
            "chunk_count": 0,
            "source": "unavailable",
            "degraded": True,
            "provenance_note": f"Ingestion failed — file saved but PKG/Chroma write skipped: {e}",
        }
        redis_client.set_json(f"document:{fallback['document_id']}", fallback, ttl=86400)
        return fallback


@router.get("/documents/{doc_id}")
async def get_document_status(doc_id: str):
    cached = redis_client.get_json(f"document:{doc_id}")
    if cached:
        return cached
    return {
        "document_id": doc_id,
        "status": "not_found",
        "node_count": 0,
        "chunks_count": 0,
        "source": "unavailable",
        "degraded": True,
        "provenance_note": "No ingest record for this document id",
    }
