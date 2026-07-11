# backend/routers/scheduler.py — Phase 2: Full Scheduler API routes
"""
Routes:
  GET  /scheduler/risks           → at-risk tasks with R0 scores
  GET  /scheduler/critical-path   → ordered critical-path task list
  GET  /scheduler/r0/{task_id}    → single task R0 + downstream count
  GET  /scheduler/timeline        → all tasks formatted for CriticalPathTimeline
  GET  /scheduler/milestones      → milestone-level summary from at-risk tasks
  GET  /scheduler/r0              → overall max R0 score
  POST /scheduler/apply-mitigation → stub for MitigationPanel action
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from loguru import logger

from backend.agents.scheduler import run_scheduler
from backend.redis_client import redis_client

router = APIRouter(tags=["scheduler"])

CACHE_KEY = "scheduler:latest"


async def _get_scheduler_result() -> dict:
    """Get cached scheduler result or run fresh analysis."""
    cached = redis_client.get_cache(CACHE_KEY)
    if cached:
        return cached

    try:
        result = await run_scheduler()
        redis_client.set_cache(CACHE_KEY, result, ttl=600)  # 10 min cache
        return result
    except Exception as e:
        logger.error(f"Scheduler run failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scheduler analysis failed: {e}")


@router.get("/scheduler/risks")
async def get_risks():
    """Return at-risk tasks with R0 scores, sorted by risk."""
    result = await _get_scheduler_result()
    at_risk = result.get("at_risk_tasks", [])

    # Sort by R0 descending
    at_risk_sorted = sorted(at_risk, key=lambda t: t.get("r0_score", 0), reverse=True)

    return {
        "at_risk_tasks": at_risk_sorted,
        "count": len(at_risk_sorted),
        "total_tasks": result.get("total_tasks", 0),
    }


@router.get("/scheduler/critical-path")
async def get_critical_path():
    """Return the ordered list of tasks on the critical path."""
    result = await _get_scheduler_result()
    return {
        "critical_path": result.get("critical_path", []),
        "length": len(result.get("critical_path", [])),
    }


@router.get("/scheduler/r0/{task_id}")
async def get_task_r0(task_id: str):
    """Return R0 score + downstream count for a single task."""
    result = await _get_scheduler_result()
    r0_scores = result.get("r0_scores", {})

    if task_id not in r0_scores:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found or not at-risk")

    r0 = r0_scores[task_id]
    task_info = next(
        (t for t in result.get("at_risk_tasks", []) if t["task_id"] == task_id),
        {},
    )

    return {
        "task_id": task_id,
        "r0_score": r0,
        "severity": task_info.get("severity", "Unknown"),
        "task_name": task_info.get("task_name", ""),
        "delay_probability": task_info.get("delay_probability", 0),
        "on_critical_path": task_info.get("on_critical_path", False),
    }


@router.get("/scheduler/r0")
async def get_overall_r0():
    """Return the maximum R0 score across all at-risk tasks."""
    result = await _get_scheduler_result()
    r0_scores = result.get("r0_scores", {})

    if not r0_scores:
        return {"score": 0.0, "max_task_id": None}

    max_task = max(r0_scores, key=r0_scores.get)
    return {
        "score": r0_scores[max_task],
        "max_task_id": max_task,
    }


@router.get("/scheduler/timeline")
async def get_timeline():
    """Return all tasks formatted for the CriticalPathTimeline component.

    Output shape matches frontend TaskActivity:
        { id, name, startDay, duration, critical }
    """
    result = await _get_scheduler_result()
    critical_path = set(result.get("critical_path", []))
    at_risk_ids = {t["task_id"] for t in result.get("at_risk_tasks", [])}

    # Re-run the parser to get full task list (scheduler result only has at-risk)
    from backend.ingestion.parsers.csv_parser import parse_schedule_csv
    import os
    from datetime import datetime

    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "project_schedule_100tasks.csv",
    )
    all_tasks = parse_schedule_csv(csv_path)

    if not all_tasks:
        return []

    # Find the earliest start date to compute relative day offsets
    dates = []
    for t in all_tasks:
        try:
            dates.append(datetime.strptime(t["start_date"], "%Y-%m-%d"))
        except (ValueError, KeyError):
            pass

    base_date = min(dates) if dates else datetime(2026, 7, 1)

    timeline = []
    for t in all_tasks:
        try:
            start = datetime.strptime(t["start_date"], "%Y-%m-%d")
            end = datetime.strptime(t["end_date"], "%Y-%m-%d")
            start_day = (start - base_date).days
            duration = max(1, (end - start).days)
        except (ValueError, KeyError):
            start_day = 0
            duration = 5

        is_critical = t["task_id"] in critical_path or t["task_id"] in at_risk_ids
        status = t.get("status", "on_track")

        timeline.append({
            "id": t["task_id"],
            "name": t.get("task_name", t["task_id"]),
            "startDay": start_day,
            "duration": duration,
            "critical": is_critical,
            "status": status,
            "discipline": t.get("discipline", ""),
        })

    return timeline


@router.get("/scheduler/milestones")
async def get_milestones():
    """Return milestone-level summary from at-risk tasks.

    Output shape matches frontend Milestone:
        { id, name, status, plannedDate, projectedDate?, delayRisk, impactScore }
    """
    result = await _get_scheduler_result()
    at_risk = result.get("at_risk_tasks", [])

    milestones = []
    for t in at_risk:
        r0 = t.get("r0_score", 0)
        delay_prob = t.get("delay_probability", 0)

        status_map = {True: "delayed", False: "in_progress"}
        is_delayed = t.get("status", "") == "delayed" or delay_prob > 0.85

        milestones.append({
            "id": t["task_id"],
            "name": t.get("task_name", t["task_id"]),
            "status": "delayed" if is_delayed else ("in_progress" if delay_prob > 0.5 else "pending"),
            "plannedDate": t.get("end_date", ""),
            "delayRisk": round(delay_prob * 100),
            "impactScore": r0,
            "discipline": t.get("discipline", ""),
            "equipment_tag": t.get("equipment_tag", ""),
        })

    # Sort by impact score descending
    milestones.sort(key=lambda m: m["impactScore"], reverse=True)
    return milestones


@router.post("/scheduler/apply-mitigation")
async def apply_mitigation(body: dict):
    """Stub endpoint for applying a mitigation strategy."""
    strategy_id = body.get("strategy_id", "unknown")
    logger.info(f"Mitigation applied: {strategy_id}")

    return {
        "message": f"Mitigation strategy '{strategy_id}' has been applied successfully.",
        "mitigation_id": f"MIT-{strategy_id[:8].upper()}",
        "status": "applied",
    }
