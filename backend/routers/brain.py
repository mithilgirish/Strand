from fastapi import APIRouter

router = APIRouter()

@router.post("/brain/query")
async def query_brain():
    return {"message": "Brain query stub - coming soon"}
