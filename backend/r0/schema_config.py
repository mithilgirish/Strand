# backend/r0/schema_config.py — Configurable R0 traversal per PRD §4.6 (v1.2)
"""
Externalizes the edge types used by R0 traversal.
A schema change that adds e.g. SUPERSEDES as a second lineage-relevant edge
is a one-line config change here, not a silent gap in R0's coverage.
"""

R0_TRAVERSAL_EDGES: dict[str, list[str]] = {
    # Guardian's traversal — extend here, not in engine.py
    "pkg": ["DERIVES_FROM"],
    # Scheduler's traversal
    "task_graph": ["DEPENDS_ON"],
}


def get_pkg_edge_types() -> list[str]:
    """Edge types for PKG-based R0 (Guardian, Inspector)."""
    return R0_TRAVERSAL_EDGES["pkg"]


def get_task_graph_edge_types() -> list[str]:
    """Edge types for task-graph-based R0 (Scheduler)."""
    return R0_TRAVERSAL_EDGES["task_graph"]
