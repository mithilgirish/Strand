from fastapi import APIRouter

router = APIRouter()

AGENT_HEALTH = {
    "guardian": {"status": "active"},
    "scheduler": {"status": "active"},
    "oracle": {"status": "active"},
    "inspector": {"status": "active"},
    "brain": {"status": "active"},
    "judge": {"status": "active"},
}


@router.get("/health")
async def get_health():
    return {
        "status": "healthy",
        "agents": AGENT_HEALTH,
    }
