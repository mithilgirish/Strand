# backend/r0/engine.py — Canonical R0 computation per PRD §5.5
"""
ONE shared function, TWO callers (Guardian/Inspector via PKG, Scheduler via task graph).

Contagion (PRD §5.5):
    R0_contagion = (downstream + 2 * critical_downstream) / normaliser   → 0–10

Engineering (submittal-aware):
    R0_eng = min(10, relative_gap * 28 * parameter_criticality)

Final violation R0:
    0.40 * contagion + 0.60 * engineering

When the PKG has no DERIVES_FROM fan-out (typical for a freshly uploaded PDF),
contagion uses a labeled discipline estimate instead of a fake constant.
"""

from __future__ import annotations

from typing import Any, Optional

import networkx as nx
from loguru import logger

from backend.graph.schema import get_operator_for_parameter
from backend.r0.classifier import r0_to_severity

# How badly a miss on this parameter hurts the facility (0.4–1.0).
PARAMETER_CRITICALITY: dict[str, float] = {
    "cooling_capacity": 1.00,
    "floor_loading": 0.95,
    "chilled_water_supply_temp": 0.90,
    "ambient_temperature_max": 0.85,
    "ups_redundancy": 0.95,
    "fire_suppression": 0.90,
    "cable_derating": 0.75,
    "pdu_efficiency": 0.55,
    "generator_fuel_consumption": 0.70,
    "fuel_consumption": 0.70,
    "noise_level": 0.40,
}

# Estimated (downstream, critical_downstream) when PKG traversal is empty.
PARAMETER_FANOUT: dict[str, tuple[int, int]] = {
    "cooling_capacity": (10, 4),
    "floor_loading": (12, 5),
    "chilled_water_supply_temp": (8, 3),
    "ambient_temperature_max": (6, 2),
    "ups_redundancy": (9, 4),
    "fire_suppression": (7, 3),
    "cable_derating": (7, 2),
    "pdu_efficiency": (4, 1),
    "generator_fuel_consumption": (5, 2),
    "fuel_consumption": (5, 2),
}

_DEFAULT_FANOUT = (5, 1)
_DEFAULT_CRITICALITY = 0.60
_ENGINEERING_WEIGHT = 0.60
_CONTAGION_WEIGHT = 0.40
_GAP_SCALE = 28.0


def score_downstream_r0(
    downstream_count: int,
    critical_downstream_count: int = 0,
    normaliser: float = 10.0,
) -> float:
    """
    The single canonical contagion formula used everywhere.
    PRD §5.5: R0 = (downstream + 2 * critical_downstream) / normaliser
    """
    raw = downstream_count + (2 * critical_downstream_count)
    return round(max(0.0, min(10.0, raw / max(normaliser, 1.0))), 1)


def _as_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower()
    if not text or text in {"n+1", "n+2", "2n", "n"}:
        return None
    cleaned = (
        text.replace("°c", "")
        .replace("kw", "")
        .replace("kva", "")
        .replace("kn/m2", "")
        .replace("kn/m²", "")
        .replace("%", "")
        .replace(",", "")
        .strip()
    )
    try:
        return float(cleaned)
    except ValueError:
        return None


def parameter_criticality(parameter: str) -> float:
    key = (parameter or "").strip().lower()
    if key in PARAMETER_CRITICALITY:
        return PARAMETER_CRITICALITY[key]
    for token, weight in PARAMETER_CRITICALITY.items():
        if token in key or key in token:
            return weight
    return _DEFAULT_CRITICALITY


def deviation_ratio(
    actual: Any,
    required: Any,
    operator: str | None = None,
    parameter: str = "",
) -> float:
    """Relative amount the actual misses the spec. 0 = on spec, 1 = 100% miss."""
    op = (operator or get_operator_for_parameter(parameter or "") or "gte").lower()
    if op in {"visual_anomaly", "visual"}:
        return 0.35

    actual_n = _as_float(actual)
    required_n = _as_float(required)
    if actual_n is None or required_n is None:
        if actual is None or required is None:
            return 0.0
        return 0.0 if str(actual).strip().lower() == str(required).strip().lower() else 1.0

    if required_n == 0:
        return 1.0 if actual_n != 0 else 0.0

    if op == "lte":
        gap = max(0.0, actual_n - required_n) / abs(required_n)
    elif op == "eq":
        gap = abs(actual_n - required_n) / abs(required_n)
    else:
        # gte / default: shortfall against a minimum
        gap = max(0.0, required_n - actual_n) / abs(required_n)
    return round(min(gap, 2.0), 4)


