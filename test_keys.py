import asyncio
from backend.redis_client import redis_client
from backend.routers.guardian import _tenant_cache_part, _resolve_tenant
print("ALL KEYS:", redis_client.keys("*"))
print("RFI KEYS:", redis_client.keys("cache:rfi_approval:*"))
