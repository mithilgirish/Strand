"""Inspector API routes wired to the real QA agent."""

import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from backend.agents.inspector import (
    close_checklist_session,
    get_latest_as_built,
    list_ncrs,
    process_voice_ncr,
)
from backend.agents.inspector import (
    get_checklist as inspector_get_checklist,
)
from backend.deps import CurrentUser, get_current_user, get_optional_current_user, limiter

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
        kwargs = {
            "transcript": ncr.transcript,
            "equipment_tag": ncr.equipment_tag.upper(),
            "step_id": ncr.step_id,
            "raised_by": ncr.raised_by,
            "tenant_id": user.tenant_id,
        }
        if ncr.photo_url:
            kwargs["photo_url"] = ncr.photo_url
        return await process_voice_ncr(**kwargs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspector NCR creation failed: {e}") from e


@router.post("/inspector/upload-photo")
async def upload_photo(photo: UploadFile = File(...), user: CurrentUser | None = Depends(get_optional_current_user)):
    try:
        import re
        from datetime import datetime

        import httpx
        from loguru import logger

        from backend.config import settings

        raw_name = photo.filename or "photo.jpg"
        clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", raw_name)
        filename = f"ncr_{int(datetime.now().timestamp())}_{clean_name}"
        content = await photo.read()

        # 1. Save local backup copy in static/ncr_photos
        static_dir = Path("static/ncr_photos")
        static_dir.mkdir(parents=True, exist_ok=True)
        dest_path = static_dir / filename
        dest_path.write_bytes(content)

        # 2. Upload to Supabase Storage bucket 'inspector_photos'
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                mime_type = photo.content_type or "image/jpeg"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": mime_type,
                    "x-upsert": "true",
                }
                upload_endpoint = f"{settings.SUPABASE_URL}/storage/v1/object/inspector_photos/{filename}"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(upload_endpoint, headers=headers, content=content)
                    if resp.status_code in (200, 201):
                        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/inspector_photos/{filename}"
                        logger.info(f"Uploaded photo to Supabase Storage: {public_url}")
                        return {"photo_url": public_url}
            except Exception as supabase_err:
                logger.warning(f"Supabase storage upload failed, falling back to local static URL: {supabase_err}")

        return {"photo_url": f"/static/ncr_photos/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")


class PhotoBase64Request(BaseModel):
    base64_data: str
    content_type: str = "image/jpeg"
    filename: str | None = None


@router.post("/inspector/upload-photo-base64")
async def upload_photo_base64(
    payload: PhotoBase64Request, user: CurrentUser | None = Depends(get_optional_current_user)
):
    """
    Mobile-friendly inspection photo upload: accepts base64-encoded image (no FormData).
    Uploads to Supabase Storage 'inspector_photos' bucket via service role key (bypasses RLS).
    """
    try:
        import base64
        from datetime import datetime

        import httpx
        from loguru import logger

        from backend.config import settings

        ext = "jpg"
        if "png" in payload.content_type:
            ext = "png"
        elif "webp" in payload.content_type:
            ext = "webp"
        raw = payload.filename or f"photo_{int(datetime.now().timestamp())}.{ext}"
        filename = f"ncr_{int(datetime.now().timestamp())}_{raw.replace(' ', '_')}"

        # Decode base64 → raw bytes
        b64 = payload.base64_data
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        image_bytes = base64.b64decode(b64)

        # 1. Local backup
        static_dir = Path("static/ncr_photos")
        static_dir.mkdir(parents=True, exist_ok=True)
        (static_dir / filename).write_bytes(image_bytes)

        # 2. Upload to Supabase Storage via service role (no RLS)
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": payload.content_type,
                    "x-upsert": "true",
                }
                upload_endpoint = f"{settings.SUPABASE_URL}/storage/v1/object/inspector_photos/{filename}"
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(upload_endpoint, headers=headers, content=image_bytes)
                    if resp.status_code in (200, 201):
                        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/inspector_photos/{filename}"
                        logger.info(f"Uploaded base64 photo to Supabase Storage: {public_url}")
                        return {"photo_url": public_url}
                    else:
                        logger.error(f"Supabase photo upload failed {resp.status_code}: {resp.text}")
            except Exception as supabase_err:
                logger.warning(f"Supabase base64 photo upload exception: {supabase_err}")

        return {"photo_url": f"/static/ncr_photos/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")


