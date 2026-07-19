from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
import loguru

from backend.deps import limiter
from backend.agents.planner import AGENT_CAPABILITIES, AGENT_RUNNERS, EVENT_ROUTING, run_planner

router = APIRouter(prefix="/planner", tags=["planner"])

class PlannerAskRequest(BaseModel):
    query: str
    session_id: str = "default"

@router.post("/ask")
@limiter.limit("30/minute")
async def ask_planner(request: Request, data: PlannerAskRequest):
    try:
        response = await run_planner(data.query, data.session_id)
        return response
    except Exception as e:
        loguru.logger.error(f"Planner ask failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/report")
@limiter.limit("30/minute")
async def planner_report(request: Request):
    return {
        "status": "ready",
        "event_routing": EVENT_ROUTING,
        "available_agents": sorted(AGENT_RUNNERS.keys()),
        "capabilities": AGENT_CAPABILITIES,
    }
