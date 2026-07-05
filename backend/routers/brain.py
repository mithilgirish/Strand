from fastapi import APIRouter, HTTPException, Request
from backend.deps import limiter
from backend.agents.brain import run_brain
from backend.models.query import BrainQuery

router = APIRouter()

@router.post("/brain/query")
@limiter.limit("30/minute")
async def query_brain(request: Request, query: BrainQuery):
    try:
        return await run_brain(query.question, project_id=query.project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brain query failed: {e}") from e
