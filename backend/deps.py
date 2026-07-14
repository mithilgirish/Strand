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
from typing import List

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

_jwks_cache = None
security = HTTPBearer()

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
    
    import httpx
    from loguru import logger
    
    global _jwks_cache
    try:
        # Check header
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        kid = unverified_header.get("kid")
        
        if alg == "HS256":
            # Symmetric key validation (e.g. local developer mode or standard config)
            payload = jwt.decode(
                token, 
                key=settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        else:
            # Asymmetric key validation (ES256/RS256) via JWKS
            if _jwks_cache is None:
                jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
                headers = {"apikey": settings.SUPABASE_SERVICE_ROLE_KEY}
                with httpx.Client() as client:
                    resp = client.get(jwks_url, headers=headers)
                if resp.status_code == 200:
                    _jwks_cache = resp.json()
                else:
                    logger.error(f"Failed to fetch JWKS: status={resp.status_code}, response={resp.text}")
                    raise credentials_exception
            
            # Find matching key in JWKS
            jwk = None
            for key in _jwks_cache.get("keys", []):
                if key.get("kid") == kid:
                    jwk = key
                    break
            
            if not jwk:
                logger.error(f"kid '{kid}' not found in JWKS")
                raise credentials_exception
                
            payload = jwt.decode(
                token,
                key=jwk,
                algorithms=[alg],
                audience="authenticated"
            )
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if not user_id:
            logger.error("JWT decoded but 'sub' (user_id) field is missing")
            raise credentials_exception
            
        # Fetch live role and tenant_id from profiles table (Service Role)
        url = f"{settings.SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=tenant_id,role"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
        }
        
        with httpx.Client() as client:
            resp = client.get(url, headers=headers)
            
        if resp.status_code != 200 or not resp.json():
            logger.warning(f"Profile lookup failed for {user_id}: status={resp.status_code}, response={resp.text}")
            # Fallback if profile not found
            return CurrentUser(id=user_id, email=email, tenant_id="default_tenant", role="viewer")
            
        profile = resp.json()[0]
        return CurrentUser(
            id=user_id, 
            email=email, 
            tenant_id=profile.get("tenant_id", "default_tenant"), 
            role=profile.get("role", "viewer")
        )
    except JWTError as e:
        logger.error(f"JWT Decode Error: {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected authentication error: {str(e)}")
        raise credentials_exception

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

