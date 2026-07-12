"""Phase 2 Scheduler API routes."""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.agents.scheduler import run_scheduler
from backend.ingestion.parsers.csv_parser import parse_schedule_csv
from backend.redis_client import redis_client


router = APIRouter(tags=["scheduler"])
CACHE_KEY = "scheduler:latest"
SCHEDULE_PATH = Path(__file__).resolve().parents[2] / "data" / "project_schedule_100tasks.csv"


class MitigationRequest(BaseModel):
    task_id: str = Field(min_length=1)
    mitigation_action: str = Field(min_length=3)


async def _get_scheduler_result() -> dict:
    cached = redis_client.get_cache(CACHE_KEY)
    if cached:
        return cached
    result = await run_scheduler()
    redis_client.set_cache(CACHE_KEY, result, ttl=600)
    return result


@router.get("/scheduler/risks")
async def get_risks():
    result = await _get_scheduler_result()
    return {
        "at_risk_tasks": result["at_risk_tasks"],
        "mitigations": result["mitigations"],
        "count": result["at_risk_count"],
        "total_tasks": result["total_tasks"],
    }


@router.get("/scheduler/critical-path")
async def get_critical_path():
    result = await _get_scheduler_result()
    tasks = {task["task_id"]: task for task in parse_schedule_csv(str(SCHEDULE_PATH))}
    ordered_tasks = [tasks[task_id] for task_id in result["critical_path"] if task_id in tasks]
    return {"critical_path": result["critical_path"], "tasks": ordered_tasks, "length": len(ordered_tasks)}


@router.get("/scheduler/r0")
async def get_overall_r0():
    result = await _get_scheduler_result()
    scores = result["r0_scores"]
    if not scores:
        return {"score": 0.0, "max_task_id": None, "severity": "Low"}
    task_id = max(scores, key=scores.get)
    task = next(item for item in result["at_risk_tasks"] if item["task_id"] == task_id)
    return {"score": scores[task_id], "max_task_id": task_id, "severity": task["severity"]}


@router.get("/scheduler/r0/{task_id}")
async def get_task_r0(task_id: str):
    result = await _get_scheduler_result()
    task = next((item for item in result["at_risk_tasks"] if item["task_id"] == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found or not at risk")
    return {
        "task_id": task_id,
        "task_name": task["task_name"],
        "r0_score": task["r0_score"],
        "severity": task["severity"],
        "delay_probability": task["delay_probability"],
        "downstream_count": task["downstream_count"],
        "downstream_task_ids": task["downstream_task_ids"],
        "on_critical_path": task["on_critical_path"],
    }


@router.get("/scheduler/timeline")
async def get_timeline():
    result = await _get_scheduler_result()
    critical_path = set(result["critical_path"])
    risks = {task["task_id"]: task for task in result["at_risk_tasks"]}
    tasks = parse_schedule_csv(str(SCHEDULE_PATH))
    valid_dates = [datetime.fromisoformat(task["start_date"]) for task in tasks if task.get("start_date")]
    base_date = min(valid_dates) if valid_dates else datetime.now()
    timeline = []
    for task in tasks:
        start = datetime.fromisoformat(task["start_date"])
        end = datetime.fromisoformat(task["end_date"])
        risk = risks.get(task["task_id"], {})
        timeline.append(
            {
                "id": task["task_id"],
                "name": task["task_name"],
                "startDay": (start - base_date).days,
                "duration": max(1, (end - start).days + 1),
                "critical": task["task_id"] in critical_path,
                "atRisk": task["task_id"] in risks,
                "status": task["status"],
                "r0Score": risk.get("r0_score", 0),
                "discipline": task["discipline"],
            }
        )
    return timeline


@router.get("/scheduler/milestones")
async def get_milestones():
    result = await _get_scheduler_result()
    milestones = []
    for task in result["at_risk_tasks"]:
        planned = datetime.fromisoformat(task["end_date"])
        projected = planned + timedelta(days=task["expected_delay_days"])
        milestones.append(
            {
                "id": task["task_id"],
                "name": task["task_name"],
                "status": "delayed" if task["status"] == "delayed" else "in_progress",
                "plannedDate": planned.date().isoformat(),
                "projectedDate": projected.date().isoformat(),
                "delayRisk": round(task["delay_probability"] * 100),
                "impactScore": task["r0_score"],
                "downstreamCount": task["downstream_count"],
            }
        )
    return milestones


@router.post("/scheduler/apply-mitigation")
async def apply_mitigation(body: MitigationRequest):
    result = await _get_scheduler_result()
    if body.task_id not in result["r0_scores"]:
        raise HTTPException(status_code=404, detail=f"At-risk task {body.task_id} not found")
    mitigation_id = f"MIT-{body.task_id}"
    record = {
        "mitigation_id": mitigation_id,
        "task_id": body.task_id,
        "mitigation_action": body.mitigation_action,
        "status": "applied",
    }
    redis_client.set_json(f"scheduler:mitigation:{body.task_id}", record, ttl=86400)
    return record
