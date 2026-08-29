from __future__ import annotations

from enum import Enum
from typing import Any, Optional

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
    agent: str | None = None


class StrandErrorResponse(BaseModel):
    """Standard error envelope"""

    ok: bool = False
    error: ErrorDetail
