from fastapi import APIRouter

router = APIRouter()

@router.get("/scheduler/risks")
async def get_risks():
    return {"message": "Scheduler risks stub - coming soon"}
