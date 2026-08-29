from typing import Optional

# pyrefly: ignore [missing-import]
import loguru
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.approvals.manager import approval_manager

router = APIRouter(prefix="/approvals", tags=["approvals"])


class ApprovalDecisionRequest(BaseModel):
    decision: str
    reason: str | None = None


@router.get("/pending")
async def get_pending_approvals():
    try:
        pending = approval_manager.get_pending()
        return {"approvals": [item.model_dump() for item in pending]}
    except Exception as e:
        loguru.logger.error(f"Error fetching pending approvals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL", "message": "Failed to fetch pending approvals"}},
        )


@router.post("/{approval_id}/decision")
async def resolve_approval(approval_id: str, request: ApprovalDecisionRequest):
    try:
        if request.decision not in ["approve", "reject"]:
            raise ValueError(f"Invalid decision: {request.decision}. Must be 'approve' or 'reject'.")

        result = approval_manager.resolve_approval(
            approval_id=approval_id, decision=request.decision, reason=request.reason
        )
        return {"status": "success", "approval": result.model_dump()}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}},
        )
    except Exception as e:
        from backend.errors import StrandNotFoundError, StrandValidationError

        if isinstance(e, StrandNotFoundError):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": str(e)}}
            )
        elif isinstance(e, StrandValidationError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}},
            )

        loguru.logger.error(f"Error resolving approval {approval_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "INTERNAL", "message": "Failed to resolve approval"}},
        )
