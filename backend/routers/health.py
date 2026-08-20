from fastapi import APIRouter

from backend.config import settings
from backend.graph.client import neo4j_client
from backend.llm.client import has_configured_llm
from backend.redis_client import redis_client
from backend.vector.store import chroma_store

router = APIRouter()


def probe_services() -> dict:
    """Best-effort probes. Never raises — the app stays up even if a backend is down."""
    try:
        neo4j = neo4j_client.health()
    except Exception as e:
        neo4j = {"status": "error", "error": str(e)}
    try:
        chroma = chroma_store.health()
    except Exception as e:
        chroma = {"status": "unavailable", "error": str(e)}
    try:
        redis = redis_client.health()
        if redis.get("using_fallback") and str(redis.get("status", "")).lower() == "ok":
            redis["status"] = "degraded"
    except Exception as e:
        redis = {"status": "error", "using_fallback": True, "error": str(e)}
    return {
        "neo4j": neo4j,
        "chroma": chroma,
        "redis": redis,
        "llm": {"configured": has_configured_llm(), "provider": settings.LLM_PROVIDER},
        "demo_mode": settings.DEMO_MODE,
    }


def _ok(payload: dict) -> bool:
    return str(payload.get("status", "")).lower() in {"ok", "healthy"}


def agent_statuses(services: dict | None = None) -> dict[str, dict]:
    services = services or probe_services()
    graph_ok = _ok(services.get("neo4j", {}))
    chroma_ok = _ok(services.get("chroma", {}))
    redis_ok = _ok(services.get("redis", {}))
    llm_ok = bool(services.get("llm", {}).get("configured"))
    scheduler_ok = True  # CSV + NetworkX is local
    return {
        "guardian": {"status": "active" if graph_ok or settings.DEMO_MODE else "degraded"},
        "scheduler": {"status": "active" if scheduler_ok else "degraded"},
        "oracle": {"status": "active" if graph_ok or settings.DEMO_MODE else "degraded"},
        "inspector": {"status": "active" if graph_ok or redis_ok else "degraded"},
        "brain": {"status": "active" if (chroma_ok or settings.DEMO_MODE) and llm_ok else "degraded"},
        "judge": {"status": "active" if graph_ok or settings.DEMO_MODE else "degraded"},
    }


@router.get("/health")
async def get_health():
    services = probe_services()
    agents = agent_statuses(services)
    service_ok = all(_ok(services[name]) for name in ("neo4j", "chroma", "redis"))
    overall = "ok" if service_ok else "degraded"
    return {
        "status": "ok",
        "readiness": overall,
        "liveness": "healthy",
        "demo_mode": settings.DEMO_MODE,
        "services": services,
        "agents": agents,
        "provenance_note": "DEMO MODE — synthetic fallbacks may be used" if settings.DEMO_MODE else "",
    }
