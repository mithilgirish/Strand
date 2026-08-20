from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from backend.agents.guardian import run_guardian
from backend.deps import CurrentUser, get_optional_current_user, limiter
from backend.redis_client import redis_client

router = APIRouter()
UPLOAD_DIR = Path(tempfile.gettempdir()) / "strand_uploads"


def _tenant_cache_part(tenant_id: str = "default") -> str:
    return (tenant_id or "default").replace(":", "_")


def _resolve_tenant(user: CurrentUser | None, requested_tenant_id: str | None) -> str:
    if user:
        if (
            requested_tenant_id
            and requested_tenant_id != user.tenant_id
            and user.role not in {"super-admin", "super_admin"}
        ):
            raise HTTPException(status_code=403, detail="Requested tenant does not match authenticated tenant claim.")
        return requested_tenant_id or user.tenant_id
    return requested_tenant_id or "default"


@router.post("/guardian/analyze")
@limiter.limit("30/minute")
async def analyze_submittal(
    request: Request,
    file: UploadFile = File(...),
    submittal_id: str | None = Form(default=None),
    tenant_id: str | None = Form(default=None),
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF submittals are supported")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name
    analysis_id = submittal_id or f"SUB-{uuid4().hex[:8].upper()}"
    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    upload_path = UPLOAD_DIR / f"{analysis_id}-{safe_name}"

    try:
        upload_path.write_bytes(await file.read())
        return await run_guardian(analysis_id, str(upload_path), tenant_id=resolved_tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Guardian analysis failed: {e}") from e


@router.get("/guardian/violations")
async def list_violations(
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    violations = []
    for key in redis_client.keys(f"cache:guardian:{_tenant_cache_part(resolved_tenant_id)}:*"):
        cached = redis_client.get_json(key)
        if not cached:
            continue
        for violation in cached.get("violations", []):
            violations.append({**violation, "submittal_id": cached.get("submittal_id", "")})
    return {"violations": violations, "count": len(violations)}


@router.get("/guardian/violations/{violation_id}")
async def get_violation(
    violation_id: str,
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    for key in redis_client.keys(f"cache:guardian:{_tenant_cache_part(resolved_tenant_id)}:*"):
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

@router.get("/guardian/rfi/outbox")
async def get_rfi_outbox(
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    cache_prefix = f"rfi_approval:{_tenant_cache_part(resolved_tenant_id)}:"
    
    # keys() returns the raw full keys (e.g., cache:rfi_approval:...)
    raw_keys = redis_client.keys(f"cache:{cache_prefix}*")
    
    approvals = []
    for key in raw_keys:
        data = redis_client.get_json(key)
        if data:
            approvals.append(data)
            
    # Sort by approval time, newest first
    approvals.sort(key=lambda x: x.get("approved_at", ""), reverse=True)
    return {"approvals": approvals}


@router.get("/guardian/rfi/{violation_id}")
async def get_rfi(
    violation_id: str,
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    violation = await get_violation(violation_id, tenant_id=tenant_id, user=user)
    return {"violation_id": violation_id, "rfi_draft": violation.get("rfi_draft", "")}


@router.post("/guardian/rfi/{violation_id}/approve")
async def approve_rfi(
    violation_id: str,
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    approval = {
        "violation_id": violation_id,
        "tenant_id": resolved_tenant_id,
        "status": "queued",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "delivery_channel": "System Outbox",
        "message": "RFI approved and queued for sending. Delivery has not been confirmed.",
    }
    redis_client.set_cache(f"rfi_approval:{_tenant_cache_part(resolved_tenant_id)}:{violation_id}", approval)
    return approval
