# backend/models/planner.py — Planner, Judge, Approval models
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, model_validator


class PlannerRequest(BaseModel):
    query: str
    session_id: str | None = None


class PlannerSubtask(BaseModel):
    agent: str
    action: str
    depends_on: list[str] = []
    result: dict | None = None
    status: str = "pending"  # pending | running | completed | failed


class IntentClassification(BaseModel):
    intent: str
    agents: list[str] = []
    subtasks: list[PlannerSubtask] = []
    requires_write: bool = False
    confidence: str = "Medium"

    @model_validator(mode="after")
    def validate_agents(self):
        valid_agents = {"guardian", "scheduler", "oracle", "inspector", "brain", "judge"}
        for agent in self.agents:
            if agent not in valid_agents:
                raise ValueError(f"Invalid agent specified: {agent}. Must be one of {valid_agents}")
        return self


class PlannerResponse(BaseModel):
    query: str
    intent: str = ""
    response: str = ""
    subtask_results: list[dict] = []
    judge_verdict: dict | None = None
    approval_id: str | None = None
    status: str = "completed"


class JudgeVerdict(BaseModel):
    """Per specification — independent verification result."""

    verdict: str = "approved"  # approved | approved_with_flag | rejected
    confidence_score: float = 0.0
    evidence_chain: list[dict] = []
    evidence_citations: list[dict] = []
    consistency_check: dict[str, Any] = {}
    hallucination_check: dict[str, Any] = {}
    flags: list[str] = []
    reasoning: str = ""


class ApprovalRequest(BaseModel):
    decision: str  # approve | reject
    reason: str | None = None


class ApprovalItem(BaseModel):
    approval_id: str
    action: str
    agent: str
    payload: dict = {}
    status: str = "pending"  # pending | approved | rejected
    created_at: str = ""
    decided_at: str | None = None
    decision_reason: str | None = None


class ExecutiveReportRequest(BaseModel):
    """Executive Report Generator."""

    topic: str | None = None
    include_agents: list[str] = []


class ExecutiveReport(BaseModel):
    report_id: str
    title: str = ""
    narrative: str = ""
    agent_summaries: dict[str, dict] = {}
    judge_verdict: JudgeVerdict | None = None
    approval_status: str = "pending_approval"
    immunity_score: float = 0.0
