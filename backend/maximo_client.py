# backend/maximo_client.py
import os
import requests
from loguru import logger
from fastapi import HTTPException
from backend.redis_client import redis_client
from backend.config import settings
from backend.crypto_utils import _decrypt_token

class MaximoClient:
    def get_client_credentials(self):
        """Get Maximo credentials from Redis cache or environment variables."""
        config = redis_client.get_cache("maximo_config")
        if config and config.get("base_url") and config.get("api_key"):
            return config["base_url"], _decrypt_token(config["api_key"])
        return os.getenv("MAXIMO_BASE_URL", ""), os.getenv("MAXIMO_API_KEY", "")

    def test_connection(self):
        """Tests the connection to IBM Maximo REST API."""
        base_url, api_key = self.get_client_credentials()
        
        if not base_url or not api_key:
            raise HTTPException(status_code=400, detail="Maximo credentials not fully configured")

        if settings.DEMO_MODE and api_key == "tokenspark_maximo":
            logger.info("Simulating Maximo successful connection in demo mode.")
            return {"status": "success", "message": "Connected to Maximo successfully (Demo)"}

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
