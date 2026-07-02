# backend/redis_client.py — Redis connection per PRD §5.8
"""
Redis serves three roles:
1. Session store (user context, conversation state)
2. Idempotency locks (prevent duplicate writes)
3. Cache (demo-mode pre-computed responses)

Falls back to in-process dict if Redis is unavailable (dev mode).
"""
from __future__ import annotations

import json
import time
from typing import Optional, Any

from loguru import logger

from backend.config import settings


class _DictFallback:
    """In-process dict fallback when Redis is unavailable."""

    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expiry_ts)

    def get(self, key: str) -> Optional[str]:
        if key in self._store:
            value, expiry = self._store[key]
            if expiry == 0 or time.time() < expiry:
                return value
            else:
                del self._store[key]
        return None

    def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        expiry = time.time() + ex if ex else 0
        self._store[key] = (value, expiry)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def exists(self, key: str) -> bool:
        val = self.get(key)  # handles expiry cleanup
        return val is not None

    def keys(self, pattern: str = "*") -> list[str]:
        # Simple glob: only supports prefix*
        prefix = pattern.rstrip("*")
        now = time.time()
        return [
            k for k, (_, exp) in self._store.items()
            if k.startswith(prefix) and (exp == 0 or now < exp)
        ]

    def ping(self) -> bool:
        return True

    def flushdb(self) -> None:
        self._store.clear()


class RedisClient:
    """
    Redis wrapper with automatic fallback to in-process dict.
    All values are stored as JSON strings.
    """

    def __init__(self):
        self._client = None
        self._fallback = _DictFallback()
        self._using_fallback = False
        self._connect()

    def _connect(self):
        try:
            import redis
            
            retries = 3
            for attempt in range(retries):
                try:
                    self._client = redis.from_url(
                        settings.REDIS_URL,
                        decode_responses=True,
                        socket_connect_timeout=5,
                    )
                    self._client.ping()
                    logger.info("Redis connected successfully", url=settings.REDIS_URL)
                    self._using_fallback = False
                    return
                except Exception as e:
                    if attempt < retries - 1:
                        logger.warning(f"Redis connection attempt {attempt + 1} failed, retrying in 2s: {e}")
                        time.sleep(2)
                    else:
                        raise e
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-process dict fallback: {e}")
            self._client = None
            self._using_fallback = True

    @property
    def _conn(self):
        return self._client if self._client else self._fallback

    @property
    def is_fallback(self) -> bool:
        return self._using_fallback

    # ── Basic operations ─────────────────────────────────────────
    def get(self, key: str) -> Optional[str]:
        try:
            return self._conn.get(key)
        except Exception:
            return self._fallback.get(key)

    def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        try:
            self._conn.set(key, value, ex=ttl)
        except Exception:
            self._fallback.set(key, value, ex=ttl)

    def delete(self, key: str) -> None:
        try:
            self._conn.delete(key)
        except Exception:
            self._fallback.delete(key)

    def exists(self, key: str) -> bool:
        try:
            return bool(self._conn.exists(key))
        except Exception:
            return self._fallback.exists(key)

    def keys(self, pattern: str = "*") -> list[str]:
        try:
            return self._conn.keys(pattern)
        except Exception:
            return self._fallback.keys(pattern)

    # ── JSON convenience ─────────────────────────────────────────
    def get_json(self, key: str) -> Optional[dict]:
        raw = self.get(key)
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return None
        return None

    def set_json(self, key: str, value: dict, ttl: Optional[int] = None) -> None:
        self.set(key, json.dumps(value), ttl=ttl)

    # ── Idempotency locks (§5.8) ─────────────────────────────────
    def acquire_lock(self, lock_key: str, ttl: Optional[int] = None) -> bool:
        """
        Acquire an idempotency lock. Returns True if acquired, False if already held.
        Used to prevent duplicate submittal re-analysis, duplicate NCR writes, etc.
        """
        _ttl = ttl or settings.REDIS_TTL_LOCK
        full_key = f"lock:{lock_key}"
        if self.exists(full_key):
            return False
        self.set(full_key, "locked", ttl=_ttl)
        return True

    def release_lock(self, lock_key: str) -> None:
        self.delete(f"lock:{lock_key}")

    # ── Session store ────────────────────────────────────────────
    def get_session(self, session_id: str) -> Optional[dict]:
        return self.get_json(f"session:{session_id}")

    def set_session(self, session_id: str, data: dict) -> None:
        self.set_json(f"session:{session_id}", data, ttl=settings.REDIS_TTL_SESSION)

    # ── Cache store ──────────────────────────────────────────────
    def get_cache(self, cache_key: str) -> Optional[dict]:
        return self.get_json(f"cache:{cache_key}")

    def set_cache(self, cache_key: str, data: dict, ttl: Optional[int] = None) -> None:
        self.set_json(f"cache:{cache_key}", data, ttl=ttl or settings.REDIS_TTL_CACHE)

    # ── Health ───────────────────────────────────────────────────
    def health(self) -> dict:
        try:
            self._conn.ping()
            return {"status": "ok", "using_fallback": self._using_fallback}
        except Exception as e:
            return {"status": "error", "error": str(e), "using_fallback": True}


# ── Singleton ────────────────────────────────────────────────────────
redis_client = RedisClient()
