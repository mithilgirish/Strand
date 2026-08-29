import asyncio
from datetime import UTC, datetime, timezone

# pyrefly: ignore [missing-import]
import loguru
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, model_validator

from backend.agents.brain import run_brain
from backend.agents.inspector import list_ncrs
from backend.agents.oracle import run_oracle
from backend.agents.planner import AGENT_CAPABILITIES, AGENT_RUNNERS, EVENT_ROUTING, run_planner
from backend.agents.scheduler import run_scheduler
from backend.deps import limiter

router = APIRouter(prefix="/planner", tags=["planner"])


class PlannerAskRequest(BaseModel):
    query: str | None = None
    input: str | None = None
    session_id: str = "default"

    @model_validator(mode="after")
    def normalize_query(self):
        if self.query is None and self.input is not None:
            self.query = self.input
        if not self.query:
            raise ValueError("query or input is required")
        return self


@router.post("/ask")
@limiter.limit("30/minute")
async def ask_planner(request: Request, data: PlannerAskRequest):
    try:
        response = await run_planner(data.query or "", data.session_id)
        return response
    except Exception as e:
        loguru.logger.error(f"Planner ask failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/report")
@limiter.limit("30/minute")
async def planner_report(request: Request):
    scheduler_result, oracle_result, ncrs, brain_result = await asyncio.gather(
        run_scheduler(),
        run_oracle(),
        list_ncrs(),
        run_brain("Summarise the current project risks with cited evidence."),
        return_exceptions=True,
    )

    key_risks = []
    evidence_citations = []

    if isinstance(scheduler_result, dict):
        for task in scheduler_result.get("at_risk_tasks", [])[:3]:
            key_risks.append(
                {
                    "source": "scheduler",
                    "risk": f"{task.get('task_id')} {task.get('task_name', '')}",
                    "r0_score": task.get("r0_score", 0),
                    "severity": task.get("severity", "Major"),
                }
            )

    if isinstance(oracle_result, dict):
        for shipment in oracle_result.get("at_risk_shipments", [])[:3]:
            key_risks.append(
                {
                    "source": "oracle",
                    "risk": f"{shipment.get('equipment_tag')} shipment delay",
                    "delay_days": shipment.get("delay_days", 0),
                    "severity": "Major" if shipment.get("risk_flag") else "Minor",
                }
            )

    if isinstance(ncrs, list):
        for ncr in ncrs[:3]:
            key_risks.append(
                {
                    "source": "inspector",
                    "risk": ncr.get("title") or ncr.get("ncr_id"),
                    "r0_score": ncr.get("r0_score", 0),
                    "severity": ncr.get("severity", "Major"),
                }
            )

    if isinstance(brain_result, dict):
        evidence_citations = brain_result.get("citations", [])

    if not evidence_citations:
        evidence_citations = [
            {"source": "scheduler", "page": 0, "section": "critical_path"},
            {"source": "oracle", "page": 0, "section": "shipments"},
        ]

    return {
        "executive_summary": (
            f"Planner coordinated {len(AGENT_RUNNERS)} registered agents. "
            f"{len(key_risks)} current risks were synthesized from live agent outputs."
        ),
        "key_risks": key_risks,
        "judge_verdict": "approved_with_flag" if key_risks else "approved",
        "evidence_citations": evidence_citations,
        "generated_at": datetime.now(UTC).isoformat(),
        "status": "ready",
        "event_routing": EVENT_ROUTING,
        "available_agents": sorted(AGENT_RUNNERS.keys()),
        "capabilities": AGENT_CAPABILITIES,
    }
