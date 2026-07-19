from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
# pyrefly: ignore [missing-import]
import loguru

from backend.deps import limiter
from backend.agents.judge import run_judge

router = APIRouter(prefix="/judge", tags=["judge"])

class JudgeVerifyRequest(BaseModel):
    content: Dict[str, Any]
    content_type: str
    agent_source: str = "unknown"

@router.post("/verify")
@limiter.limit("30/minute")
async def verify_content(request: Request, data: JudgeVerifyRequest):
    try:
        response = await run_judge(data.content, data.content_type, data.agent_source)
        return response
    except Exception as e:
        loguru.logger.error(f"Judge verification failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