@router.post("/user/upload-avatar")
async def upload_user_avatar(
    photo: UploadFile = File(...), user: CurrentUser | None = Depends(get_optional_current_user)
):
    try:
        import re
        from datetime import datetime

        import httpx
        from loguru import logger

        from backend.config import settings

        user_id = user.id if user else "user"
        raw_name = photo.filename or "avatar.jpg"
        clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", raw_name)
        filename = f"avatar_{user_id}_{int(datetime.now().timestamp())}_{clean_name}"
        content = await photo.read()

        # 1. Upload to Supabase Storage bucket 'avatars' with Service Role key (bypasses RLS)
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                mime_type = photo.content_type or "image/jpeg"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": mime_type,
                    "x-upsert": "true",
                }
                upload_endpoint = f"{settings.SUPABASE_URL}/storage/v1/object/avatars/{filename}"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(upload_endpoint, headers=headers, content=content)
                    if resp.status_code in (200, 201):
                        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/avatars/{filename}"
                        logger.info(f"Uploaded user avatar to Supabase Storage: {public_url}")
                        return {"avatar_url": public_url}
                    else:
                        logger.error(f"Supabase avatar upload failed with status {resp.status_code}: {resp.text}")
            except Exception as supabase_err:
                logger.warning(f"Supabase avatar upload exception: {supabase_err}")

        # 2. Local fallback
        static_dir = Path("static/avatars")
        static_dir.mkdir(parents=True, exist_ok=True)
        dest_path = static_dir / filename
        dest_path.write_bytes(content)
        return {"avatar_url": f"/static/avatars/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {e}")


class AvatarBase64Request(BaseModel):
    base64_data: str
    content_type: str = "image/jpeg"
    user_id: str | None = None


@router.post("/user/upload-avatar-base64")
async def upload_user_avatar_base64(
    payload: AvatarBase64Request, user: CurrentUser | None = Depends(get_optional_current_user)
):
    """
    Mobile-friendly avatar upload: accepts base64-encoded image (no FormData).
    Uploads to Supabase Storage 'avatars' bucket via service role key (bypasses RLS).
    """
    try:
        import base64
        import re
        from datetime import datetime

        import httpx
        from loguru import logger

        from backend.config import settings

        user_id = user.id if user else (payload.user_id or "user")
        ext = "jpg"
        if "png" in payload.content_type:
            ext = "png"
        elif "webp" in payload.content_type:
            ext = "webp"
        filename = f"avatar_{user_id}_{int(datetime.now().timestamp())}.{ext}"

        # Decode base64 → raw bytes
        b64 = payload.base64_data
        # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        image_bytes = base64.b64decode(b64)

        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": payload.content_type,
                    "x-upsert": "true",
                }
                upload_endpoint = f"{settings.SUPABASE_URL}/storage/v1/object/avatars/{filename}"
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(upload_endpoint, headers=headers, content=image_bytes)
                    if resp.status_code in (200, 201):
                        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/avatars/{filename}"
                        logger.info(f"Uploaded base64 avatar to Supabase Storage: {public_url}")
                        return {"avatar_url": public_url}
                    else:
                        logger.error(f"Supabase base64 avatar upload failed {resp.status_code}: {resp.text}")
            except Exception as supabase_err:
                logger.warning(f"Supabase base64 upload exception: {supabase_err}")

        # Local fallback
        static_dir = Path("static/avatars")
        static_dir.mkdir(parents=True, exist_ok=True)
        dest_path = static_dir / filename
        dest_path.write_bytes(image_bytes)
        return {"avatar_url": f"/static/avatars/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {e}")


@router.get("/inspector/ncrs")
async def get_ncrs(user: CurrentUser | None = Depends(get_optional_current_user)):
    tenant_id = user.tenant_id if user else "default"
    return await list_ncrs(tenant_id=tenant_id)


