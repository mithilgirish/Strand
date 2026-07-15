"""Phase 3 Inspector API routes wired to the real QA agent."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from backend.agents.inspector import (
    close_checklist_session,
    get_checklist as inspector_get_checklist,
    get_latest_as_built,
    list_ncrs,
    process_voice_ncr,
)
from backend.deps import limiter


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
async def get_checklist(tag: str):
    return await inspector_get_checklist(tag)


@router.post("/inspector/ncr")
@limiter.limit("30/minute")
async def log_ncr(request: Request, ncr: NcrSubmission):
    try:
        return await process_voice_ncr(
            transcript=ncr.transcript,
            equipment_tag=ncr.equipment_tag.upper(),
            step_id=ncr.step_id,
            raised_by=ncr.raised_by,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspector NCR creation failed: {e}") from e


@router.get("/inspector/ncrs")
async def get_ncrs():
    return await list_ncrs()


@router.post("/inspector/checklist/{tag}/close")
async def close_checklist(tag: str, payload: ChecklistCloseRequest):
    try:
        return await close_checklist_session(
            equipment_tag=tag.upper(),
            step_results=payload.steps,
            closed_by=payload.closed_by,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checklist closeout failed: {e}") from e


@router.get("/inspector/as-built/{tag}")
async def get_as_built(tag: str):
    record = await get_latest_as_built(tag)
    if not record:
        raise HTTPException(status_code=404, detail=f"No as-built record found for {tag.upper()}")
    return record
