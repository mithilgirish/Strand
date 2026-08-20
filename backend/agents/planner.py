# backend/agents/planner.py — The Planner (Orchestration Layer) per PRD §7
"""
Routes user requests to agents.
- LLM path: classify_intent → decompose → execute → judge → approve → synthesize

Per v1.2 §14.4: Write operations go through HITL approval gate.
Cross-agent trigger: Guardian r0_max > 5.0 → Scheduler re-check.
"""
from __future__ import annotations

import asyncio
import json
from typing import Optional
from loguru import logger  # type: ignore

from backend.llm.client import invoke_structured, invoke_raw
from backend.prompts.registry import load_prompt, get_prompt_version
from backend.models.planner import IntentClassification, PlannerResponse
from backend.agents.guardian import run_guardian
from backend.agents.scheduler import run_scheduler
from backend.agents.oracle import run_oracle
from backend.agents.inspector import run_inspector
from backend.agents.brain import run_brain
from backend.agents.judge import run_judge
from backend.approvals.manager import approval_manager


# ── Fast-path event routing ────────────────────────────────────────
EVENT_ROUTING = {
    "submittal_upload": "guardian",
    "schedule_update": "scheduler",
    "shipment_update": "oracle",
    "voice_ncr": "inspector",
    "query": "brain",
}

AGENT_CAPABILITIES = {
    "guardian": ["submittal_compliance", "rfi_drafting", "spec_dna_trace", "pkg_r0"],
    "scheduler": ["critical_path", "delay_forecast", "task_r0", "mitigation_suggestions"],
    "oracle": ["shipment_geojson", "supply_chain_tree", "alternative_suppliers"],
    "inspector": ["voice_ncr", "commissioning_checklist", "as_built_closeout"],
    "brain": ["hybrid_rag", "citations", "graph_context"],
    "judge": ["groundedness_review", "approval_recommendation"],
}


# ── Agent runner map ─────────────────────────────────────────────────
AGENT_RUNNERS = {
    "guardian": run_guardian,
    "scheduler": run_scheduler,
    "oracle": run_oracle,
    "inspector": run_inspector,
    "brain": run_brain,
    "judge": run_judge,
}


async def run_planner(query: str, session_id: Optional[str] = None) -> dict:
    """
    Main Planner entry point.

    1. Classify user intent via LLM
    2. Decompose into subtasks
    3. Execute subtasks (parallel where possible)
    4. Judge output (if write)
    5. Return synthesized response

    Per v1.2: Write operations create pending approvals.
    """
    # Step 1: Classify intent
    intent = await _classify_intent(query)

    logger.info("Planner: intent={}, agents={}, write={}", intent.intent, intent.agents, intent.requires_write)

    # Step 2: Execute subtasks
    subtask_results = []
    for subtask in intent.subtasks:
        agent_name = subtask.agent
        runner = AGENT_RUNNERS.get(agent_name)

        if not runner:
            subtask_results.append({
                "agent": agent_name,
                "status": "failed",
                "error": f"Unknown agent: {agent_name}",
            })
            continue

        try:
            result = await _execute_agent(agent_name, runner, query)
            subtask_results.append({
                "agent": agent_name,
                "status": "completed",
                "result": result,
            })

            if agent_name == "guardian" and isinstance(result, dict):
                r0_max = result.get("r0_max", 0)
                if r0_max > 5.0 and "scheduler" not in intent.agents:
                    logger.info("Planner: R0={} > 5.0, triggering Scheduler re-check", r0_max)
                    try:
                        sched_result = await run_scheduler()
                        subtask_results.append({
                            "agent": "scheduler",
                            "status": "completed",
                            "result": sched_result,
                            "triggered_by": f"guardian_r0_{r0_max}",
                        })
                    except Exception as sched_e:
                        logger.error("Planner: triggered scheduler re-check failed: {}", sched_e)
                        subtask_results.append({
                            "agent": "scheduler",
                            "status": "failed",
                            "error": str(sched_e),
                            "triggered_by": f"guardian_r0_{r0_max}",
                        })

        except Exception as e:
            logger.error("Planner: {} execution failed: {}", agent_name, e)
            subtask_results.append({
                "agent": agent_name,
                "status": "failed",
                "error": str(e),
            })

    # Step 3: Judge output (if it contains LLM-generated content)
    judge_verdict = None
    if any(r.get("status") == "completed" for r in subtask_results):
        try:
            first_success = next(r for r in subtask_results if r.get("status") == "completed")
            agent_source = first_success.get("agent", "unknown")
            judge_verdict = await run_judge(
                content=first_success.get("result", {}),
                content_type=_infer_content_type([agent_source]),
                agent_source=agent_source,
            )
        except Exception as e:
            logger.warning("Planner: Judge failed: {}", e)

    # Step 4: Approval Gate (if write operation)
    approval_id = None
    if intent.requires_write:
        try:
            # We determine action based on the agent involved, e.g. create_ncr or send_rfi
            action = "create_ncr" if "inspector" in intent.agents else "send_rfi"
            payload = {"query": query, "subtask_results": subtask_results}
            if action == "create_ncr":
                for r in subtask_results:
                    if r.get("agent") == "inspector" and isinstance(r.get("result"), dict):
                        payload["ncr_id"] = r["result"].get("ncr_id")
                        break
            approval_id = approval_manager.create_approval(
                action=action,
                payload=payload,
                agent="planner",
            )
            logger.info("Planner: pending approval {} created for {}", approval_id, action)
        except Exception as e:
            logger.error("Planner: failed to create approval: {}", e)
            raise

    # Step 5: Build response
    response = _synthesize_response(query, intent, subtask_results, judge_verdict, approval_id)

    return response