def engineering_r0(
    actual: Any,
    required: Any,
    operator: str | None = None,
    parameter: str = "",
) -> float:
    gap = deviation_ratio(actual, required, operator=operator, parameter=parameter)
    score = gap * _GAP_SCALE * parameter_criticality(parameter)
    return round(max(0.0, min(10.0, score)), 1)


def _pkg_downstream_count(spec_dna_id: str, neo4j_client=None) -> tuple[int, str]:
    if not spec_dna_id:
        return 0, "none"
    if neo4j_client is None:
        from backend.graph.client import neo4j_client as _client

        neo4j_client = _client
    try:
        from backend.graph import queries

        results = neo4j_client.execute_query(
            queries.GET_DOWNSTREAM_DEPENDENCIES,
            {"spec_dna_id": spec_dna_id},
        )
        return (len(results) if results else 0), "pkg"
    except Exception as exc:
        logger.warning(f"R0 PKG query failed for {spec_dna_id}: {exc}")
        return 0, "unavailable"


def compute_violation_r0(
    *,
    spec_dna_id: str = "",
    parameter: str = "",
    actual: Any = None,
    required: Any = None,
    operator: str | None = None,
    neo4j_client=None,
) -> dict[str, Any]:
    """Score a spec deviation with contagion + engineering magnitude."""
    pkg_count, pkg_source = _pkg_downstream_count(spec_dna_id, neo4j_client)
    if pkg_count > 0:
        contagion = score_downstream_r0(pkg_count)
        contagion_source = pkg_source
        downstream = pkg_count
        critical_downstream = 0
    else:
        downstream, critical_downstream = PARAMETER_FANOUT.get(
            (parameter or "").strip().lower(),
            _DEFAULT_FANOUT,
        )
        contagion = score_downstream_r0(downstream, critical_downstream)
        contagion_source = "estimated_discipline"

    engineering = engineering_r0(actual, required, operator=operator, parameter=parameter)
    has_evidence = actual is not None and required is not None
    if has_evidence:
        combined = (_CONTAGION_WEIGHT * contagion) + (_ENGINEERING_WEIGHT * engineering)
    else:
        combined = contagion

    r0 = round(max(0.0, min(10.0, combined)), 1)
    return {
        "r0": r0,
        "contagion": contagion,
        "engineering": engineering,
        "criticality": parameter_criticality(parameter),
        "deviation_ratio": deviation_ratio(actual, required, operator=operator, parameter=parameter),
        "downstream_count": downstream,
        "critical_downstream_count": critical_downstream,
        "contagion_source": contagion_source,
        "severity": r0_to_severity(r0),
    }


def compute_r0_from_pkg(
    spec_dna_id: str,
    neo4j_client=None,
    *,
    parameter: str = "",
    actual: Any = None,
    required: Any = None,
    operator: str | None = None,
) -> float:
    """PKG / Inspector / Guardian entry point. Returns the 0–10 R0 float."""
    return compute_violation_r0(
        spec_dna_id=spec_dna_id,
        parameter=parameter,
        actual=actual,
        required=required,
        operator=operator,
        neo4j_client=neo4j_client,
    )["r0"]


def compute_r0_from_task_graph(
    task_id: str,
    task_graph: nx.DiGraph,
    critical_path: list[str] | None = None,
) -> float:
    """R0 for a CPM task: downstream blockage, weighted for the critical path."""
    if task_id not in task_graph:
        return 0.0

    downstream = nx.descendants(task_graph, task_id)
    downstream_count = len(downstream)
    critical_downstream_count = 0
    if critical_path:
        critical_downstream_count = len(downstream & set(critical_path))

    node_data = task_graph.nodes[task_id]
    delay_prob = float(node_data.get("delay_probability") or 0)
    on_critical = task_id in set(critical_path or [])
    contagion = score_downstream_r0(
        downstream_count,
        critical_downstream_count,
        normaliser=max(10.0, task_graph.number_of_nodes() * 0.55),
    )
    schedule_pressure = min(10.0, (4.0 if on_critical else 1.5) + delay_prob * 6.0)
    return round(max(0.0, min(10.0, 0.65 * contagion + 0.35 * schedule_pressure)), 1)


def compute_r0_score(
    spec_dna_id: str | None = None,
    submittal_id: str | None = None,
    task_id: str | None = None,
    task_graph: nx.DiGraph | None = None,
    critical_path: list[str] | None = None,
    neo4j_client=None,
    **kwargs: Any,
) -> float:
    """Unified entry point for R0 computation."""
    del submittal_id  # accepted for call-site compatibility
    if task_id and task_graph is not None:
        return compute_r0_from_task_graph(task_id, task_graph, critical_path)
    if spec_dna_id:
        return compute_r0_from_pkg(spec_dna_id, neo4j_client, **kwargs)
    logger.warning("compute_r0_score called with insufficient arguments")
    return 0.0
