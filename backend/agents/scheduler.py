# backend/agents/scheduler.py — The Scheduler (Predictive R0 Risk Engine) per PRD §6.2
"""
Builds CPM dependency graph, forecasts delays, computes R0, suggests mitigations.
"""
from __future__ import annotations

import json
from typing import TypedDict, Optional

import networkx as nx
import pandas as pd
from loguru import logger

from backend.ingestion.parsers.csv_parser import parse_schedule_csv
from backend.r0.engine import compute_r0_from_task_graph
from backend.r0.classifier import r0_to_severity
from backend.llm.client import invoke_raw
from backend.prompts.registry import load_prompt, get_prompt_version


class SchedulerState(TypedDict):
    schedule_data: list
    task_graph: Optional[nx.DiGraph]
    at_risk_tasks: list
    r0_scores: dict
    critical_path: list
    mitigation_suggestions: list


def build_task_graph(state: SchedulerState) -> SchedulerState:
    """Parse schedule data and build NetworkX directed graph (CPM)."""
    G = nx.DiGraph()

    for task in state["schedule_data"]:
        G.add_node(task["task_id"], **task)
        preds = task.get("predecessors", "")
        if preds:
            for pred in str(preds).split(";"):
                pred = pred.strip()
                if pred and pred in [t["task_id"] for t in state["schedule_data"]]:
                    G.add_edge(pred, task["task_id"])

    # Compute critical path
    try:
        critical_path = nx.dag_longest_path(G)
    except (nx.NetworkXUnfeasible, nx.NetworkXError):
        critical_path = []

    logger.info(f"Scheduler: built task graph with {G.number_of_nodes()} nodes, critical path length={len(critical_path)}")
    return {**state, "task_graph": G, "critical_path": critical_path}


def forecast_delays(state: SchedulerState) -> SchedulerState:
    """
    Identify at-risk tasks using heuristic delay model.
    (XGBoost structure ready for Phase 2 upgrade)
    """
    at_risk = []
    G = state["task_graph"]
    if G is None:
        return {**state, "at_risk_tasks": []}

    for task_id, data in G.nodes(data=True):
        delay_prob = _estimate_delay_probability(data, G)

        if delay_prob > 0.6:
            at_risk.append({
                "task_id": task_id,
                "task_name": data.get("task_name", ""),
                "delay_probability": round(delay_prob, 2),
                "expected_delay_days": _estimate_delay_days(data),
                "on_critical_path": task_id in state["critical_path"],
                "discipline": data.get("discipline", ""),
                "equipment_tag": data.get("equipment_tag", ""),
            })

    logger.info(f"Scheduler: identified {len(at_risk)} at-risk tasks")
    return {**state, "at_risk_tasks": at_risk}


def compute_task_r0(state: SchedulerState) -> SchedulerState:
    """Compute R0 for each at-risk task."""
    r0_scores = {}
    G = state["task_graph"]
    if G is None:
        return {**state, "r0_scores": {}}

    for task in state["at_risk_tasks"]:
        task_id = task["task_id"]
        r0 = compute_r0_from_task_graph(task_id, G, state["critical_path"])
        r0_scores[task_id] = r0
        task["r0_score"] = r0
        task["severity"] = r0_to_severity(r0)

    return {**state, "r0_scores": r0_scores}


def suggest_mitigations(state: SchedulerState) -> SchedulerState:
    """LLM suggests actionable mitigations for top 3 R0 risks."""
    top_risks = sorted(
        state["at_risk_tasks"],
        key=lambda x: x.get("r0_score", 0),
        reverse=True,
    )[:3]

    if not top_risks:
        return {**state, "mitigation_suggestions": []}

    prompt = load_prompt(
        "scheduler_mitigation",
        at_risk_tasks=json.dumps(top_risks, indent=2, default=str),
    )

    try:
        response_text = invoke_raw(
            prompt=prompt,
            agent_name="scheduler",
            prompt_name="scheduler_mitigation",
            prompt_version=get_prompt_version("scheduler_mitigation"),
        )
        # Try to parse JSON from response
        from backend.llm.client import _extract_json
        mitigations = _extract_json(response_text)
        if isinstance(mitigations, dict):
            mitigations = [mitigations]
    except Exception as e:
        logger.warning(f"Scheduler: mitigation LLM call failed: {e}")
        # Fallback: generate deterministic mitigations
        mitigations = [
            {
                "task_id": t["task_id"],
                "mitigation_action": f"Expedite {t['task_name']} — assign additional crew",
                "responsible_party": "Project Manager",
                "deadline_hours": 48,
            }
            for t in top_risks
        ]

    return {**state, "mitigation_suggestions": mitigations}


def _estimate_delay_probability(task_data: dict, G: nx.DiGraph) -> float:
    """Heuristic delay model for MVP. Replace with trained XGBoost in production."""
    progress = float(task_data.get("progress_pct", 0)) / 100
    status = str(task_data.get("status", "")).lower()

    if status == "delayed":
        return 0.9
    if status == "at_risk":
        return 0.75
    if progress < 0.2:
        return 0.65
    if progress < 0.5 and status != "completed":
        return 0.45
    return 0.3


def _estimate_delay_days(task_data: dict) -> int:
    """Estimate expected delay in days."""
    status = str(task_data.get("status", "")).lower()
    if status == "delayed":
        return 7
    if status == "at_risk":
        return 3
    return 1


# ── Agent runner ─────────────────────────────────────────────────────
async def run_scheduler(schedule_data: Optional[list] = None, csv_path: Optional[str] = None) -> dict:
    """Run the full Scheduler pipeline."""
    if schedule_data is None and csv_path:
        schedule_data = parse_schedule_csv(csv_path)
    elif schedule_data is None:
        # Load default schedule
        import os
        default_csv = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data", "project_schedule_100tasks.csv",
        )
        schedule_data = parse_schedule_csv(default_csv)

    state: SchedulerState = {
        "schedule_data": schedule_data,
        "task_graph": None,
        "at_risk_tasks": [],
        "r0_scores": {},
        "critical_path": [],
        "mitigation_suggestions": [],
    }

    state = build_task_graph(state)
    state = forecast_delays(state)
    state = compute_task_r0(state)
    state = suggest_mitigations(state)

    return {
        "at_risk_tasks": state["at_risk_tasks"],
        "critical_path": state["critical_path"],
        "mitigations": state["mitigation_suggestions"],
        "r0_scores": state["r0_scores"],
        "total_tasks": len(schedule_data),
        "at_risk_count": len(state["at_risk_tasks"]),
    }
