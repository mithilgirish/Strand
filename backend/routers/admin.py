"""
backend/routers/admin.py — Production-grade Admin Console API

All endpoints are protected by RoleChecker (JWT validated server-side).
Supabase Admin operations use the SERVICE_ROLE key (never exposed to browser).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import httpx

from backend.deps import get_current_user, CurrentUser, RoleChecker
from backend.config import settings

router = APIRouter(prefix="/admin", tags=["Admin Management"])

# ---------------------------------------------------------------------------
# Helper: Supabase Admin HTTP client (uses service_role key)
# ---------------------------------------------------------------------------
def _supabase_admin_headers() -> dict:
    """Headers for Supabase Management API calls (service_role — never exposed to client)."""
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

def _supabase_auth_url(path: str) -> str:
    url = getattr(settings, "SUPABASE_URL", "")
    return f"{url}/auth/v1/{path}"

# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------
class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str
    tenant_id: str

class ProvisionTenantRequest(BaseModel):
    tenant_id: str   # URL-safe slug, e.g. "acme_corp_01"
    name: str        # Display name, e.g. "Acme Corporation"
    plan: str = "standard"
    max_users: int = 50

class ChangeRoleRequest(BaseModel):
    user_id: str
    new_role: str

# ---------------------------------------------------------------------------
# GET /admin/users
# ---------------------------------------------------------------------------
@router.get("/users")
async def get_admin_users(
    user: CurrentUser = Depends(RoleChecker(["admin", "super-admin"]))
):
    """
    Returns all user profiles. Super-admin sees all tenants; admin sees own tenant only.
    Queries the profiles table via Supabase REST API with service role key.
    """
    headers = _supabase_admin_headers()
    
    # Build filter — super-admin gets all, admin is scoped to their tenant
    if user.role == "super-admin":
        url = _supabase_rest_url("profiles?select=id,email,full_name,role,tenant_id,is_active,updated_at&order=role.asc")
    else:
        url = _supabase_rest_url(
            f"profiles?select=id,email,full_name,role,tenant_id,is_active,updated_at"
            f"&tenant_id=eq.{user.tenant_id}&order=role.asc"
        )

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Supabase query failed: {resp.text}")

    return {"users": resp.json()}

# ---------------------------------------------------------------------------
# POST /admin/invite
# ---------------------------------------------------------------------------
@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    payload: InviteUserRequest,
    user: CurrentUser = Depends(RoleChecker(["admin", "super-admin"]))
):
    """
    Sends a Supabase magic-link invitation email.
    Admin can only invite into their own tenant.
    Super-admin can invite into any tenant.
    """
    # Enforce tenant scoping for non-super-admin
    if user.role == "admin" and payload.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can only invite users into their own tenant."
        )

    # Validate role — admins cannot create super-admins or other admins
    if user.role == "admin" and payload.role in ("super-admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot assign admin or super-admin roles."
        )

    headers = _supabase_admin_headers()
    invite_url = _supabase_auth_url("admin/invite")
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            invite_url,
            headers=headers,
            json={
                "email": payload.email,
                "data": {
                    "role": payload.role,
                    "tenant_id": payload.tenant_id,
                }
            }
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Invitation failed: {resp.text}")

    invited_user = resp.json()

    invitation_url = _supabase_rest_url("invitations")
    async with httpx.AsyncClient() as client:
        invite_record_resp = await client.post(
            invitation_url,
            headers={**headers, "Prefer": "return=minimal"},
            json={
                "email": payload.email,
                "tenant_id": payload.tenant_id,
                "role": payload.role,
                "invited_by": user.id,
            },
        )
    if invite_record_resp.status_code not in (200, 201, 204, 409):
        raise HTTPException(status_code=502, detail=f"Invitation record failed: {invite_record_resp.text}")

    # Write invitation record to audit_logs
    audit_url = _supabase_rest_url("audit_logs")
    async with httpx.AsyncClient() as client:
        await client.post(audit_url, headers=headers, json={
            "tenant_id": payload.tenant_id,
            "actor_id": user.id,
            "actor_email": user.email,
            "action": "USER_INVITED",
            "resource_type": "user",
            "resource_id": payload.email,
            "metadata": {"role": payload.role, "tenant_id": payload.tenant_id}
        })

    return {
        "status": "invited",
        "email": payload.email,
        "user_id": invited_user.get("id")
    }

# ---------------------------------------------------------------------------
# GET /admin/tenants
# ---------------------------------------------------------------------------
@router.get("/tenants")
async def get_tenants(
    user: CurrentUser = Depends(RoleChecker(["super-admin"]))
):
    """Returns all tenants. Super-admin only."""
    headers = _supabase_admin_headers()
    url = _supabase_rest_url("tenants?select=*&order=created_at.desc")

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Supabase query failed: {resp.text}")

    return {"tenants": resp.json()}

# ---------------------------------------------------------------------------
# POST /admin/tenants
# ---------------------------------------------------------------------------
@router.post("/tenants", status_code=status.HTTP_201_CREATED)
async def provision_tenant(
    payload: ProvisionTenantRequest,
    user: CurrentUser = Depends(RoleChecker(["super-admin"]))
):
    """
    Creates a new isolated tenant namespace.
    Inserts into tenants table and logs the action.
    """
    headers = _supabase_admin_headers()
    tenant_url = _supabase_rest_url("tenants")

    # Validate tenant_id format (URL-safe slug)
    import re
    if not re.match(r'^[a-z0-9_]{3,50}$', payload.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tenant_id must be 3-50 chars, lowercase letters, numbers, and underscores only."
        )

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            tenant_url,
            headers={**headers, "Prefer": "return=representation"},
            json={
                "id": payload.tenant_id,
                "name": payload.name,
                "plan": payload.plan,
                "max_users": payload.max_users,
                "created_by": user.id,
            }
        )

    if resp.status_code == 409:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant '{payload.tenant_id}' already exists."
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Tenant creation failed: {resp.text}")

    # Write to audit_logs
    audit_url = _supabase_rest_url("audit_logs")
    async with httpx.AsyncClient() as client:
        await client.post(audit_url, headers=headers, json={
            "tenant_id": "system",  # system-level action, not scoped to a tenant
            "actor_id": user.id,
            "actor_email": user.email,
            "action": "TENANT_CREATED",
            "resource_type": "tenant",
            "resource_id": payload.tenant_id,
            "metadata": {"name": payload.name, "plan": payload.plan}
        })

    return {"status": "created", "tenant_id": payload.tenant_id, "name": payload.name}

# ---------------------------------------------------------------------------
# GET /admin/audit-logs
# ---------------------------------------------------------------------------
@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    user: CurrentUser = Depends(RoleChecker(["admin", "super-admin"]))
):
    """
    Returns audit logs. Super-admin sees global logs; admin sees own tenant only.
    """
    headers = _supabase_admin_headers()

    if user.role == "super-admin":
        url = _supabase_rest_url(
            f"audit_logs?select=*&order=created_at.desc&limit={limit}"
        )
    else:
        url = _supabase_rest_url(
            f"audit_logs?select=*&tenant_id=eq.{user.tenant_id}"
            f"&order=created_at.desc&limit={limit}"
        )

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Supabase query failed: {resp.text}")

    return {"logs": resp.json()}

# ---------------------------------------------------------------------------
# PATCH /admin/users/{user_id}/role
# ---------------------------------------------------------------------------
@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    payload: ChangeRoleRequest,
    user: CurrentUser = Depends(RoleChecker(["admin", "super-admin"]))
):
    """
    Changes a user's role. Admin cannot elevate to admin/super-admin.
    Uses the promote_user_role DB function (SECURITY DEFINER).
    """
    if user.role == "admin" and payload.new_role in ("super-admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot assign admin or super-admin roles."
        )

    headers = _supabase_admin_headers()
    
    # 1. Verify target user exists and belongs to the admin's tenant (if caller is just 'admin')
    async with httpx.AsyncClient() as client:
        user_url = _supabase_rest_url(f"profiles?id=eq.{user_id}&select=tenant_id")
        user_resp = await client.get(user_url, headers=headers)
        
        if user_resp.status_code != 200 or not user_resp.json():
            raise HTTPException(status_code=404, detail="Target user not found.")
            
        target_tenant = user_resp.json()[0]["tenant_id"]
        
        if user.role == "admin" and target_tenant != user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot modify users outside their own tenant."
            )

    # 2. Update the user's role directly via REST (bypassing RLS with service_role)
    patch_url = _supabase_rest_url(f"profiles?id=eq.{user_id}")
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            patch_url,
            headers=headers,
            json={
                "role": payload.new_role,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail=f"Role change failed: {resp.text}")

    # Audit log
    audit_url = _supabase_rest_url("audit_logs")
    async with httpx.AsyncClient() as client:
        await client.post(audit_url, headers=headers, json={
            "tenant_id": user.tenant_id,
            "actor_id": user.id,
            "actor_email": user.email,
            "action": "ROLE_CHANGED",
            "resource_type": "user",
            "resource_id": user_id,
            "metadata": {"new_role": payload.new_role}
        })

    return {"status": "updated", "user_id": user_id, "new_role": payload.new_role}

# ---------------------------------------------------------------------------
# GET /admin/telemetry
# ---------------------------------------------------------------------------
@router.get("/telemetry")
async def get_system_telemetry(
    user: CurrentUser = Depends(RoleChecker(["super-admin"]))
):
    """
    Returns live system metrics: user counts, tenant counts, log volume, invites.
    Super-admin only.
    """
    headers = _supabase_admin_headers()

    async with httpx.AsyncClient() as client:
        # Run queries in parallel
        import asyncio
        user_count_resp, tenant_count_resp, log_count_resp, pending_invites_resp = await asyncio.gather(
            client.get(_supabase_rest_url("profiles?select=count"), headers={**headers, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}),
            client.get(_supabase_rest_url("tenants?select=count&is_active=eq.true"), headers={**headers, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}),
            client.get(_supabase_rest_url("audit_logs?select=count"), headers={**headers, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}),
            client.get(_supabase_rest_url("invitations?select=count&accepted_at=is.null"), headers={**headers, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}),
        )

    def _extract_count(resp: httpx.Response) -> int:
        cr = resp.headers.get("content-range", "")
        if "/" in cr:
            try:
                return int(cr.split("/")[-1])
            except (ValueError, IndexError):
                pass
        return 0

    return {
        "metrics": {
            "total_users": _extract_count(user_count_resp),
            "active_tenants": _extract_count(tenant_count_resp),
            "audit_log_entries": _extract_count(log_count_resp),
            "pending_invitations": _extract_count(pending_invites_resp),
        }
    }
