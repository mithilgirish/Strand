from fastapi import APIRouter

router = APIRouter()

@router.post("/inspector/ncr")
async def log_ncr():
    return {"message": "Inspector NCR logging stub - coming soon"}
