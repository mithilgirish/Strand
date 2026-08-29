# backend/tools/registry.py — Tool Registry per PRD §5.7
"""
Two tiers:
- Tier 1 (Agent-level): run_guardian, run_scheduler, run_oracle, run_inspector, run_brain, run_judge
- Tier 2 (Primitives): trace_spec_dna, compute_r0, create_rfi, create_ncr, search_vector, etc.
"""

from __future__ import annotations

from typing import Any, Callable

from loguru import logger

# ── Tool registration ────────────────────────────────────────────────
_TOOL_REGISTRY: dict[str, dict] = {}


def register_tool(
    name: str,
    func: Callable,
    tier: int = 2,
    is_write: bool = False,
    description: str = "",
):
    """Register a tool in the global registry."""
    _TOOL_REGISTRY[name] = {
        "func": func,
        "tier": tier,
        "is_write": is_write,
        "description": description,
    }


def get_tool(name: str) -> dict:
    """Get tool definition by name."""
    return _TOOL_REGISTRY.get(name, {})


def list_tools() -> list[dict]:
    """List all registered tools."""
    return [
        {"name": name, "tier": t["tier"], "is_write": t["is_write"], "description": t["description"]}
        for name, t in _TOOL_REGISTRY.items()
    ]


async def invoke_tool(name: str, **kwargs) -> Any:
    """Invoke a registered tool with RBAC checks."""
    from backend.tools.policy import authorize_tool_call

    tool = _TOOL_REGISTRY.get(name)
    if not tool:
        raise ValueError(f"Tool '{name}' not found in registry")

    # RBAC check
    authorize_tool_call(name, tool["is_write"])

    func = tool["func"]
    logger.info(f"Tool invoked: {name}, tier={tool['tier']}, write={tool['is_write']}")

    # Handle both async and sync functions
    import asyncio

    if asyncio.iscoroutinefunction(func):
        return await func(**kwargs)
    else:
        return func(**kwargs)


# ── Auto-register all tools ─────────────────────────────────────────
def _register_all_tools():
    """Register all tools at module load time."""
    # Tier 1: Agent-level tools
    try:
        from backend.agents.guardian import run_guardian

        register_tool(
            "run_guardian",
            run_guardian,
            tier=1,
            is_write=True,
            description="Run spec compliance analysis on a submittal",
        )
    except Exception as e:
        logger.warning(f"Could not load run_guardian: {e}")

    try:
        from backend.agents.scheduler import run_scheduler

        register_tool("run_scheduler", run_scheduler, tier=1, is_write=False, description="Run schedule risk analysis")
    except Exception as e:
        logger.warning(f"Could not load run_scheduler: {e}")

    try:
        from backend.agents.oracle import run_oracle

        register_tool("run_oracle", run_oracle, tier=1, is_write=False, description="Get supply chain intelligence")
    except Exception as e:
        logger.warning(f"Could not load run_oracle: {e}")

    try:
        from backend.agents.inspector import run_inspector

        register_tool("run_inspector", run_inspector, tier=1, is_write=True, description="Process voice NCR")
    except Exception as e:
        logger.warning(f"Could not load run_inspector: {e}")

    try:
        from backend.agents.brain import run_brain

        register_tool("run_brain", run_brain, tier=1, is_write=False, description="Query project knowledge")
    except Exception as e:
        logger.warning(f"Could not load run_brain: {e}")

    try:
        from backend.agents.judge import run_judge

        register_tool("run_judge", run_judge, tier=1, is_write=False, description="Verify LLM output")
    except Exception as e:
        logger.warning(f"Could not load run_judge: {e}")

    # Tier 2: Primitive tools
    try:
        from backend.ingestion.spec_dna.chain import trace_spec_dna

        register_tool(
            "trace_spec_dna", trace_spec_dna, tier=2, is_write=False, description="Trace Spec-DNA lineage chain"
        )
    except Exception as e:
        logger.warning(f"Could not load trace_spec_dna: {e}")

    try:
        from backend.r0.engine import compute_r0_score

        register_tool("compute_r0", compute_r0_score, tier=2, is_write=False, description="Compute R0 contagion score")
    except Exception as e:
        logger.warning(f"Could not load compute_r0: {e}")


# Try to register — may fail at import time if deps not ready
try:
    _register_all_tools()
except Exception as e:
    logger.warning(f"Tool registry: deferred registration (will retry): {e}")
