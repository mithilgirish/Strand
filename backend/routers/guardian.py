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
    from backend.project_state import outbox_for_tenant

    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    by_id: dict[str, dict] = {}
    for item in outbox_for_tenant(resolved_tenant_id):
        if item.get("violation_id"):
            by_id[str(item["violation_id"])] = item

    cache_prefix = f"rfi_approval:{_tenant_cache_part(resolved_tenant_id)}:"
    raw_keys = redis_client.keys(f"cache:{cache_prefix}*")
    for key in raw_keys:
        data = redis_client.get_json(key)
        if data and data.get("violation_id"):
            by_id[str(data["violation_id"])] = data

    approvals = list(by_id.values())
    approvals.sort(key=lambda item: item.get("approved_at") or "", reverse=True)
    # #region agent log
    try:
        import json as _dj, time as _dt
        from pathlib import Path as _P
        with _P(r"C:\Users\revku\Documents\ET-HACKATHON\Strand\debug-66e2e3.log").open("a", encoding="utf-8") as _f:
            _f.write(_dj.dumps({"sessionId":"66e2e3","runId":"post-fix","hypothesisId":"F","location":"backend/routers/guardian.py:get_rfi_outbox","message":"outbox list","data":{"tenant":resolved_tenant_id,"auth":bool(user),"redis_keys":len(raw_keys),"count":len(approvals),"ids":[a.get("violation_id") for a in approvals[:8]],"statuses":[a.get("status") for a in approvals[:8]],"item_tenants":[a.get("tenant_id") for a in approvals[:8]]},"timestamp":int(_dt.time()*1000)})+"\n")
    except Exception:
        pass
    # #endregion
    return {"approvals": approvals}


@router.get("/guardian/rfi/{violation_id}")
async def get_rfi(
    violation_id: str,
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    try:
        violation = await get_violation(violation_id, tenant_id=tenant_id, user=user)
        return {"violation_id": violation_id, "rfi_draft": violation.get("rfi_draft", "")}
    except HTTPException:
        from backend.project_state import load_latest
        latest = load_latest() or {}
        return {"violation_id": violation_id, "rfi_draft": latest.get("rfi_draft", "")}


@router.post("/guardian/rfi/{violation_id}/approve")
async def approve_rfi(
    violation_id: str,
    tenant_id: str | None = None,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    from backend.project_state import load_latest, upsert_outbox_item

    resolved_tenant_id = _resolve_tenant(user, tenant_id)
    rfi_text = ""
    submittal_id = None
    parameter = None
    spec_clause = None
    try:
        violation = await get_violation(violation_id, tenant_id=resolved_tenant_id, user=user)
        rfi_text = str(violation.get("rfi_draft") or "")
        submittal_id = violation.get("submittal_id")
        parameter = violation.get("parameter")
        spec_clause = violation.get("section")
    except HTTPException:
        latest = load_latest() or {}
        rfi_text = str(latest.get("rfi_draft") or "")
        submittal_id = latest.get("submittal_id")
        first = (latest.get("violations") or [{}])[0]
        parameter = first.get("parameter")
        spec_clause = first.get("section")

    approval = {
        "violation_id": violation_id,
        "tenant_id": resolved_tenant_id,
        "status": "approved_sent",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "delivery_channel": "System Outbox",
        "message": rfi_text or "RFI approved and queued for sending.",
        "submittal_id": submittal_id,
        "parameter": parameter,
        "spec_clause": spec_clause,
        "source": "submittal" if rfi_text else "approval",
    }
    redis_client.set_cache(
        f"rfi_approval:{_tenant_cache_part(resolved_tenant_id)}:{violation_id}",
        approval,
        ttl=86400 * 7,
    )
    upsert_outbox_item(approval)
    return approval