async def _classify_intent(query: str) -> IntentClassification:
    """Classify user intent via LLM."""
    prompt = load_prompt("planner_intent", user_request=query)

    try:
        return invoke_structured(
            prompt=prompt,
            response_model=IntentClassification,
            agent_name="planner",
            prompt_name="planner_intent",
            prompt_version=get_prompt_version("planner_intent"),
        )
    except Exception as e:
        logger.warning("Planner: intent classification failed: {}", e)
        # Fallback: route to Brain for general queries
        return IntentClassification(
            intent="general_query",
            agents=["brain"],
            subtasks=[{"agent": "brain", "action": query, "depends_on": []}],
            requires_write=False,
            confidence="Low",
        )


async def _execute_agent(agent_name: str, runner, query: str) -> dict:
    """Execute a single agent with appropriate kwargs and retry logic."""
    max_retries = 1
    for attempt in range(max_retries + 1):
        try:
            if agent_name == "guardian":
                # Planner chat has no PDF — do not run Guardian on an empty path.
                result = await run_brain(question=query)
                if isinstance(result, dict):
                    result["provenance_note"] = "Planner skipped Guardian (no submittal PDF). Routed to Brain."
                    result["degraded"] = True
                    result["routed_from"] = "guardian"
                return result
            elif agent_name == "scheduler":
                return await runner()
            elif agent_name == "oracle":
                return await runner()
            elif agent_name == "inspector":
                return await runner(transcript=query, equipment_tag="UNKNOWN", step_id="QRY")
            elif agent_name == "brain":
                return await runner(question=query)
            elif agent_name == "judge":
                return await runner(content={"query": query}, content_type="report")
            else:
                return {}
        except Exception as e:
            if attempt < max_retries:
                logger.warning("Planner: Retrying {} after failure: {}", agent_name, e)
                await asyncio.sleep(1)
            else:
                raise e


def _infer_content_type(agents: list[str]) -> str:
    """Infer the content type for the Judge based on which agents were used."""
    if "guardian" in agents:
        return "violations"
    if "inspector" in agents:
        return "ncr"
    return "report"


def _synthesize_response(
    query: str,
    intent: IntentClassification,
    subtask_results: list[dict],
    judge_verdict: Optional[dict],
    approval_id: Optional[str] = None,
) -> dict:
    """Synthesize the final planner response."""
    # Build a narrative from subtask results
    response_parts = []
    
    # Identify missing tasks for replanning context
    executed_agents = [r["agent"] for r in subtask_results]
    missing_agents = [task.agent for task in intent.subtasks if task.agent not in executed_agents]
    if missing_agents:
        logger.warning("Planner: Missing agent execution for {} - proceeding with partial results", missing_agents)
        response_parts.append(f"*(Note: Results for {', '.join(missing_agents)} are incomplete and will be retried later.)*")

    for r in subtask_results:
        if r.get("status") == "completed":
            result = r.get("result", {})
            if r["agent"] == "brain" and isinstance(result, dict) and result.get("answer"):
                response_parts.append(result["answer"])
                continue
            response_parts.append(f"**{r['agent'].title()}**: Completed successfully.")
        else:
            response_parts.append(f"**{r['agent'].title()}**: Failed — {r.get('error', 'unknown')}")

    if approval_id:
        response_parts.append(f"**Action requires approval**: A pending approval request ({approval_id}) has been created.")

    synthesized = "\n".join(response_parts) if response_parts else "No agents were invoked."
    completed_count = sum(1 for r in subtask_results if r.get("status") == "completed")

    return {
        "query": query,
        "intent": intent.intent,
        "response": synthesized,
        "answer": synthesized,
        "synthesized_output": synthesized,
        "subtask_results": subtask_results,
        "judge_verdict": judge_verdict,
        "approval_id": approval_id,
        "confidence_score": round(0.45 + min(0.5, completed_count * 0.2), 2),
        "status": "pending_approval" if approval_id else "completed",
    }
