# backend/config.py — Expanded settings per PRD §5.1
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── LLM Provider ────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_PROVIDER: str = "groq"                    # groq | anthropic
    LLM_MODEL: str = "llama3-8b-8192"                # stable default for Groq
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 2000
    LLM_RETRY_COUNT: int = 3

    # ── Neo4j ───────────────────────────────────────────────────
    NEO4J_URI: str = "neo4j+s://localhost"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_TIMEOUT: int = 30                        # seconds

    # ── Chroma ──────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION: str = "strand_docs"
    CHROMA_HISTORY_COLLECTION: str = "strand_history"  # Phase 2 item

    # ── Redis ───────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TTL_SESSION: int = 3600                  # 1 hour
    REDIS_TTL_CACHE: int = 1800                    # 30 min
    REDIS_TTL_LOCK: int = 300                      # 5 min

    # ── Unstructured.io (optional fallback) ─────────────────────
    UNSTRUCTURED_API_KEY: str = ""

    # ── API & Security ──────────────────────────────────────────
    API_KEY: str = "strand-dev-key"                # Static X-API-Key for write routes §9
    RATE_LIMIT_PER_MINUTE: int = 30                # §14.20 — per IP on LLM routes
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081"

    # ── Demo Mode ───────────────────────────────────────────────
    DEMO_MODE: bool = False                        # §13 — auto-approve cached writes
    LOG_LEVEL: str = "INFO"

    # ── Frontend (passthrough) ──────────────────────────────────
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"


settings = Settings()
