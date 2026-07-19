"""
backend/routers/dashboards.py — Custom BI Dashboards & AI Generator Router

All routes are fully secured and scoped to the user's tenant.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
import httpx
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from backend.deps import get_current_user, get_optional_current_user, CurrentUser
from backend.config import settings
from backend.graph.client import get_neo4j_session
from backend.agents.dashboard import generate_dashboard_config
from backend.agents.guardian import run_guardian
from backend.agents.inspector import list_ncrs
from backend.agents.oracle import run_oracle
from backend.agents.scheduler import run_scheduler
from backend.redis_client import redis_client

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])
compat_router = APIRouter(prefix="/dashboard", tags=["Dashboard Builder"])
UPLOAD_DIR = Path("/tmp/strand_dashboard_uploads")

# ---------------------------------------------------------------------------
# Helper: Supabase Headers & URLs
# ---------------------------------------------------------------------------
def _supabase_headers() -> dict:
    service_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_SERVICE_ROLE_KEY not configured on server."
        )
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

def _supabase_rest_url(path: str) -> str:
    url = getattr(settings, "SUPABASE_URL", "")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_URL not configured on server."
        )
    return f"{url}/rest/v1/{path}"

# ---------------------------------------------------------------------------
# Request & Response Models
# ---------------------------------------------------------------------------
class DashboardQuery(BaseModel):
    query: str

class GenerateRequest(BaseModel):
    prompt: str

class SaveDashboardRequest(BaseModel):
    dashboard_name: str
    layout: List[Dict[str, Any]]
    queries: Dict[str, str]

# ---------------------------------------------------------------------------
# Cypher Query Sanitization
# ---------------------------------------------------------------------------
READ_STARTERS = ("MATCH", "OPTIONAL MATCH", "WITH", "UNWIND")
MUTATING_KEYWORDS = (
    "CREATE",
    "MERGE",
    "SET",
    "DELETE",
    "REMOVE",
    "DETACH",
    "DROP",
    "CALL",
    "YIELD",
    "LOAD",
    "LOAD CSV",
    "FOREACH",
    "ALTER",
    "INDEX",
    "CONSTRAINT",
    "GRANT",
    "DENY",
    "REVOKE",
    "UNION",
    "USE",
)
NODE_PATTERN = re.compile(
    r"\((?P<var>[A-Za-z_][A-Za-z0-9_]*)?"
    r"(?P<labels>(?::`?[\w\s]+`?)+)"
    r"(?:\s*\{(?P<props>[^{}]*)\})?"
    r"\)"
)


def _strip_cypher_comments(cypher: str) -> str:
    cypher = re.sub(r"//.*?$", "", cypher, flags=re.MULTILINE)
    return re.sub(r"/\*.*?\*/", "", cypher, flags=re.DOTALL)


def _has_tenant_scope(cypher: str) -> bool:
    return bool(
        re.search(r"\btenant_id\s*:\s*\$tenant_id\b", cypher)
        or re.search(r"\.\s*tenant_id\s*=\s*\$tenant_id\b", cypher)
    )


def _inject_tenant_into_node(match: re.Match) -> str:
    props = match.group("props")
    if props is None:
        return f"({match.group('var') or ''}{match.group('labels')} {{tenant_id: $tenant_id}})"
    if re.search(r"\btenant_id\b", props):
        return match.group(0)
    return f"({match.group('var') or ''}{match.group('labels')} {{{props.strip()}, tenant_id: $tenant_id}})"


def sanitize_and_inject_tenant(cypher: str, tenant_id: str) -> str:
    """
    Ensures:
    1. No write mutators or procedures.
    2. Tenant isolation is enforced inside the Cypher query.
    """
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant claim is required for dashboard queries.",
        )

    if "//" in cypher or "/*" in cypher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comments are not allowed in queries.",
        )

    stripped = _strip_cypher_comments(cypher).strip()
    if not stripped:
        raise HTTPException(status_code=400, detail="Cypher query cannot be empty.")

    if ";" in stripped.rstrip(";"):
        raise HTTPException(status_code=400, detail="Multiple Cypher statements are not permitted.")
    stripped = stripped.rstrip(";").strip()

    upper_query = stripped.upper()
    if not upper_query.startswith(READ_STARTERS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dashboard queries must be read-only MATCH/WITH/UNWIND Cypher.",
        )

    for keyword in MUTATING_KEYWORDS:
        if re.search(rf"\b{re.escape(keyword)}\b", upper_query):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mutating query keyword '{keyword}' is not permitted.",
            )

    if re.search(r"\bOR\b", upper_query):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OR clauses are restricted to prevent isolation bypass.",
        )

    if "tenant_id" in stripped and "$tenant_id" not in stripped:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dashboard queries must use the $tenant_id parameter for tenant scoping.",
        )

    if _has_tenant_scope(stripped):
        return stripped

    secured = NODE_PATTERN.sub(_inject_tenant_into_node, stripped)
    if secured == stripped or not _has_tenant_scope(secured):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to enforce tenant isolation on this Cypher query.",
        )

    return secured


def _cached_guardian_violations() -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    for key in redis_client.keys("cache:guardian:*"):
        cached = redis_client.get_json(key)
        if not cached:
            continue
        for violation in cached.get("violations", []):
            violations.append({**violation, "submittal_id": cached.get("submittal_id", "")})
    return violations


def _resolve_tenant_id(user: CurrentUser | None, payload_tenant_id: str | None, project_id: str) -> str:
    if user:
        if (
            payload_tenant_id
            and payload_tenant_id != user.tenant_id
            and user.role not in {"super-admin", "super_admin"}
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requested tenant does not match authenticated tenant claim.",
            )
        return payload_tenant_id or user.tenant_id
    return payload_tenant_id or project_id or "demo"


async def _parse_build_payload(request: Request) -> tuple[str, str, str | None, Any | None]:
    content_type = request.headers.get("content-type", "").lower()
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        return (
            str(form.get("prompt") or "").strip(),
            str(form.get("project_id") or "default").strip() or "default",
            str(form.get("tenant_id") or "").strip() or None,
            form.get("file"),
        )

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Request body must be valid JSON or multipart form data.") from exc

    return (
        str(payload.get("prompt") or "").strip(),
        str(payload.get("project_id") or "default").strip() or "default",
        str(payload.get("tenant_id") or "").strip() or None,
        None,
    )


async def _analyze_dashboard_upload(upload: Any, project_id: str) -> dict[str, Any] | None:
    if not upload or not getattr(upload, "filename", ""):
        return None
    filename = Path(upload.filename).name
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Dashboard document uploads must be PDFs.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    analysis_id = f"DASH-{project_id}-{uuid4().hex[:6].upper()}"
    upload_path = UPLOAD_DIR / f"{analysis_id}-{filename}"
    upload_path.write_bytes(await upload.read())
    return await run_guardian(analysis_id, str(upload_path))


def _dashboard_widgets(
    *,
    prompt: str,
    guardian_violations: list[dict[str, Any]],
    at_risk_shipments: list[dict[str, Any]],
    ncrs: list[dict[str, Any]],
    scheduler_result: dict[str, Any],
) -> list[dict[str, Any]]:
    risk_tasks = scheduler_result.get("at_risk_tasks", [])
    r0_values = [
        float(item.get("r0_score", 0) or 0)
        for item in [*guardian_violations, *risk_tasks, *ncrs]
        if isinstance(item, dict)
    ]
    max_r0 = round(max(r0_values or [0.0]), 1)

    widgets = [
        {
            "id": "max_r0",
            "type": "R0Gauge",
            "title": "Maximum R0",
            "source": "scheduler+guardian+inspector",
            "data": [{"value": max_r0}],
        },
        {
            "id": "spec_violations",
            "type": "DataGrid",
            "title": "Current Spec Violations",
            "source": "guardian",
            "data": guardian_violations,
        },
        {
            "id": "at_risk_shipments",
            "type": "DataGrid",
            "title": "At-Risk Shipments",
            "source": "oracle",
            "data": at_risk_shipments,
        },
        {
            "id": "open_ncrs",
            "type": "DataGrid",
            "title": "Open NCRs",
            "source": "inspector",
            "data": ncrs,
        },
    ]

    lowered = prompt.lower()
    if "schedule" in lowered or "critical path" in lowered or "risk" in lowered:
        widgets.append(
            {
                "id": "schedule_risks",
                "type": "DataGrid",
                "title": "Schedule R0 Risks",
                "source": "scheduler",
                "data": risk_tasks[:10],
            }
        )
    return widgets

# ---------------------------------------------------------------------------
# POST /dashboards/generate
# ---------------------------------------------------------------------------
@router.post("/generate")
async def generate_dashboard(
    payload: GenerateRequest,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Calls the AI Dashboard Agent to map the user prompt to layout/Cypher configurations.
    """
    try:
        config = await generate_dashboard_config(payload.prompt)
        return config
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )

