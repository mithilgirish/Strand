from fastapi import APIRouter, HTTPException, status
import loguru

from backend.llm.client import get_agent_metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/agent/{agent_name}")
async def get_metrics(agent_name: str):
    try:
        metrics = get_agent_metrics(agent_name)
        return {"agent": agent_name, "metrics": metrics}
    except Exception as e:
        loguru.logger.error(f"Error fetching metrics for {agent_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL", "message": "Failed to fetch metrics"}}
        )
