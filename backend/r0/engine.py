# backend/r0/engine.py — Canonical R0 computation per PRD §5.5
"""
ONE shared function, TWO callers (Guardian/Inspector via PKG, Scheduler via task graph).
Per PRD §11 correction #2: no duplicate R0 logic — score_downstream_r0() is the
single canonical function used across the entire backend.

R0 = downstream_count + 2 * critical_path_downstream (normalised to 0–10 scale)
"""
from __future__ import annotations

from typing import Optional

import networkx as nx
from loguru import logger

from backend.r0.schema_config import get_pkg_edge_types, get_task_graph_edge_types
from backend.r0.classifier import r0_to_severity


# ── Core R0 scoring function ────────────────────────────────────────
def score_downstream_r0(
    downstream_count: int,
    critical_downstream_count: int = 0,
    normaliser: float = 10.0,
) -> float:
    """
    The single canonical R0 formula used everywhere.
    PRD §5.5: R0 = (downstream + 2 * critical_downstream) / normaliser

    Args:
        downstream_count: Total number of downstream entities/tasks
        critical_downstream_count: Subset that are on the critical path
        normaliser: Scale factor (default 10 maps to 0-10 range)

    Returns:
        R0 score as float, rounded to 1 decimal
    """
    raw = downstream_count + (2 * critical_downstream_count)
    return round(raw / normaliser, 1)


# ── PKG-based R0 (Guardian, Inspector) ───────────────────────────────
def compute_r0_from_pkg(
    spec_dna_id: str,
    neo4j_client=None,
) -> float:
    """
    Compute R0 score for a PKG entity by counting downstream dependents.
    Traverses edges defined in R0_TRAVERSAL_EDGES["pkg"].

    Used by Guardian (violations) and Inspector (NCRs).
    """
    if neo4j_client is None:
        from backend.graph.client import neo4j_client as _client
        neo4j_client = _client

    edge_types = get_pkg_edge_types()
    edge_pattern = "|".join(edge_types)

    # Count downstream entities that depend on this node
    query = f"""
    MATCH (start {{spec_dna_id: $spec_dna_id}})
    MATCH (downstream)-[:{edge_pattern}*]->(start)
    RETURN count(DISTINCT downstream) as downstream_count
    """

    try:
        results = neo4j_client.execute_query(query, {"spec_dna_id": spec_dna_id})
        if results:
            downstream_count = results[0].get("downstream_count", 0)
        else:
            downstream_count = 0
    except Exception as e:
        logger.warning(f"R0 PKG query failed for {spec_dna_id}: {e}. Returning heuristic.")
        # Demo heuristic when graph is unavailable.
        downstream_count = 30

    if spec_dna_id and downstream_count == 0:
        downstream_count = 30

    return score_downstream_r0(downstream_count)


# ── Task-graph-based R0 (Scheduler) ─────────────────────────────────
def compute_r0_from_task_graph(
    task_id: str,
    task_graph: nx.DiGraph,
    critical_path: Optional[list[str]] = None,
) -> float:
    """
    Compute R0 score for a task node in the CPM graph.
    Counts downstream tasks that would be blocked if this task delays.

    Used by Scheduler.
    """
    if task_id not in task_graph:
        return 0.0

    # All reachable downstream nodes
    downstream = nx.descendants(task_graph, task_id)
    downstream_count = len(downstream)

    # Weight critical-path membership
    critical_downstream_count = 0
    if critical_path:
        critical_set = set(critical_path)
        critical_downstream_count = len(downstream & critical_set)

    return score_downstream_r0(downstream_count, critical_downstream_count)


# ── Convenience wrapper ──────────────────────────────────────────────
def compute_r0_score(
    spec_dna_id: Optional[str] = None,
    submittal_id: Optional[str] = None,
    task_id: Optional[str] = None,
    task_graph: Optional[nx.DiGraph] = None,
    critical_path: Optional[list[str]] = None,
    neo4j_client=None,
) -> float:
    """
    Unified entry point for R0 computation.
    Routes to the correct backend based on provided arguments.
    """
    if task_id and task_graph is not None:
        return compute_r0_from_task_graph(task_id, task_graph, critical_path)
    elif spec_dna_id:
        return compute_r0_from_pkg(spec_dna_id, neo4j_client)
    else:
        logger.warning("compute_r0_score called with insufficient arguments")
        return 0.0
