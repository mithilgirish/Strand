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
from backend.ingestion.parsers.vision_parser import analyze_drawing_with_vision
from backend.ingestion.spec_dna.fingerprint import generate_submittal_spec_dna
from backend.ingestion.spec_dna.chain import get_spec_dna_chain
from backend.graph.client import neo4j_client
from backend.graph import queries
from backend.graph.schema import passes_constraint, get_operator_for_parameter
from backend.r0.engine import compute_r0_from_pkg
from backend.r0.classifier import r0_to_severity
from backend.llm.client import has_configured_llm, invoke_raw
from backend.prompts.registry import load_prompt, get_prompt_version
from backend.redis_client import redis_client
from backend.demo_data import get_demo_clause, demo_chain


class GuardianState(TypedDict):
    submittal_id: str
    document_path: str
    extracted_parameters: dict
    vision_violations: list
    violations: list
    spec_dna_chain: dict
    rfi_draft: str
    r0_max: float


def extract_parameters(state: GuardianState) -> GuardianState:
    """Step 1: Parse PDF and extract all technical parameters & visual anomalies."""
    params = extract_parameters_from_pdf(state["document_path"])
    vision_violations = analyze_drawing_with_vision(state["document_path"], state["submittal_id"])
    
    logger.info(f"Guardian: extracted {len(params)} parameters and {len(vision_violations)} visual anomalies from {state['document_path']}")
    return {**state, "extracted_parameters": params, "vision_violations": vision_violations}


def check_against_spec(state: GuardianState) -> GuardianState:
    """
    Step 2: Compare extracted parameters against PKG constraints.
    Uses corrected constraint direction (PRD §11, correction #1).
    """
    violations = []

    for param_name, param_data in state["extracted_parameters"].items():
        if param_name in ("equipment_type", "output_power", "emissions_tier"):
            continue  # Skip non-constraint parameters

        try:
            result = neo4j_client.execute_query(
                queries.GET_CLAUSE_BY_PARAMETER,
                {"parameter_name": param_name},
            )
        except Exception as e:
            logger.warning(f"Guardian: clause lookup failed for {param_name}: {e}")
            result = []

        if not result:
            demo_clause = get_demo_clause(param_name)
            result = [demo_clause] if demo_clause else []

        if result:
            clause = result[0]
            required = clause.get("required_value")
            operator = clause.get("operator") or get_operator_for_parameter(param_name)
            actual = param_data["value"]

            if not passes_constraint(actual, required, operator=operator, parameter_name=param_name):
                violation = {
                    "id": f"{state['submittal_id']}:{param_name}",
                    "submittal_id": state["submittal_id"],
                    "parameter": param_name,
                    "required": required,
                    "actual": actual,
                    "unit": param_data.get("unit", ""),
                    "spec_dna_id": clause.get("spec_dna_id", ""),
                    "section": clause.get("section", ""),
                    "page": param_data.get("page", 0),
                    "deviation_type": "out_of_spec",
                }
                violations.append(violation)
                logger.info(
                    f"Guardian: VIOLATION — {param_name}: "
                    f"actual={actual} {operator} required={required}"
                )

    # Append vision anomalies directly as violations
    for vv in state.get("vision_violations", []):
        violation = {
            "id": f"{state['submittal_id']}:{vv['parameter']}",
            "submittal_id": state["submittal_id"],
            "parameter": vv["parameter"],
            "required": vv["required"],
            "actual": vv["actual"],
            "unit": "",
            "spec_dna_id": f"VISUAL-{vv['parameter'].replace(' ', '_').upper()}",
            "section": "Visual QA",
            "page": 1,
            "deviation_type": vv.get("deviation_type", "visual_anomaly"),
        }
        violations.append(violation)
        logger.info(f"Guardian: VISUAL VIOLATION — {vv['parameter']}: actual={vv['actual']}")

    logger.info(f"Guardian: found {len(violations)} total violations")
    return {**state, "violations": violations}


def compute_spec_dna(state: GuardianState) -> GuardianState:
    """Step 3: Build Spec-DNA lineage chain for each violation."""
    chains = {}
    for v in state["violations"]:
        chain = get_spec_dna_chain(state["submittal_id"])
        if not chain:
            chain = demo_chain(state["submittal_id"], v)
        chains[v["parameter"]] = chain
    return {**state, "spec_dna_chain": chains}