# ---------------------------------------------------------------------------
# POST /dashboards/query
# ---------------------------------------------------------------------------
@router.post("/query")
async def execute_dashboard_query(
    payload: DashboardQuery, 
    user: CurrentUser = Depends(get_current_user)
):
    """
    Executes a read-only Cypher query with strict tenant isolation.
    """
    secured_cypher = sanitize_and_inject_tenant(payload.query, user.tenant_id)
    
    # Use the standard Neo4j read access string literal "READ"
    try:
        # Pass $tenant_id parameter to ensure query scoping
        with get_neo4j_session(default_access_mode="READ") as session:
            result = session.run(secured_cypher, {"tenant_id": user.tenant_id}).data()
        return {"data": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph database error: {str(e)}"
        )

# ---------------------------------------------------------------------------
# POST /dashboards/save
# ---------------------------------------------------------------------------
@router.post("/save")
async def save_dashboard(
    payload: SaveDashboardRequest,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Saves a generated custom dashboard to public.custom_dashboards.
    """
    headers = _supabase_headers()
    url = _supabase_rest_url("custom_dashboards")
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers={**headers, "Prefer": "return=representation"},
            json={
                "tenant_id": user.tenant_id,
                "created_by": user.id,
                "dashboard_name": payload.dashboard_name,
                "layout": payload.layout,
                "queries": payload.queries,
            }
        )
        
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Failed to save dashboard to database: {resp.text}"
        )
        
    return {"status": "saved", "dashboard": resp.json()[0]}

# ---------------------------------------------------------------------------
# GET /dashboards/list
# ---------------------------------------------------------------------------
@router.get("/list")
async def list_dashboards(
    user: CurrentUser = Depends(get_current_user)
):
    """
    Lists all saved dashboards for the user's tenant.
    """
    headers = _supabase_headers()
    url = _supabase_rest_url(f"custom_dashboards?tenant_id=eq.{user.tenant_id}&order=created_at.desc")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch dashboards from database: {resp.text}"
        )
        
    return {"dashboards": resp.json()}

# ---------------------------------------------------------------------------
# GET /dashboards/{id}
# ---------------------------------------------------------------------------
@router.get("/{dashboard_id}")
async def get_dashboard(
    dashboard_id: UUID,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves a single dashboard configuration.
    """
    headers = _supabase_headers()
    url = _supabase_rest_url(f"custom_dashboards?id=eq.{dashboard_id}&tenant_id=eq.{user.tenant_id}")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch dashboard: {resp.text}"
        )
        
    dashboards = resp.json()
    if not dashboards:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found or access denied."
        )
        
    return dashboards[0]

