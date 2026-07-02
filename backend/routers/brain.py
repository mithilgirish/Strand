from fastapi import APIRouter, Request
from backend.deps import limiter

router = APIRouter()

@router.post("/brain/query")
@limiter.limit("30/minute")
async def query_brain(request: Request):
    return {"message": "Brain query stub - coming soon"}
