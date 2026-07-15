# backend/ingestion/parsers/vision_parser.py
from __future__ import annotations
import base64
from typing import Any
from loguru import logger
from pydantic import BaseModel

from backend.llm.client import invoke_vision_structured
from backend.prompts.registry import load_prompt

class VisualViolation(BaseModel):
    parameter: str
    actual: str
    required: str
    deviation_type: str = "visual_anomaly"

class VisionResponse(BaseModel):
    violations: list[VisualViolation]

def analyze_drawing_with_vision(file_path: str, submittal_id: str) -> list[dict]:
    """
    Extracts images from the document and uses a Vision LLM to find visual compliance deviations.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("PyMuPDF not available, skipping vision analysis")
        return []

    try:
        doc = fitz.open(file_path)
        if len(doc) == 0:
            return []
            
        # Get first page as image
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x resolution
        img_data = pix.tobytes("jpeg")
        base64_image = base64.b64encode(img_data).decode("utf-8")
        
        doc.close()
        
        prompt = load_prompt("guardian_vision", submittal_id=submittal_id)
        
        logger.info(f"Sending vision request for {file_path}")
        result = invoke_vision_structured(
            prompt=prompt,
            base64_image=base64_image,
            response_model=VisionResponse,
            agent_name="guardian_vision",
            prompt_name="guardian_vision"
        )
        
        return [v.model_dump() for v in result.violations]
        
    except Exception as e:
        logger.error(f"Vision analysis failed for {file_path}: {e}")
        return []
