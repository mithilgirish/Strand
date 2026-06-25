from fastapi import APIRouter

router = APIRouter()

@router.post("/guardian/analyze")
async def analyze_submittal():
    return {"message": "Guardian analysis stub - coming soon"}
