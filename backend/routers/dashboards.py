"""
backend/routers/dashboards.py — Custom BI Dashboards & AI Generator Router

All routes are fully secured and scoped to the user's tenant.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import re

from backend.deps import get_current_user, CurrentUser
from backend.config import settings
from backend.graph.client import get_neo4j_session
from backend.agents.dashboard import generate_dashboard_config

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])

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
    "LOAD CSV",
    "FOREACH",
    "ALTER",
    "GRANT",
    "DENY",
    "REVOKE",
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
    1. No write mutators (CREATE, MERGE, SET, DELETE, REMOVE, DETACH, DROP).
    2. Tenant isolation is enforced inside the Cypher query.
    """
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant claim is required for dashboard queries.",
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
    
    try:
        from neo4j import READ_ACCESS
    except Exception:
        READ_ACCESS = "READ"

    try:
        # Pass $tenant_id parameter to ensure query scoping
        with get_neo4j_session(default_access_mode=READ_ACCESS) as session:
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
    dashboard_id: str,
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
    dashboard_id: str,
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
