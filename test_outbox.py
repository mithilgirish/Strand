import asyncio
from backend.redis_client import redis_client

keys = redis_client.keys("cache:rfi_approval:*")
print("KEYS:", keys)
for k in keys:
    data = redis_client.get_json(k)
    print("DATA:", data)
