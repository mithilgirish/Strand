# backend/procore_client.py
import os
import time
import urllib.parse

import requests
from fastapi import HTTPException
from loguru import logger

from backend.config import settings
from backend.crypto_utils import _decrypt_token
from backend.redis_client import redis_client

PROCORE_CALLBACK_URL = (
    os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000") + "/api/v1/integrations/procore/callback"
)


class ProcoreClient:
    def get_client_credentials(self, tenant_id: str = None):
        """Get Procore credentials from Redis cache or environment variables."""
        cache_key = f"{tenant_id}:procore_config" if tenant_id else "procore_config"
        config = redis_client.get_cache(cache_key)
        if config and config.get("client_id") and config.get("client_secret"):
            return config["client_id"], _decrypt_token(config["client_secret"])
        return os.getenv("PROCORE_CLIENT_ID", ""), os.getenv("PROCORE_CLIENT_SECRET", "")

    def get_authorization_url(self, state: str = None):
        """Generate the authorization URL."""
        # state is the tenant_id in 3-legged flow
        client_id, _ = self.get_client_credentials(tenant_id=state)
        if not client_id:
            raise HTTPException(status_code=500, detail="PROCORE_CLIENT_ID not configured")

        if settings.DEMO_MODE and client_id in ["admin@strand", "strand_demo", "strand_dev"]:
            logger.info("Generating internal Procore redirect URL.")
            dev_code = "strand_procore_demo"
            state_param = f"&state={state}" if state else ""
            return f"http://localhost:8000/api/v1/integrations/procore/callback?code={dev_code}{state_param}"

        encoded_callback = urllib.parse.quote(PROCORE_CALLBACK_URL, safe="")
        auth_url = os.getenv("PROCORE_AUTH_URL", "https://login.procore.com")
        url = f"{auth_url}/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={encoded_callback}"
        if state:
            url += f"&state={state}"
        return url

    def exchange_code(self, code: str, tenant_id: str = None) -> dict:
        """Exchange the authorization code for access and refresh tokens."""
        client_id, client_secret = self.get_client_credentials(tenant_id)

        if settings.DEMO_MODE and (
            code == "strand_procore_demo" or client_id in ["admin@strand", "strand_demo", "strand_dev"]
        ):
            logger.info("Exchanging internal Procore authorization code.")
            token_data = {
                "access_token": "admin-procore-token-xyz",
                "refresh_token": "admin-procore-refresh-token-xyz",
                "expires_in": 7200,
                "created_at": int(time.time()),
            }
            token_key = f"{tenant_id}:procore_token" if tenant_id else "procore_token"
            refresh_key = f"{tenant_id}:procore_refresh" if tenant_id else "procore_refresh"
            redis_client.set_cache(token_key, token_data, ttl=7200)
            redis_client.set_cache(refresh_key, "admin-procore-refresh-token-xyz", ttl=86400 * 14)
            return token_data

        headers = {"Content-Type": "application/json"}
        auth_url = os.getenv("PROCORE_AUTH_URL", "https://login.procore.com")
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": PROCORE_CALLBACK_URL,
            "client_id": client_id,
            "client_secret": client_secret,
        }

        response = requests.post(f"{auth_url}/oauth/token", headers=headers, json=data)
        if response.status_code != 200:
            logger.error(f"Failed to exchange Procore code: {response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code for Procore")

        token_data = response.json()

        token_key = f"{tenant_id}:procore_token" if tenant_id else "procore_token"
        refresh_key = f"{tenant_id}:procore_refresh" if tenant_id else "procore_refresh"
        redis_client.set_cache(token_key, token_data, ttl=token_data.get("expires_in", 7199))
        if "refresh_token" in token_data:
            redis_client.set_cache(refresh_key, token_data["refresh_token"], ttl=86400 * 14)

        return token_data

    def get_valid_token(self, tenant_id: str = None):
        token_key = f"{tenant_id}:procore_token" if tenant_id else "procore_token"
        refresh_key = f"{tenant_id}:procore_refresh" if tenant_id else "procore_refresh"

        token_data = redis_client.get_cache(token_key)
        if token_data and "access_token" in token_data:
            return token_data["access_token"]

        refresh_token = redis_client.get_cache(refresh_key)
        if refresh_token:
            try:
                client_id, client_secret = self.get_client_credentials(tenant_id)
                auth_url = os.getenv("PROCORE_AUTH_URL", "https://login.procore.com")
                response = requests.post(
                    f"{auth_url}/oauth/token",
                    headers={"Content-Type": "application/json"},
                    json={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                        "client_id": client_id,
                        "client_secret": client_secret,
                    },
                )
                if response.status_code == 200:
                    new_token = response.json()
                    redis_client.set_cache(token_key, new_token, ttl=new_token.get("expires_in", 7199))
                    redis_client.set_cache(refresh_key, new_token["refresh_token"], ttl=86400 * 14)
                    return new_token["access_token"]
            except Exception as e:
                logger.warning(f"Failed to refresh Procore token: {e}")

        raise HTTPException(status_code=401, detail="Procore not authenticated")


procore_client = ProcoreClient()
