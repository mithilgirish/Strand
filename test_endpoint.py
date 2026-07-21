import asyncio
from backend.redis_client import redis_client

raw_keys = redis_client.keys("cache:rfi_approval:default:*")
print("raw_keys:", raw_keys)
for key in raw_keys:
    print("trying to get json for key:", key)
    data = redis_client.get_json(key)
    print("data:", data)
