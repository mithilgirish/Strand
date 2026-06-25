from fastapi import APIRouter

router = APIRouter()

@router.get("/oracle/shipments")
async def get_shipments():
    return {"message": "Oracle shipments stub - coming soon"}
