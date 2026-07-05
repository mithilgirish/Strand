from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from backend.agents.guardian import run_guardian
from backend.deps import limiter
from backend.redis_client import redis_client

router = APIRouter()
UPLOAD_DIR = Path("/tmp/strand_uploads")

@router.post("/guardian/analyze")
@limiter.limit("30/minute")
async def analyze_submittal(
    request: Request,
    file: UploadFile = File(...),
    submittal_id: str | None = Form(default=None),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF submittals are supported")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name
    analysis_id = submittal_id or f"SUB-{uuid4().hex[:8].upper()}"
    upload_path = UPLOAD_DIR / f"{analysis_id}-{safe_name}"

    try:
        upload_path.write_bytes(await file.read())
        return await run_guardian(analysis_id, str(upload_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Guardian analysis failed: {e}") from e


@router.get("/guardian/violations")
async def list_violations():
    violations = []
    for key in redis_client.keys("cache:guardian:*"):
        cached = redis_client.get_json(key)
        if not cached:
            continue
        for violation in cached.get("violations", []):
            violations.append({**violation, "submittal_id": cached.get("submittal_id", "")})
    return {"violations": violations, "count": len(violations)}


@router.get("/guardian/violations/{violation_id}")
async def get_violation(violation_id: str):
    for key in redis_client.keys("cache:guardian:*"):
        cached = redis_client.get_json(key)
        if not cached:
            continue
        for violation in cached.get("violations", []):
            if violation.get("id") == violation_id:
                parameter = violation.get("parameter", "")
                return {
                    **violation,
                    "submittal_id": cached.get("submittal_id", ""),
                    "spec_dna_chain": cached.get("spec_dna_chain", {}).get(parameter, []),
                    "rfi_draft": cached.get("rfi_draft", ""),
                }
    raise HTTPException(status_code=404, detail="Violation not found")


@router.get("/guardian/rfi/{violation_id}")
async def get_rfi(violation_id: str):
    violation = await get_violation(violation_id)
    return {"violation_id": violation_id, "rfi_draft": violation.get("rfi_draft", "")}


@router.post("/guardian/rfi/{violation_id}/approve")
async def approve_rfi(violation_id: str):
    approval = {
        "violation_id": violation_id,
        "status": "approved_sent",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "delivery_channel": "demo_outbox",
        "message": "RFI approved and queued for sending.",
    }
    redis_client.set_cache(f"rfi_approval:{violation_id}", approval)
    return approval
