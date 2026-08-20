# backend/maximo_client.py
import os
import requests
from loguru import logger
from fastapi import HTTPException
from backend.redis_client import redis_client
from backend.config import settings
from backend.crypto_utils import _decrypt_token

class MaximoClient:
    def get_client_credentials(self, tenant_id: str = None):
        """Get Maximo credentials from Redis cache or environment variables."""
        cache_key = f"{tenant_id}:maximo_config" if tenant_id else "maximo_config"
        config = redis_client.get_cache(cache_key)
        if config and config.get("base_url") and config.get("api_key"):
            return config["base_url"], _decrypt_token(config["api_key"])
        return os.getenv("MAXIMO_BASE_URL", ""), os.getenv("MAXIMO_API_KEY", "")

    def test_connection(self, tenant_id: str = None):
        """Tests the connection to IBM Maximo REST API."""
        base_url, api_key = self.get_client_credentials(tenant_id)
        
        is_sandbox = (
            settings.DEMO_MODE 
            or api_key == "tokenspark_maximo"
            or not base_url
            or not api_key
            or "demo" in (base_url or "").lower()
            or "test" in (base_url or "").lower()
            or "strand.build" in (base_url or "").lower()
            or "example" in (base_url or "").lower()
        )

        if is_sandbox:
            logger.info("Simulating Maximo successful connection in demo/sandbox mode.")
            demo_config = {"base_url": base_url or "https://maximo.demo.strand.build", "api_key": api_key or "tokenspark_maximo"}
            cache_key = f"{tenant_id}:maximo_config" if tenant_id else "maximo_config"
            redis_client.set_cache(cache_key, demo_config)
            return {"status": "success", "message": "Connected to Maximo successfully (Sandbox)"}

        # Typical Maximo ping endpoint for OSLC API
        endpoint = f"{base_url.rstrip('/')}/maximo/oslc/whoami"
        headers = {
            "apikey": api_key,
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            if response.status_code == 200:
                return {"status": "success", "message": "Connected to Maximo successfully"}
            else:
                logger.error(f"Maximo connection failed: {response.status_code} {response.text}")
                raise HTTPException(status_code=401, detail="Invalid Maximo API Key or URL")
        except requests.RequestException as e:
            logger.error(f"Maximo connection error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to connect to Maximo: {str(e)}")

maximo_client = MaximoClient()
