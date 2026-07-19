"""Phase 3 Inspector API routes wired to the real QA agent."""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field

from backend.agents.inspector import (
    close_checklist_session,
    get_checklist as inspector_get_checklist,
    get_latest_as_built,
    list_ncrs,
    process_voice_ncr,
)
from backend.deps import limiter, get_current_user, CurrentUser


router = APIRouter(tags=["inspector"])


class NcrSubmission(BaseModel):
    transcript: str = Field(min_length=1)
    equipment_tag: str = Field(min_length=1)
    step_id: str = Field(min_length=1)
    raised_by: str = "field_engineer"


class ChecklistCloseRequest(BaseModel):
    steps: list[dict[str, Any]] = []
    closed_by: str = "field_engineer"


@router.get("/inspector/checklist/{tag}")
async def get_checklist(tag: str, user: CurrentUser = Depends(get_current_user)):
    return await inspector_get_checklist(tag, tenant_id=user.tenant_id)


@router.post("/inspector/ncr")
@limiter.limit("30/minute")
async def log_ncr(request: Request, ncr: NcrSubmission, user: CurrentUser = Depends(get_current_user)):
    try:
        return await process_voice_ncr(
            transcript=ncr.transcript,
            equipment_tag=ncr.equipment_tag.upper(),
            step_id=ncr.step_id,
            raised_by=ncr.raised_by,
            tenant_id=user.tenant_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspector NCR creation failed: {e}") from e


@router.get("/inspector/ncrs")
async def get_ncrs(user: CurrentUser = Depends(get_current_user)):
    return await list_ncrs(tenant_id=user.tenant_id)


@router.post("/inspector/checklist/{tag}/close")
async def close_checklist(tag: str, payload: ChecklistCloseRequest, user: CurrentUser = Depends(get_current_user)):
    try:
        return await close_checklist_session(
            equipment_tag=tag.upper(),
            step_results=payload.steps,
            closed_by=payload.closed_by,
            tenant_id=user.tenant_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checklist closeout failed: {e}") from e


@router.get("/inspector/as-built/{tag}")
async def get_as_built(tag: str, user: CurrentUser = Depends(get_current_user)):
    record = await get_latest_as_built(tag, tenant_id=user.tenant_id)
    if record:
        markdown_path = record.get("markdown_path") or record.get("pdf_path")
        if markdown_path and Path(markdown_path).exists():
            record["content"] = Path(markdown_path).read_text(encoding="utf-8")
        return record

    raise HTTPException(status_code=404, detail=f"No as-built record found for {tag.upper()}")
