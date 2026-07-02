# backend/deps.py — Shared dependency singletons
"""
Real clients replacing the stubs. All modules import from here.
"""
from backend.graph.client import neo4j_client, get_neo4j_session
from backend.vector.store import chroma_store
from backend.redis_client import redis_client
from backend.config import settings

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])
