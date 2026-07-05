# backend/tools/policy.py — Tool authorization policy per PRD §5.7 (v1.2)
"""
TOOL_POLICY dict + authorize_tool_call().
Role-based tool permissions. planner_llm_write role requires HITL.
"""
from __future__ import annotations

from loguru import logger
from backend.errors import StrandPermissionError


# ── Tool access control (§5.7 v1.2) ─────────────────────────────────
# Role → which tools are allowed
TOOL_POLICY: dict[str, list[str]] = {
    "guardian": ["run_guardian", "trace_spec_dna", "compute_r0", "search_vector"],
    "scheduler": ["run_scheduler", "compute_r0", "calculate_delay"],
    "oracle": ["run_oracle", "find_suppliers", "retrieve_graph"],
    "inspector": ["run_inspector", "trace_spec_dna", "compute_r0"],
    "brain": ["run_brain", "search_vector", "retrieve_graph", "trace_spec_dna"],
    "judge": ["trace_spec_dna", "compute_r0", "search_vector", "retrieve_graph"],
    "planner": [
        "run_guardian", "run_scheduler", "run_oracle",
        "run_inspector", "run_brain", "run_judge",
        "trace_spec_dna", "compute_r0", "search_vector",
        "retrieve_graph", "find_suppliers", "calculate_delay",
        "create_rfi", "create_ncr", "generate_report",
    ],
    "admin": ["*"],  # unrestricted
}


# Current active role (set per request in middleware)
_current_role: str = "planner"


def set_role(role: str):
    global _current_role
    _current_role = role


def get_role() -> str:
    return _current_role


def authorize_tool_call(tool_name: str, is_write: bool = False) -> bool:
    """
    Check if the current role is authorized to call a tool.

    Per v1.2: write tools from planner require HITL approval.
    The approval gate is in the Planner, not here — this just checks
    if the role can *initiate* the call.

    Raises:
        StrandPermissionError: If the role cannot use this tool
    """
    from backend.config import settings
    allowed_tools = TOOL_POLICY.get(_current_role, [])

    if is_write and not getattr(settings, "DEMO_MODE", False):
        raise StrandPermissionError(
            message=f"Write operations are disabled unless DEMO_MODE=True",
            agent=_current_role,
        )

    if "*" in allowed_tools:
        return True

    if tool_name not in allowed_tools:
        raise StrandPermissionError(
            message=f"Role '{_current_role}' cannot invoke tool '{tool_name}'",
            agent=_current_role,
        )

    return True
