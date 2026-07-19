from fastapi import APIRouter, HTTPException, Request, Depends
from backend.deps import limiter, get_current_user, CurrentUser
from backend.agents.brain import run_brain
from backend.models.query import BrainQuery

router = APIRouter()

@router.post("/brain/query")
@limiter.limit("30/minute")
async def query_brain(
    request: Request, 
    query: BrainQuery,
    user: CurrentUser = Depends(get_current_user)
):
    try:
        # Use user.tenant_id for data isolation instead of query.project_id if applicable
        # The run_brain function accepts project_id, so we pass tenant_id into it to ensure scoping.
        return await run_brain(query.question, project_id=user.tenant_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Brain query failed: {e}") from e
