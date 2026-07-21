# backend/config.py — Expanded settings per PRD §5.1
from pydantic_settings import BaseSettings
from pydantic import AliasChoices, ConfigDict, Field, model_validator


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
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = Field(
        default="neo4j",
        validation_alias=AliasChoices("NEO4J_USER", "NEO4J_USERNAME"),
    )
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = ""
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

    # ── Supabase ────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""  # Never expose this to clients — server only

    # ── API & Security ──────────────────────────────────────────
    API_KEY: str = "strand-dev-key"                # Static X-API-Key for write routes §9
    RATE_LIMIT_PER_MINUTE: int = 30                # §14.20 — per IP on LLM routes
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "https://strand-iota.vercel.app,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081"
    APS_WEBHOOK_SECRET: str = "strand-fallback-webhook-secret-98765"

    # ── Demo Mode ───────────────────────────────────────────────
    DEMO_MODE: bool = False                        # §13 — auto-approve cached writes
    LOG_LEVEL: str = "INFO"

    # ── Frontend (passthrough) ──────────────────────────────────
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    @model_validator(mode="after")
    def validate_api_key(self):
        if not self.DEMO_MODE and self.API_KEY in ["strand-dev-key", "", None]:
            raise ValueError("API_KEY must be configured securely in non-demo mode")
        return self


settings = Settings()
