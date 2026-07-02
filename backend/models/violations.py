# backend/models/violations.py — Guardian models
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class Violation(BaseModel):
    parameter: str
    required: float | str
    actual: float | str
    unit: str = ""
    spec_dna_id: str = ""
    section: str = ""
    page: int = 0
    r0_score: float = 0.0
    severity: str = ""
    deviation_type: str = "out_of_spec"


class SpecDnaNode(BaseModel):
    id: str
    label: str
    section: Optional[str] = None
    parameter_name: Optional[str] = None
    parameter_value: Optional[float | str] = None


class GuardianAnalysisRequest(BaseModel):
    submittal_id: Optional[str] = None
    document_type: str = "submittal"


class GuardianAnalysisResponse(BaseModel):
    submittal_id: str
    violations: list[Violation] = []
    r0_max: float = 0.0
    rfi_draft: str = ""
    spec_dna_chain: dict = {}
    violation_count: int = 0
    status: str = "analyzed"
