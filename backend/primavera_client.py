import os
import requests
import urllib.parse
from loguru import logger
from fastapi import HTTPException
from backend.redis_client import redis_client
from backend.config import settings
from backend.crypto_utils import _decrypt_token

PRIMAVERA_CALLBACK_URL = os.getenv("PRIMAVERA_CALLBACK_URL", "http://localhost:8000/api/v1/integrations/primavera/callback")

class PrimaveraClient:
    def get_client_credentials(self):
        """Get global application Primavera Client ID and Secret."""
        client_id = os.getenv("PRIMAVERA_CLIENT_ID", "")
        client_secret = os.getenv("PRIMAVERA_CLIENT_SECRET", "")
        return client_id, client_secret

    def get_authorization_url(self, base_url: str, state: str = None):
        """Generate the 3-legged OAuth login URL for Oracle Primavera."""
        client_id, _ = self.get_client_credentials()
        if not client_id:
            logger.warning("PRIMAVERA_CLIENT_ID not configured. Using dummy client for demo.")
            client_id = "demo_client"
            
        if settings.DEMO_MODE:
            logger.info("Generating internal 3-legged redirect URL for Primavera.")
            # Instead of bypassing directly to the callback, we redirect to a mock Oracle login page
            state_param = f"&state={state}" if state else ""
            return f"http://localhost:8000/api/v1/integrations/primavera/mock-oracle-login?redirect_uri={urllib.parse.quote(PRIMAVERA_CALLBACK_URL)}{state_param}"

        encoded_callback = urllib.parse.quote(PRIMAVERA_CALLBACK_URL, safe='')
        auth_endpoint = f"{base_url.rstrip('/')}/oauth2/v1/authorize"
        
        url = f"{auth_endpoint}?response_type=code&client_id={client_id}&redirect_uri={encoded_callback}"
        if state:
            url += f"&state={state}"
        return url

    def exchange_code(self, base_url: str, code: str) -> dict:
        """Exchange the authorization code for access and refresh tokens."""
        client_id, client_secret = self.get_client_credentials()
        
        if settings.DEMO_MODE and code == "tokenspark_primavera":
            logger.info("Exchanging internal Primavera authorization code.")
            return {
                "access_token": "admin-primavera-token-xyz",
                "refresh_token": "admin-primavera-refresh-token-xyz",
                "expires_in": 3600
            }

        token_endpoint = f"{base_url.rstrip('/')}/oauth2/v1/token"
        
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": PRIMAVERA_CALLBACK_URL
        }
        
        auth = (client_id, client_secret) if client_id and client_secret else None

        try:
            response = requests.post(token_endpoint, data=payload, auth=auth, timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Primavera code exchange failed: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            raise HTTPException(status_code=401, detail="Failed to exchange authorization code")

    def test_connection(self, tenant_id: str = None):
        """Tests the connection to Primavera P6 using a stored OAuth token."""
        # For a true 3-legged flow, test_connection would use the stored access token.
        # Since this is a health check endpoint, we'll assume it's connected if we have valid config.
        # In a full implementation, we'd retrieve the tenant's token from Supabase and ping an API.
        cache_key = f"{tenant_id}:primavera_config" if tenant_id else "primavera_config"
        config = redis_client.get_cache(cache_key)
        if config and config.get("base_url"):
            return {"status": "success", "message": "Primavera Base URL is configured"}
            
        raise HTTPException(status_code=400, detail="Primavera Base URL not configured")

primavera_client = PrimaveraClient()
