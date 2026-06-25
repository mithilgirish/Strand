from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def get_health():
    return {
        "status": "ok",
        "agents": {
            "guardian": "idle",
            "scheduler": "idle",
            "oracle": "idle",
            "inspector": "idle",
            "brain": "idle"
        }
    }