@router.post("/inspector/checklist/{tag}/close")
async def close_checklist(tag: str, payload: ChecklistCloseRequest, user: CurrentUser = Depends(get_current_user)):
    try:
        return await close_checklist_session(
            equipment_tag=tag.upper(), step_results=payload.steps, closed_by=payload.closed_by, tenant_id=user.tenant_id
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


@router.get("/inspector/checklist-photos")
async def get_all_checklist_photos(user: CurrentUser | None = Depends(get_optional_current_user)):
    """
    Returns all checklist steps and NCR anomalies that have photos attached (pass or fail),
    with full metadata, problem designations, and parameter tolerances for UI inspection.
    """
    from backend.redis_client import redis_client

    tenant_id = user.tenant_id if user else "default"
    tenant_part = tenant_id.replace("-", "_") if tenant_id != "default" else ""
    prefix_key = f"inspector:as_built:{tenant_part}:" if tenant_part else "inspector:as_built::"

    results = []
    seen_urls = set()

    # 1. Pull from live Neo4j NCR records with photos
    try:
        ncrs = await list_ncrs(tenant_id=tenant_id)
        for ncr in ncrs:
            photo = ncr.get("photo_url") or ncr.get("image_url") or ncr.get("photoUri")
            if photo and photo not in seen_urls:
                seen_urls.add(photo)
                results.append(
                    {
                        "ncr_id": ncr.get("ncr_id", ""),
                        "as_built_id": ncr.get("ncr_id", ""),
                        "equipment_tag": ncr.get("equipment_tag", ""),
                        "step_id": ncr.get("step_id", "IST-001"),
                        "title": ncr.get("title") or f"Defect on {ncr.get('equipment_tag', 'Equipment')}",
                        "description": ncr.get("description")
                        or ncr.get("transcript", "")
                        or "Field inspection defect recorded.",
                        "transcript": ncr.get("transcript") or ncr.get("description", ""),
                        "status": ncr.get("status", "fail"),
                        "severity": ncr.get("severity", "Major"),
                        "r0_score": ncr.get("r0_score", 3.0),
                        "mitigation": ncr.get("mitigation", "Inspect field assembly and recalibrate."),
                        "raised_by": ncr.get("raised_by", "field_engineer"),
                        "timestamp": ncr.get("timestamp") or ncr.get("raised_at") or "",
                        "generated_at": ncr.get("timestamp") or ncr.get("raised_at") or "",
                        "photo_url": photo,
                        "parameter_name": ncr.get("parameter_name") or "Operational Tolerance",
                        "actual_value": ncr.get("actual_value") or "Non-compliant",
                        "required_value": ncr.get("required_value") or "Within spec",
                        "unit": ncr.get("unit") or "",
                        "clause": ncr.get("clause") or ncr.get("clause_section") or "Section 26 32 13",
                        "is_demo": ncr.get("is_demo", False),
                    }
                )
    except Exception as e:
        pass

    # 2. Pull from Redis as-built records (passed & failed checklist steps)
    try:
        all_keys = (
            redis_client.client.keys(f"{prefix_key}*")
            if hasattr(redis_client, "client") and redis_client.client
            else []
        )
        for key in all_keys:
            try:
                record = redis_client.get_json(key.decode() if isinstance(key, bytes) else key)
                if not record:
                    continue
                steps = record.get("steps", [])
                equipment_tag = record.get("equipment_tag", "")
                as_built_id = record.get("as_built_id", "")
                gen_at = record.get("generated_at", "")
                closed_by = record.get("closed_by", "field_engineer")

                for step in steps:
                    photo = step.get("photo_uri") or step.get("photo_url") or ""
                    if photo and photo not in seen_urls:
                        seen_urls.add(photo)
                        is_pass = step.get("status") == "pass"
                        results.append(
                            {
                                "ncr_id": f"CHK-{step.get('step_id', '001')}",
                                "as_built_id": as_built_id,
                                "equipment_tag": equipment_tag,
                                "step_id": step.get("step_id", ""),
                                "title": step.get("description", "") or f"Step {step.get('step_id', '')} Checkpoint",
                                "description": step.get("description", ""),
                                "transcript": step.get("notes")
                                or (
                                    "Verification passed: Criteria successfully satisfied and visually verified in field."
                                    if is_pass
                                    else "Checkpoint defect observed."
                                ),
                                "status": "pass" if is_pass else "fail",
                                "severity": "Verified Pass" if is_pass else "Minor",
                                "r0_score": 0.0 if is_pass else 1.2,
                                "mitigation": "Criteria met. Approved for commissioning."
                                if is_pass
                                else (step.get("notes") or "Perform corrective adjustment."),
                                "raised_by": closed_by,
                                "timestamp": gen_at,
                                "generated_at": gen_at,
                                "photo_url": photo,
                                "parameter_name": "Field Visual Verification",
                                "actual_value": "Passed Spec" if is_pass else "Deviated",
                                "required_value": step.get("acceptance_criteria", "Satisfy specification"),
                                "unit": "",
                                "clause": "QA Commissioning Protocol",
                                "is_demo": False,
                            }
                        )
            except Exception:
                continue
    except Exception:
        pass

    return results
