# backend/errors.py — Standard error envelope per PRD §5.3
"""
Every error returned by the API uses this envelope:
{
    "ok": false,
    "error": {
        "code": "GRAPH_UNAVAILABLE",
        "message": "Neo4j connection timed out after 30s",
        "agent": "guardian"
    }
}
"""
from __future__ import annotations
from typing import Optional


# ── Error codes ──────────────────────────────────────────────────────
class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"          # 422
    LLM_ERROR = "LLM_ERROR"                        # 502
    LLM_PARSE_ERROR = "LLM_PARSE_ERROR"            # 502
    GRAPH_UNAVAILABLE = "GRAPH_UNAVAILABLE"         # 503
    GRAPH_QUERY_ERROR = "GRAPH_QUERY_ERROR"         # 500
    VECTOR_UNAVAILABLE = "VECTOR_UNAVAILABLE"       # 503
    REDIS_UNAVAILABLE = "REDIS_UNAVAILABLE"         # 503
    NOT_FOUND = "NOT_FOUND"                        # 404
    FORBIDDEN = "FORBIDDEN"                        # 403
    RATE_LIMITED = "RATE_LIMITED"                   # 429
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"  # 409
    INTERNAL_ERROR = "INTERNAL_ERROR"              # 500
    APPROVAL_PENDING = "APPROVAL_PENDING"          # 202
    APPROVAL_REJECTED = "APPROVAL_REJECTED"        # 403


# ── Status code mapping ─────────────────────────────────────────────
ERROR_STATUS_MAP: dict[str, int] = {
    ErrorCode.VALIDATION_ERROR: 422,
    ErrorCode.LLM_ERROR: 502,
    ErrorCode.LLM_PARSE_ERROR: 502,
    ErrorCode.GRAPH_UNAVAILABLE: 503,
    ErrorCode.GRAPH_QUERY_ERROR: 500,
    ErrorCode.VECTOR_UNAVAILABLE: 503,
    ErrorCode.REDIS_UNAVAILABLE: 503,
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.FORBIDDEN: 403,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.IDEMPOTENCY_CONFLICT: 409,
    ErrorCode.INTERNAL_ERROR: 500,
    ErrorCode.APPROVAL_PENDING: 202,
    ErrorCode.APPROVAL_REJECTED: 403,
}


# ── Exception hierarchy ─────────────────────────────────────────────
class StrandError(Exception):
    """Base exception for all STRAND errors."""

    def __init__(
        self,
        code: str = ErrorCode.INTERNAL_ERROR,
        message: str = "An internal error occurred",
        agent: Optional[str] = None,
    ):
        self.code = code
        self.message = message
        self.agent = agent
        super().__init__(message)

    @property
    def status_code(self) -> int:
        return ERROR_STATUS_MAP.get(self.code, 500)

    def to_envelope(self) -> dict:
        """Return the standard error envelope dict."""
        return {
            "ok": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "agent": self.agent,
            },
        }


class StrandLLMError(StrandError):
    """LLM invocation or parse failure."""

    def __init__(self, message: str = "LLM invocation failed", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.LLM_ERROR, message=message, agent=agent)


class StrandLLMParseError(StrandError):
    """LLM returned unparseable output after all retries."""

    def __init__(self, message: str = "LLM output could not be parsed", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.LLM_PARSE_ERROR, message=message, agent=agent)


class StrandGraphError(StrandError):
    """Neo4j / graph layer error."""

    def __init__(self, message: str = "Graph query failed", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.GRAPH_QUERY_ERROR, message=message, agent=agent)


class StrandGraphUnavailableError(StrandError):
    """Neo4j unreachable."""

    def __init__(self, message: str = "Neo4j is unavailable", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.GRAPH_UNAVAILABLE, message=message, agent=agent)


class StrandValidationError(StrandError):
    """Input validation failure."""

    def __init__(self, message: str = "Validation error", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.VALIDATION_ERROR, message=message, agent=agent)


class StrandPermissionError(StrandError):
    """Tool policy / RBAC denial — §5.7 authorize_tool_call."""

    def __init__(self, message: str = "Permission denied", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.FORBIDDEN, message=message, agent=agent)


class StrandNotFoundError(StrandError):
    """Entity not found in PKG."""

    def __init__(self, message: str = "Resource not found", agent: Optional[str] = None):
        super().__init__(code=ErrorCode.NOT_FOUND, message=message, agent=agent)
