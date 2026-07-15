# backend/procore_client.py
import os
import requests
import time
from loguru import logger
from fastapi import HTTPException
import urllib.parse
from backend.redis_client import redis_client
from backend.config import settings

PROCORE_CALLBACK_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000") + "/api/v1/integrations/procore/callback"

class ProcoreClient:
    def get_client_credentials(self):
        """Get Procore credentials from Redis cache or environment variables."""
        config = redis_client.get_cache("procore_config")
        if config and config.get("client_id") and config.get("client_secret"):
            return config["client_id"], config["client_secret"]
        return os.getenv("PROCORE_CLIENT_ID", ""), os.getenv("PROCORE_CLIENT_SECRET", "")

    def get_authorization_url(self, state: str = None):
        """Generate the authorization URL."""
        client_id, _ = self.get_client_credentials()
        if not client_id:
            raise HTTPException(status_code=500, detail="PROCORE_CLIENT_ID not configured")
        
        if settings.DEMO_MODE and client_id in ["admin@strand", "tokenspark"]:
            logger.info("Generating internal Procore redirect URL.")
            dev_code = "tokenspark_procore"
            state_param = f"&state={state}" if state else ""
            return f"http://localhost:8000/api/v1/integrations/procore/callback?code={dev_code}{state_param}"

        encoded_callback = urllib.parse.quote(PROCORE_CALLBACK_URL, safe='')
        auth_url = os.getenv("PROCORE_AUTH_URL", "https://login.procore.com")
        url = f"{auth_url}/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={encoded_callback}"
        if state:
            url += f"&state={state}"
        return url

    def exchange_code(self, code: str) -> dict:
        """Exchange the authorization code for access and refresh tokens."""
        client_id, client_secret = self.get_client_credentials()
        
        if settings.DEMO_MODE and (code == "tokenspark_procore" or client_id in ["admin@strand", "tokenspark"]):
            logger.info("Exchanging internal Procore authorization code.")
            token_data = {
                "access_token": "admin-procore-token-xyz",
                "refresh_token": "admin-procore-refresh-token-xyz",
                "expires_in": 7200,
                "created_at": int(time.time())
            }
            redis_client.set_cache("procore_token", token_data, ttl=7200)
            redis_client.set_cache("procore_refresh", "admin-procore-refresh-token-xyz", ttl=86400 * 14)
            return token_data

        headers = {"Content-Type": "application/json"}
        auth_url = os.getenv("PROCORE_AUTH_URL", "https://login.procore.com")
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": PROCORE_CALLBACK_URL,
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        response = requests.post(f"{auth_url}/oauth/token", headers=headers, json=data)
        if response.status_code != 200:
            logger.error(f"Failed to exchange Procore code: {response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code for Procore")
            
        token_data = response.json()
        redis_client.set_cache("procore_token", token_data, ttl=token_data.get("expires_in", 7199))
        if "refresh_token" in token_data:
            redis_client.set_cache("procore_refresh", token_data["refresh_token"], ttl=86400 * 14)
            
        return token_data

    def get_valid_token(self):
        token_data = redis_client.get_cache("procore_token")
        if token_data and "access_token" in token_data:
            return token_data["access_token"]
            
        refresh_token = redis_client.get_cache("procore_refresh")
        if refresh_token:
            try:
                client_id, client_secret = self.get_client_credentials()
                auth_url = os.getenv("PROCORE_AUTH_URL", "https://login.procore.com")
                response = requests.post(
                    f"{auth_url}/oauth/token",
                    headers={"Content-Type": "application/json"},
                    json={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                        "client_id": client_id,
                        "client_secret": client_secret
                    }
                )
                if response.status_code == 200:
                    new_token = response.json()
                    redis_client.set_cache("procore_token", new_token, ttl=new_token.get("expires_in", 7199))
                    redis_client.set_cache("procore_refresh", new_token["refresh_token"], ttl=86400 * 14)
                    return new_token["access_token"]
            except Exception as e:
                logger.warning(f"Failed to refresh Procore token: {e}")

        raise HTTPException(status_code=401, detail="Procore not authenticated")

procore_client = ProcoreClient()
