# backend/deps.py — Shared dependency singletons
"""
Real clients replacing the stubs. All modules import from here.
Includes Supabase JWT Verification.
"""
from backend.graph.client import neo4j_client, get_neo4j_session
from backend.vector.store import chroma_store
from backend.redis_client import redis_client
from backend.config import settings

from slowapi import Limiter
from slowapi.util import get_remote_address

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Any, List

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

_jwks_cache = None
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

class CurrentUser(BaseModel):
    id: str
    email: str
    tenant_id: str
    role: str

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Supabase credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    from loguru import logger
    
    try:
        payload = await _decode_supabase_jwt(token)
        return _current_user_from_payload(payload)
    except JWTError as e:
        logger.error(f"JWT Decode Error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected authentication error: {str(e)}")
        raise credentials_exception


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
) -> CurrentUser | None:
    """Return a verified user when a bearer token is present, otherwise None.

    Demo-compatible endpoints use this to support local smoke tests without
    cookies while still enforcing JWT tenant claims when a real user is signed in.
    Invalid or incomplete tokens must not 401 the whole request — submittal
    reads still need to succeed for Guardian/dashboard widgets.
    """
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        from loguru import logger

        logger.warning("Optional auth failed; continuing unauthenticated")
        return None


async def _decode_supabase_jwt(token: str) -> dict[str, Any]:
    """Verify a Supabase JWT without a per-request database/profile lookup."""
    import httpx

    global _jwks_cache
    unverified_header = jwt.get_unverified_header(token)
    alg = unverified_header.get("alg")
    kid = unverified_header.get("kid")

    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise JWTError("SUPABASE_JWT_SECRET is not configured")
        return jwt.decode(
            token,
            key=settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )

    if not settings.SUPABASE_URL:
        raise JWTError("SUPABASE_URL is not configured")
    if not kid:
        raise JWTError("JWT header is missing kid")

    if _jwks_cache is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(jwks_url)
        if resp.status_code != 200:
            raise JWTError(f"Failed to fetch Supabase JWKS: {resp.status_code}")
        _jwks_cache = resp.json()

    jwk = next((key for key in _jwks_cache.get("keys", []) if key.get("kid") == kid), None)
    if not jwk:
        raise JWTError(f"kid '{kid}' not found in Supabase JWKS")

    return jwt.decode(
        token,
        key=jwk,
        algorithms=[alg],
        audience="authenticated",
    )


def _current_user_from_payload(payload: dict[str, Any]) -> CurrentUser:
    """Extract tenant-scoped RBAC claims from the verified Supabase JWT."""
    app_metadata = payload.get("app_metadata") or {}
    if not isinstance(app_metadata, dict):
        app_metadata = {}

    user_id = payload.get("sub")
    email = payload.get("email") or ""
    tenant_id = app_metadata.get("tenant_id") or payload.get("tenant_id")
    role = app_metadata.get("role") or payload.get("role")

    if not user_id or not tenant_id or not role:
        raise JWTError("JWT is missing required sub, app_metadata.tenant_id, or app_metadata.role claims")

    return CurrentUser(
        id=user_id,
        email=email,
        tenant_id=tenant_id,
        role=role,
    )


# Compat alias used by tests and older imports
_current_user_from_payload = _current_user_from_payload


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: CurrentUser = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your security clearance."
            )
        return user
