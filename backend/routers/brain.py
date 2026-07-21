from fastapi import APIRouter, HTTPException, Request, Depends
from backend.deps import limiter, get_optional_current_user, CurrentUser
from backend.agents.brain import run_brain
from backend.models.query import BrainQuery

router = APIRouter()

@router.post("/brain/query")
@limiter.limit("30/minute")
async def query_brain(
    request: Request, 
    query: BrainQuery,
    user: CurrentUser | None = Depends(get_optional_current_user)
):
    tenant_id = user.tenant_id if user else "default"
    try:
        return await run_brain(query.question, project_id=tenant_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Brain query failed: {e}") from e
