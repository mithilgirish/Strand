# backend/autodesk_client.py
import os
import requests
import time
from loguru import logger
from fastapi import HTTPException
import urllib.parse
from backend.redis_client import redis_client
from backend.config import settings

from backend.crypto_utils import _decrypt_token

APS_CLIENT_ID = os.getenv("APS_CLIENT_ID", "")
APS_CLIENT_SECRET = os.getenv("APS_CLIENT_SECRET", "")
APS_CALLBACK_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000") + "/api/v1/integrations/autodesk/callback"

APS_OAUTH_URL = "https://developer.api.autodesk.com/authentication/v2"
APS_DATA_URL = "https://developer.api.autodesk.com/data/v1"

class AutodeskClient:
    def get_client_credentials(self, tenant_id: str = None):
        """Get Autodesk credentials from Redis cache or environment variables."""
        cache_key = f"{tenant_id}:autodesk_config" if tenant_id else "autodesk_config"
        config = redis_client.get_cache(cache_key)
        if config and config.get("client_id") and config.get("client_secret"):
            return config["client_id"], _decrypt_token(config["client_secret"])
        return os.getenv("APS_CLIENT_ID", ""), os.getenv("APS_CLIENT_SECRET", "")

    def get_authorization_url(self, state: str = None):
        """Generate the 3-legged OAuth login URL."""
        # state is the tenant_id in 3-legged flow
        client_id, _ = self.get_client_credentials(tenant_id=state)
        if not client_id:
            raise HTTPException(status_code=500, detail="APS_CLIENT_ID not configured")
        
        # Development bypass for 3-legged redirect
        if settings.DEMO_MODE and client_id in ["admin@strand", "strand_demo", "strand_dev"]:
            logger.info("Generating internal 3-legged redirect URL.")
            dev_code = "strand_demo"
            state_param = f"&state={state}" if state else ""
            return f"http://localhost:8000/api/v1/integrations/autodesk/callback?code={dev_code}{state_param}"

        scopes = "data:read bucket:read"
        encoded_callback = urllib.parse.quote(APS_CALLBACK_URL, safe='')
        encoded_scopes = urllib.parse.quote(scopes, safe='')
        
        url = f"{APS_OAUTH_URL}/authorize?response_type=code&client_id={client_id}&redirect_uri={encoded_callback}&scope={encoded_scopes}"
        if state:
            url += f"&state={state}"
        return url

    def exchange_code(self, code: str, tenant_id: str = None) -> dict:
        """Exchange the authorization code for access and refresh tokens."""
        client_id, client_secret = self.get_client_credentials(tenant_id)
        
        # Development bypass for 3-legged token exchange
        if settings.DEMO_MODE and (code == "strand_demo" or client_id in ["admin@strand", "strand_demo", "strand_dev"]):
            logger.info("Exchanging internal authorization code.")
            token_data = {
                "access_token": "admin-3legged-token-xyz",
                "refresh_token": "admin-refresh-token-xyz",
                "expires_in": 86400
            }
            # Cache the internal refresh token
            token_key = f"{tenant_id}:autodesk_token" if tenant_id else "autodesk_token"
            refresh_key = f"{tenant_id}:autodesk_refresh" if tenant_id else "autodesk_refresh"
            redis_client.set_cache(token_key, token_data, ttl=86400)
            redis_client.set_cache(refresh_key, "admin-refresh-token-xyz", ttl=86400 * 14)
            return token_data

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": APS_CALLBACK_URL,
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        response = requests.post(f"{APS_OAUTH_URL}/token", headers=headers, data=data)
        if response.status_code != 200:
            logger.error(f"Failed to exchange code: {response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
            
        token_data = response.json()
        
        token_key = f"{tenant_id}:autodesk_token" if tenant_id else "autodesk_token"
        refresh_key = f"{tenant_id}:autodesk_refresh" if tenant_id else "autodesk_refresh"
        redis_client.set_cache(token_key, token_data, ttl=token_data.get("expires_in", 3599))
        if "refresh_token" in token_data:
            redis_client.set_cache(refresh_key, token_data["refresh_token"], ttl=86400 * 14)
            
        return token_data

    def get_2legged_token(self, tenant_id: str = None) -> str:
        """Retrieve a 2-legged OAuth token using Client Credentials grant."""
        client_id, client_secret = self.get_client_credentials(tenant_id)
        if not client_id or not client_secret:
            raise HTTPException(status_code=401, detail="Autodesk credentials not configured")
            
        # Administrator bypass for internal diagnostics
        if settings.DEMO_MODE and client_id in ["admin@strand", "strand_demo", "strand_dev"]:
            logger.info("Using internal Autodesk 2-legged token.")
            return "admin-2legged-token-xyz"
            
        # Check cache first
        token_key = f"{tenant_id}:autodesk_2legged_token" if tenant_id else "autodesk_2legged_token"
        token_data = redis_client.get_cache(token_key)
        if token_data and "access_token" in token_data:
            return token_data["access_token"]
            
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "client_credentials",
            "scope": "data:read bucket:read",
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        response = requests.post(f"{APS_OAUTH_URL}/token", headers=headers, data=data)
        if response.status_code != 200:
            logger.error(f"Failed to fetch 2-legged token: {response.text}")
            raise HTTPException(status_code=401, detail="Failed to authenticate with Autodesk (2-legged)")
            
        res_data = response.json()
        redis_client.set_cache(token_key, res_data, ttl=res_data.get("expires_in", 3599))
        return res_data["access_token"]

    def get_valid_token(self, tenant_id: str = None):
        """Retrieve token from Redis, refreshing if necessary, or fall back to 2-legged."""
        token_key = f"{tenant_id}:autodesk_token" if tenant_id else "autodesk_token"
        refresh_key = f"{tenant_id}:autodesk_refresh" if tenant_id else "autodesk_refresh"
        
        # 1. Check for active 3-legged token
        token_data = redis_client.get_cache(token_key)
        if token_data and "access_token" in token_data:
            return token_data["access_token"]
            
        # 2. Try refresh
        refresh_token = redis_client.get_cache(refresh_key)
        if refresh_token:
            try:
                client_id, client_secret = self.get_client_credentials(tenant_id)
                response = requests.post(
                    f"{APS_OAUTH_URL}/token",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                        "client_id": client_id,
                        "client_secret": client_secret
                    }
                )
                if response.status_code == 200:
                    new_token = response.json()
                    redis_client.set_cache(token_key, new_token, ttl=new_token.get("expires_in", 3599))
                    redis_client.set_cache(refresh_key, new_token["refresh_token"], ttl=86400 * 14)
                    return new_token["access_token"]
            except Exception as e:
                logger.warning(f"Failed to refresh 3-legged token, trying 2-legged fallback: {e}")

        # 3. Fallback to 2-legged client credentials token
        try:
            logger.info("3-legged token unavailable, falling back to 2-legged OAuth...")
            return self.get_2legged_token(tenant_id)
        except Exception as e:
            logger.error(f"Autodesk authentication failed (both 3-legged and 2-legged): {e}")
            raise HTTPException(status_code=401, detail="Autodesk not authenticated")

    def download_file(self, project_id: str, version_id: str, output_path: str, tenant_id: str = None) -> str:
        """Real implementation downloading a file via Data Management API."""
        token = self.get_valid_token(tenant_id)
        headers = {"Authorization": f"Bearer {token}"}
        
        logger.info(f"Downloading version {version_id} from Autodesk project {project_id}...")
        
        # 1. Get download URL
        # We need the storage location for the specific version
        item_url = f"{APS_DATA_URL}/projects/{project_id}/versions/{urllib.parse.quote(version_id, safe='')}"
        item_response = requests.get(item_url, headers=headers)
        if item_response.status_code != 200:
            raise HTTPException(status_code=item_response.status_code, detail=f"Failed to fetch version metadata: {item_response.text}")
            
        storage_url = item_response.json().get("data", {}).get("relationships", {}).get("storage", {}).get("meta", {}).get("link", {}).get("href")
        if not storage_url:
            raise HTTPException(status_code=404, detail="Storage URL not found for this version")
            
        # 2. Download the actual binary
        file_response = requests.get(storage_url, headers=headers, stream=True)
        if file_response.status_code != 200:
            raise HTTPException(status_code=file_response.status_code, detail=f"Failed to download file: {file_response.text}")
            
        with open(output_path, 'wb') as f:
            for chunk in file_response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    
        logger.info(f"Successfully downloaded Autodesk file to {output_path}")
        return output_path

autodesk_client = AutodeskClient()
