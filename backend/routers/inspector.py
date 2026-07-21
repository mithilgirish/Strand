"""Phase 3 Inspector API routes wired to the real QA agent."""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from pydantic import BaseModel, Field
import tempfile
import os

from backend.agents.inspector import (
    close_checklist_session,
    get_checklist as inspector_get_checklist,
    get_latest_as_built,
    list_ncrs,
    process_voice_ncr,
)
from backend.deps import limiter, get_current_user, get_optional_current_user, CurrentUser


router = APIRouter(tags=["inspector"])

_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            import imageio_ffmpeg
            os.environ["PATH"] = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe()) + os.pathsep + os.environ["PATH"]
        except ImportError:
            pass
        import whisper
        _whisper_model = whisper.load_model("base")
    return _whisper_model


class NcrSubmission(BaseModel):
    transcript: str = Field(min_length=1)
    equipment_tag: str = Field(min_length=1)
    step_id: str = Field(min_length=1)
    raised_by: str = "field_engineer"
    photo_url: str | None = None


class ChecklistCloseRequest(BaseModel):
    steps: list[dict[str, Any]] = []
    closed_by: str = "field_engineer"


@router.get("/inspector/checklist/{tag}")
async def get_checklist(tag: str, user: CurrentUser = Depends(get_current_user)):
    return await inspector_get_checklist(tag, tenant_id=user.tenant_id)

@router.post("/inspector/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    try:
        model = get_whisper_model()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        try:
            result = model.transcribe(tmp_path)
            transcript = result.get("text", "").strip()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            
        return {"transcript": transcript}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


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
async def get_ncrs(user: CurrentUser | None = Depends(get_optional_current_user)):
    tenant_id = user.tenant_id if user else "default"
    return await list_ncrs(tenant_id=tenant_id)


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
