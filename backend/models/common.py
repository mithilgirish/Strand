# backend/models/common.py — Shared Pydantic models per PRD §5.3
from __future__ import annotations

from typing import Optional, Any
from enum import Enum

from pydantic import BaseModel


class SeverityLevel(str, Enum):
    MINOR = "Minor"
    MAJOR = "Major"
    CRITICAL = "Critical"
    SYSTEMIC = "Systemic"


class NcrStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    CLOSED = "closed"
    REJECTED = "rejected"


class ConfidenceLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class StrandResponse(BaseModel):
    """Standard success envelope."""
    ok: bool = True
    data: Any = None


class ErrorDetail(BaseModel):
    """Standard error detail."""
    code: str
    message: str
    agent: Optional[str] = None


class StrandErrorResponse(BaseModel):
    """Standard error envelope per §5.3."""
    ok: bool = False
    error: ErrorDetail
