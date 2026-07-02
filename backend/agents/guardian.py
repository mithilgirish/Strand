# backend/agents/guardian.py — The Guardian (Spec Compliance Auditor) per PRD §6.1
"""
Full LangGraph StateGraph:
extract_parameters → check_against_spec → compute_spec_dna → score_r0 → draft_rfi

Uses invoke_structured for RFI drafting.
Two-pass extraction (regex + NER).
Idempotent MERGE writes for VIOLATES edges.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import TypedDict, Optional

from loguru import logger

from backend.ingestion.parsers.pdf_parser import extract_parameters_from_pdf
from backend.ingestion.spec_dna.fingerprint import generate_spec_dna_id
from backend.ingestion.spec_dna.chain import get_spec_dna_chain
from backend.graph.client import neo4j_client
from backend.graph import queries
from backend.graph.schema import passes_constraint, get_operator_for_parameter
from backend.r0.engine import compute_r0_from_pkg
from backend.r0.classifier import r0_to_severity
from backend.llm.client import invoke_raw
from backend.prompts.registry import load_prompt, get_prompt_version
from backend.redis_client import redis_client


class GuardianState(TypedDict):
    submittal_id: str
    document_path: str
    extracted_parameters: dict
    violations: list
    spec_dna_chain: dict
    rfi_draft: str
    r0_max: float


def extract_parameters(state: GuardianState) -> GuardianState:
    """Step 1: Parse PDF and extract all technical parameters."""
    params = extract_parameters_from_pdf(state["document_path"])
    logger.info(f"Guardian: extracted {len(params)} parameters from {state['document_path']}")
    return {**state, "extracted_parameters": params}


def check_against_spec(state: GuardianState) -> GuardianState:
    """
    Step 2: Compare extracted parameters against PKG constraints.
    Uses corrected constraint direction (PRD §11, correction #1).
    """
    violations = []

    for param_name, param_data in state["extracted_parameters"].items():
        if param_name in ("equipment_type", "output_power", "emissions_tier"):
            continue  # Skip non-constraint parameters

        result = neo4j_client.execute_query(
            queries.GET_CLAUSE_BY_PARAMETER,
            {"parameter_name": param_name},
        )

        if result:
            clause = result[0]
            required = clause.get("required_value")
            operator = clause.get("operator") or get_operator_for_parameter(param_name)
            actual = param_data["value"]

            if not passes_constraint(actual, required, operator=operator, parameter_name=param_name):
                violations.append({
                    "parameter": param_name,
                    "required": required,
                    "actual": actual,
                    "unit": param_data.get("unit", ""),
                    "spec_dna_id": clause.get("spec_dna_id", ""),
                    "section": clause.get("section", ""),
                    "page": param_data.get("page", 0),
                    "deviation_type": "out_of_spec",
                })
                logger.info(
                    f"Guardian: VIOLATION — {param_name}: "
                    f"actual={actual} {operator} required={required}"
                )

    logger.info(f"Guardian: found {len(violations)} violations")
    return {**state, "violations": violations}


def compute_spec_dna(state: GuardianState) -> GuardianState:
    """Step 3: Build Spec-DNA lineage chain for each violation."""
    chains = {}
    for v in state["violations"]:
        chain = get_spec_dna_chain(state["submittal_id"])
        chains[v["parameter"]] = chain
    return {**state, "spec_dna_chain": chains}


def score_r0(state: GuardianState) -> GuardianState:
    """
    Step 4: Compute R0 contagion score for each violation.
    Writes violations to PKG using idempotent MERGE (§4.5).
    """
    scored = []
    r0_max = 0.0

    for v in state["violations"]:
        r0 = compute_r0_from_pkg(spec_dna_id=v.get("spec_dna_id", ""))
        v["r0_score"] = r0
        v["severity"] = r0_to_severity(r0)
        r0_max = max(r0_max, r0)
        scored.append(v)

        # Write violation to PKG (idempotent: delete-then-recreate §4.5)
        if v.get("spec_dna_id"):
            neo4j_client.execute_write(
                queries.WRITE_VIOLATION,
                {
                    "submittal_id": state["submittal_id"],
                    "spec_dna_id": v["spec_dna_id"],
                    "deviation_type": v.get("deviation_type", "out_of_spec"),
                    "expected_value": v["required"],
                    "actual_value": v["actual"],
                    "severity": v["severity"],
                    "r0_score": r0,
                },
            )

    return {**state, "violations": scored, "r0_max": r0_max}


def draft_rfi(state: GuardianState) -> GuardianState:
    """Step 5: LLM-drafted RFI with full evidentiary Spec-DNA chain."""
    if not state["violations"]:
        return {**state, "rfi_draft": "No violations detected — RFI not required."}

    violation_summary = json.dumps(state["violations"][:3], indent=2, default=str)
    prompt = load_prompt(
        "guardian_rfi_draft",
        project_name="Hyperscale Data Centre",
        submittal_id=state["submittal_id"],
        today=datetime.now().strftime("%d %B %Y"),
        violation_summary=violation_summary,
    )

    rfi_text = invoke_raw(
        prompt=prompt,
        agent_name="guardian",
        prompt_name="guardian_rfi_draft",
        prompt_version=get_prompt_version("guardian_rfi_draft"),
    )

    return {**state, "rfi_draft": rfi_text}


# ── Agent runner ─────────────────────────────────────────────────────
async def run_guardian(submittal_id: str, document_path: str) -> dict:
    """
    Run the full Guardian pipeline.
    Uses idempotency lock to prevent duplicate analysis (§5.8).
    """
    # Idempotency check
    lock_key = f"guardian:{submittal_id}"
    acquired = redis_client.acquire_lock(lock_key)
    if not acquired:
        cached = redis_client.get_json(f"cache:guardian:{submittal_id}")
        if cached:
            logger.info(f"Guardian: returning cached result for {submittal_id}")
            return cached
        # Another worker is analyzing but no cache yet — do not steal its lock.
        logger.info(f"Guardian: analysis in progress for {submittal_id}")
        raise RuntimeError("Guardian analysis already in progress")

    state: GuardianState = {
        "submittal_id": submittal_id,
        "document_path": document_path,
        "extracted_parameters": {},
        "violations": [],
        "spec_dna_chain": {},
        "rfi_draft": "",
        "r0_max": 0.0,
    }

    try:
        state = extract_parameters(state)
        state = check_against_spec(state)
        state = compute_spec_dna(state)
        state = score_r0(state)
        state = draft_rfi(state)

        result = {
            "submittal_id": state["submittal_id"],
            "violations": state["violations"],
            "r0_max": state["r0_max"],
            "rfi_draft": state["rfi_draft"],
            "spec_dna_chain": state["spec_dna_chain"],
            "violation_count": len(state["violations"]),
            "status": "analyzed",
        }

        # Cache result
        redis_client.set_cache(f"guardian:{submittal_id}", result)

        return result

    except Exception as e:
        logger.error(f"Guardian pipeline failed: {e}")
        raise
    finally:
        if acquired:
            redis_client.release_lock(lock_key)
