from typing import Any, Dict

# pyrefly: ignore [missing-import]
import loguru
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, model_validator

from backend.agents.judge import run_judge
from backend.deps import limiter

router = APIRouter(prefix="/judge", tags=["judge"])


class JudgeVerifyRequest(BaseModel):
    content: Dict[str, Any] | None = None
    content_type: str | None = None
    candidate_output: Dict[str, Any] | None = None
    agent_source: str = "unknown"

    @model_validator(mode="after")
    def normalize_candidate_output(self):
        if self.content is None and self.candidate_output is not None:
            self.content = self.candidate_output
        if not self.content:
            raise ValueError("content or non-empty candidate_output is required")
        if self.content_type is None:
            self.content_type = {
                "guardian": "violations",
                "inspector": "ncr",
                "planner": "report",
                "brain": "answer",
            }.get(self.agent_source, "report")
        return self


@router.post("/verify")
@limiter.limit("30/minute")
async def verify_content(request: Request, data: JudgeVerifyRequest):
    try:
        response = await run_judge(data.content or {}, data.content_type, data.agent_source)
        return response
    except Exception as e:
        loguru.logger.error(f"Judge verification failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
