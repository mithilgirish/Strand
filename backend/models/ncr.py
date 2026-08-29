# backend/models/ncr.py — Inspector models
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class NcrSubmission(BaseModel):
    transcript: str
    equipment_tag: str
    step_id: str
    raised_by: str = "field_engineer"


class NcrData(BaseModel):
    """LLM-extracted structured NCR data."""

    title: str
    description: str
    parameter_name: str
    actual_value: float | str
    unit: str = ""
    severity_suggestion: str = "Major"
    immediate_action: str = ""


class NcrResponse(BaseModel):
    ncr_id: str
    title: str = ""
    description: str = ""
    equipment_tag: str = ""
    step_id: str = ""
    severity: str = ""
    r0_score: float = 0.0
    status: str = "pending_approval"
    spec_dna_ref: str = ""
    raised_by: str = ""
    timestamp: str = ""
    mitigation: str = ""
    transcript: str = ""


class ChecklistStep(BaseModel):
    step_id: str
    sequence: int
    description: str
    acceptance_criteria: str = ""
    parameter_name: str = ""
    expected_value: float | str = ""
    unit: str = ""
    tia942_clause: str = ""
    status: str = "pending"


class ChecklistResponse(BaseModel):
    equipment_tag: str
    checklist_title: str
    steps: list[ChecklistStep] = []


class AsBuiltRecord(BaseModel):
    equipment_tag: str
    as_built_id: str
    completed_steps: int = 0
    total_steps: int = 0
    ncrs_raised: int = 0
    status: str = "in_progress"
