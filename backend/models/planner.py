# backend/models/planner.py — Planner, Judge, Approval models
from __future__ import annotations
from typing import Optional, Any
from pydantic import BaseModel, model_validator


class PlannerRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class PlannerSubtask(BaseModel):
    agent: str
    action: str
    depends_on: list[str] = []
    result: Optional[dict] = None
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
    judge_verdict: Optional[dict] = None
    approval_id: Optional[str] = None
    status: str = "completed"


class JudgeVerdict(BaseModel):
    """Per PRD §6.6 — independent verification result."""
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
    reason: Optional[str] = None


class ApprovalItem(BaseModel):
    approval_id: str
    action: str
    agent: str
    payload: dict = {}
    status: str = "pending"  # pending | approved | rejected
    created_at: str = ""
    decided_at: Optional[str] = None
    decision_reason: Optional[str] = None


class ExecutiveReportRequest(BaseModel):
    """§8.2 Executive Report Generator."""
    topic: Optional[str] = None
    include_agents: list[str] = []


class ExecutiveReport(BaseModel):
    report_id: str
    title: str = ""
    narrative: str = ""
    agent_summaries: dict[str, dict] = {}
    judge_verdict: Optional[JudgeVerdict] = None
    approval_status: str = "pending_approval"
    immunity_score: float = 0.0
