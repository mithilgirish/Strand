from fastapi import APIRouter, Request
from backend.deps import limiter

router = APIRouter()

@router.post("/guardian/analyze")
@limiter.limit("30/minute")
async def analyze_submittal(request: Request):
    return {"message": "Guardian analysis stub - coming soon"}