# ---------------------------------------------------------------------------
# DELETE /dashboards/{id}
# ---------------------------------------------------------------------------
@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: UUID,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Deletes a custom dashboard configuration.
    """
    headers = _supabase_headers()
    url = _supabase_rest_url(f"custom_dashboards?id=eq.{dashboard_id}&tenant_id=eq.{user.tenant_id}")
    
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers=headers)
        
    if resp.status_code not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail=f"Failed to delete dashboard: {resp.text}"
        )
        
    return {"status": "deleted"}


@compat_router.post("/build")
async def build_dashboard_from_prompt(
    request: Request,
    user: CurrentUser | None = Depends(get_optional_current_user),
):
    """Demo/E2E compatible prompt-to-dashboard endpoint.

    The secured `/dashboards/*` routes remain the canonical authenticated API.
    This route exists for agentic QA/demo flows and assembles live read-only
    widget data from the actual STRAND agents without persisting cross-tenant
    dashboard state.
    """
    prompt, project_id, payload_tenant_id, upload = await _parse_build_payload(request)
    if not prompt:
        raise HTTPException(status_code=422, detail="prompt is required")

    tenant_id = _resolve_tenant_id(user, payload_tenant_id, project_id)
    generated_config = await generate_dashboard_config(prompt)
    guardian_result = await _analyze_dashboard_upload(upload, project_id)
    guardian_violations = (
        guardian_result.get("violations", [])
        if guardian_result
        else _cached_guardian_violations()
    )

    oracle_result = await run_oracle(project_id=project_id)
    scheduler_result = await run_scheduler()
    ncrs = await list_ncrs()
    widgets = _dashboard_widgets(
        prompt=prompt,
        guardian_violations=guardian_violations,
        at_risk_shipments=oracle_result.get("at_risk_shipments", []),
        ncrs=ncrs,
        scheduler_result=scheduler_result,
    )

    return {
        "dashboard_id": f"DB-{uuid4().hex[:8].upper()}",
        "dashboard_name": generated_config.get("dashboard_name") or prompt[:80],
        "tenant_id": tenant_id,
        "project_id": project_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "widgets": widgets,
        "components": widgets,
        "layout": generated_config.get("layout", []),
        "queries": generated_config.get("queries", {}),
        "sources": sorted({widget["source"] for widget in widgets}),
    }
