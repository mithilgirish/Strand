# backend/models/risks.py — Scheduler models
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class AtRiskTask(BaseModel):
    task_id: str
    task_name: str | None = None
    delay_probability: float = 0.0
    expected_delay_days: int = 0
    on_critical_path: bool = False
    r0_score: float = 0.0
    severity: str = ""
    discipline: str | None = None
    equipment_tag: str | None = None


class MitigationSuggestion(BaseModel):
    task_id: str
    mitigation_action: str
    responsible_party: str = ""
    deadline_hours: int = 48


class CriticalPathResponse(BaseModel):
    critical_path: list[str] = []
    total_tasks: int = 0
    at_risk_count: int = 0
    r0_max: float = 0.0


class SchedulerRisksResponse(BaseModel):
    at_risk_tasks: list[AtRiskTask] = []
    critical_path: list[str] = []
    mitigations: list[MitigationSuggestion] = []
    r0_scores: dict[str, float] = {}