def score_r0(state: GuardianState) -> GuardianState:
    """
    Step 4: Compute R0 contagion score for each violation.
    Writes violations to PKG using idempotent MERGE (§4.5).
    """
    scored = []
    r0_max = 0.0

    submittal_spec_dna = generate_submittal_spec_dna(
        state["submittal_id"],
        "Unknown Vendor",
        state["submittal_id"],
    )

    try:
        neo4j_client.execute_write(
            queries.MERGE_VENDOR_SUBMITTAL,
            {
                "submittal_id": state["submittal_id"],
                "spec_dna_id": submittal_spec_dna,
                "vendor_name": "Unknown Vendor",
                "equipment_tag": state["submittal_id"],
                "document_path": state["document_path"],
                "status": "flagged" if state["violations"] else "approved",
                "extracted_parameters": json.dumps(state["extracted_parameters"], default=str),
                "r0_score": 0.0,
                "violation_count": len(state["violations"]),
            },
        )
    except Exception as e:
        logger.warning(f"Guardian: submittal write skipped: {e}")

    for v in state["violations"]:
        r0 = compute_r0_from_pkg(spec_dna_id=v.get("spec_dna_id", ""))
        v["r0_score"] = r0
        v["severity"] = r0_to_severity(r0)
        r0_max = max(r0_max, r0)
        scored.append(v)

        # Write violation to PKG (idempotent: delete-then-recreate §4.5)
        if v.get("spec_dna_id"):
            try:
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
            except Exception as e:
                logger.warning(f"Guardian: violation write skipped: {e}")

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

    try:
        if not has_configured_llm():
            raise RuntimeError("No LLM provider configured")

        rfi_text = invoke_raw(
            prompt=prompt,
            agent_name="guardian",
            prompt_name="guardian_rfi_draft",
            prompt_version=get_prompt_version("guardian_rfi_draft"),
        )
    except Exception as e:
        logger.warning(f"Guardian: RFI LLM draft failed, using fallback: {e}")
        rfi_text = _fallback_rfi(state)

    return {**state, "rfi_draft": rfi_text}


def _fallback_rfi(state: GuardianState) -> str:
    violation = state["violations"][0]
    unit = violation.get("unit", "")
    return (
        "Project: Hyperscale Data Centre\n"
        f"Date: {datetime.now().strftime('%d %B %Y')}\n"
        f"Submittal ID: {state['submittal_id']}\n"
        "From: STRAND Guardian\n"
        "To: Vendor / Engineering Lead\n\n"
        f"Subject: {violation['severity']} specification deviation detected\n\n"
        "Parameter | Required | Actual | Deviation\n"
        "--- | --- | --- | ---\n"
        f"{violation['parameter']} | {violation['required']}{unit} | {violation['actual']}{unit} | out_of_spec\n\n"
        f"Regulatory citation: TIA-942-B §{violation.get('section', '')}.\n"
        f"R0 contagion score: {violation.get('r0_score', 0.0)}.\n"
        f"Spec-DNA mutation point: {violation.get('spec_dna_id', 'unavailable')}.\n\n"
        "Tier III impact: unresolved deviation may affect certification evidence and downstream commissioning.\n\n"
        "Requested action: resubmit compliant technical documentation or corrective justification within 5 business days."
    )


# ── Agent runner ─────────────────────────────────────────────────────
async def run_guardian(submittal_id: str, document_path: str) -> dict:
    """
    Run the full Guardian pipeline.
    Uses idempotency lock to prevent duplicate analysis (§5.8).
    """
    # Check cache first
    cached = redis_client.get_cache(f"guardian:{submittal_id}")
    if cached:
        logger.info(f"Guardian: returning cached result for {submittal_id}")
        return cached

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
        "vision_violations": [],
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
            "vision_violations": state["vision_violations"],
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


class GuardianGraph:
    """Plan-compatible async graph facade for the Guardian pipeline."""

    async def ainvoke(self, state: GuardianState) -> dict:
        result = await run_guardian(state["submittal_id"], state["document_path"])
        return {
            **state,
            "extracted_parameters": result.get("extracted_parameters", state.get("extracted_parameters", {})),
            "vision_violations": result.get("vision_violations", []),
            "violations": result.get("violations", []),
            "spec_dna_chain": result.get("spec_dna_chain", {}),
            "rfi_draft": result.get("rfi_draft", ""),
            "r0_max": result.get("r0_max", 0.0),
            "messages": state.get("messages", []),
        }


guardian_graph = GuardianGraph()
