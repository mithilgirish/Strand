"""
Redis serves three roles:
1. Session store (user context, conversation state)
2. Idempotency locks (prevent duplicate writes)
3. Cache (demo-mode pre-computed responses)

Falls back to in-process dict if Redis is unavailable (dev mode).
"""

from __future__ import annotations

import fnmatch
import json
import time
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from backend.config import settings

_FALLBACK_PATH = Path(__file__).resolve().parents[1] / "data" / "runtime" / "kv_store.json"


class _DictFallback:
    """Disk-backed dict used when Redis is unavailable so demo state survives restarts."""

    def __init__(self, persist_path: Path = _FALLBACK_PATH):
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expiry_ts)
        self._path = persist_path
        self._load()

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
            now = time.time()
            for key, payload in (raw or {}).items():
                value = payload.get("value")
                expiry = float(payload.get("expiry") or 0)
                if value is None:
                    continue
                if expiry == 0 or now < expiry:
                    self._store[key] = (value, expiry)
        except Exception as exc:
            logger.warning("Could not load local KV store: {}", exc)

    def _persist(self) -> None:
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            now = time.time()
            payload = {
                key: {"value": value, "expiry": expiry}
                for key, (value, expiry) in self._store.items()
                if expiry == 0 or now < expiry
            }
            self._path.write_text(json.dumps(payload), encoding="utf-8")
        except Exception as exc:
            logger.debug("Could not persist local KV store: {}", exc)

    def get(self, key: str) -> str | None:
        if key in self._store:
            value, expiry = self._store[key]
            if expiry == 0 or time.time() < expiry:
                return value
            else:
                del self._store[key]
                self._persist()
        return None

    def set(self, key: str, value: str, ex: int | None = None, nx: bool = False, **kwargs) -> bool:
        if nx and self.exists(key):
            return False
        expiry = time.time() + ex if ex else 0
        self._store[key] = (value, expiry)
        self._persist()
        return True

    def delete(self, key: str) -> None:
        self._store.pop(key, None)
        self._persist()

    def exists(self, key: str) -> bool:
        val = self.get(key)
        return val is not None

    def keys(self, pattern: str = "*") -> list[str]:
        now = time.time()
        return [k for k, (_, exp) in self._store.items() if fnmatch.fnmatch(k, pattern) and (exp == 0 or now < exp)]

    def ping(self) -> bool:
        return True

    def flushdb(self) -> None:
        self._store.clear()
        self._persist()


class RedisClient:
    """
    Redis wrapper with automatic fallback to in-process dict.
    All values are stored as JSON strings.
    """

    def __init__(self):
        self._client = None
        self._fallback = _DictFallback()
        self._using_fallback = False
        self._last_error = None
        self._connect()

    def _connect(self):
        try:
            import redis

            self._client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.4,
            )
            self._client.ping()
            logger.info("Redis connected successfully", url=settings.REDIS_URL)
            self._using_fallback = False
            self._last_error = None
            return
        except Exception as e:
            logger.warning("Redis unavailable, using durable local KV store: {}", e)
            self._last_error = f"{type(e).__name__}: {e}"
            if self._connect_embedded():
                return
            self._client = None
            self._using_fallback = True

    def _connect_embedded(self) -> bool:
        """In-process Redis-compatible store when TCP Redis is down."""
        try:
            import fakeredis

            fake = fakeredis.FakeRedis(decode_responses=True)
            fake.ping()
            for key in self._fallback.keys("*"):
                value = self._fallback.get(key)
                if value is not None:
                    fake.set(key, value)
            self._client = fake
            self._using_fallback = True
            logger.info("Redis using in-process fakeredis (no server on {})", settings.REDIS_URL)
            return True
        except Exception as exc:
            logger.warning("fakeredis unavailable, using disk KV: {}", exc)
            self._client = None
            self._using_fallback = True
            return False

    @property
    def _conn(self):
        return self._client if self._client else self._fallback

    @property
    def client(self):
        """Redis-py compatible handle used by admin/inspector routers."""
        return self._conn

    @property
    def is_fallback(self) -> bool:
        return self._using_fallback

    # ── Basic operations ─────────────────────────────────────────
    def get(self, key: str) -> str | None:
        try:
            return self._conn.get(key)
        except Exception:
            return self._fallback.get(key)

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        try:
            self._conn.set(key, value, ex=ttl)
        except Exception:
            self._fallback.set(key, value, ex=ttl)
            return
        if self._using_fallback and self._client is not None:
            self._fallback.set(key, value, ex=ttl)

    def delete(self, key: str) -> None:
        try:
            self._conn.delete(key)
        except Exception:
            self._fallback.delete(key)
            return
        if self._using_fallback and self._client is not None:
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
    def get_json(self, key: str) -> dict | None:
        raw = self.get(key)
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return None
        return None

    def set_json(self, key: str, value: dict, ttl: int | None = None) -> None:
        self.set(key, json.dumps(value), ttl=ttl)

    # ── Idempotency locks ─────────────────────────────────
    def acquire_lock(self, lock_key: str, ttl: int | None = None) -> bool:
        """
        Acquire an idempotency lock. Returns True if acquired, False if already held.
        Used to prevent duplicate submittal re-analysis, duplicate NCR writes, etc.
        """
        _ttl = ttl or settings.REDIS_TTL_LOCK
        full_key = f"lock:{lock_key}"
        try:
            return bool(self._conn.set(full_key, "locked", ex=_ttl, nx=True))
        except Exception:
            return bool(self._fallback.set(full_key, "locked", ex=_ttl, nx=True))

    def release_lock(self, lock_key: str) -> None:
        self.delete(f"lock:{lock_key}")

    # ── Session store ────────────────────────────────────────────
    def get_session(self, session_id: str) -> dict | None:
        return self.get_json(f"session:{session_id}")

    def set_session(self, session_id: str, data: dict) -> None:
        self.set_json(f"session:{session_id}", data, ttl=settings.REDIS_TTL_SESSION)

    # ── Cache store ──────────────────────────────────────────────
    def get_cache(self, cache_key: str) -> dict | None:
        return self.get_json(f"cache:{cache_key}")

    def set_cache(self, cache_key: str, data: dict, ttl: int | None = None) -> None:
        self.set_json(f"cache:{cache_key}", data, ttl=ttl or settings.REDIS_TTL_CACHE)

    def delete_cache(self, cache_key: str) -> None:
        self.delete(f"cache:{cache_key}")

    # ── Health ───────────────────────────────────────────────────
    def health(self) -> dict:
        try:
            self._conn.ping()
            backend = "redis"
            if self._using_fallback:
                backend = "fakeredis" if self._client is not None else "embedded-kv"
            payload = {
                "status": "ok",
                "using_fallback": self._using_fallback,
                "backend": backend,
            }
        except Exception as e:
            payload = {"status": "error", "error": str(e), "using_fallback": True}
        return payload


# ── Singleton ────────────────────────────────────────────────────────
redis_client = RedisClient()
