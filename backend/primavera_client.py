# backend/primavera_client.py
import os
import requests
from loguru import logger
from fastapi import HTTPException
from backend.redis_client import redis_client
from backend.config import settings

class PrimaveraClient:
    def get_client_credentials(self):
        """Get Primavera credentials from Redis cache or environment variables."""
        config = redis_client.get_cache("primavera_config")
        if config and config.get("base_url") and config.get("username") and config.get("password"):
            return config["base_url"], config["username"], config["password"]
        return os.getenv("PRIMAVERA_BASE_URL", ""), os.getenv("PRIMAVERA_USERNAME", ""), os.getenv("PRIMAVERA_PASSWORD", "")

    def test_connection(self):
        """Tests the connection to Primavera P6 REST API."""
        base_url, username, password = self.get_client_credentials()
        
        if not base_url or not username or not password:
            raise HTTPException(status_code=400, detail="Primavera credentials not fully configured")

        if settings.DEMO_MODE and username in ["admin", "tokenspark"]:
            logger.info("Simulating Primavera successful connection in demo mode.")
            return {"status": "success", "message": "Connected to Primavera successfully (Demo)"}

        # Typical Primavera P6 ping/login endpoint for REST API
        endpoint = f"{base_url.rstrip('/')}/p6ws/restapi/login"
        
        try:
            # Usually uses Basic Auth
            response = requests.get(endpoint, auth=(username, password), timeout=10)
            if response.status_code in [200, 201]:
                return {"status": "success", "message": "Connected to Primavera successfully"}
            else:
                logger.error(f"Primavera connection failed: {response.status_code} {response.text}")
                raise HTTPException(status_code=401, detail="Invalid Primavera credentials or URL")
        except requests.RequestException as e:
            logger.error(f"Primavera connection error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to connect to Primavera: {str(e)}")

primavera_client = PrimaveraClient()
