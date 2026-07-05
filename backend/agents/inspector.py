# backend/agents/inspector.py — The Inspector (Commissioning QA) per PRD §6.4
"""
Converts field engineer voice transcripts into structured NCRs.
Per v1.2: NCR status starts as 'pending_approval' (HITL gate).
"""
from __future__ import annotations

import json
import random
from datetime import datetime
from typing import Optional
from uuid import uuid4

from loguru import logger

from backend.graph.client import neo4j_client
from backend.graph import queries
from backend.ingestion.spec_dna.fingerprint import generate_ncr_spec_dna
from backend.ingestion.spec_dna.chain import trace_spec_dna
from backend.r0.engine import compute_r0_from_pkg
from backend.r0.classifier import r0_to_severity
from backend.llm.client import invoke_structured
from backend.prompts.registry import load_prompt, get_prompt_version
from backend.models.ncr import NcrData


async def process_voice_ncr(
    transcript: str,
    equipment_tag: str,
    step_id: str,
    raised_by: str = "field_engineer",
) -> dict:
    """
    Convert voice observation to structured NCR with Spec-DNA.
    Per v1.2 §6.4: NCR starts as 'pending_approval'.
    """
    ncr_id = f"NCR-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:4].upper()}"

    # Step 1: LLM extraction — voice → structured NCR
    prompt = load_prompt(
        "inspector_ncr_extract",
        transcript=transcript,
        equipment_tag=equipment_tag,
        step_id=step_id,
    )

    try:
        ncr_data = invoke_structured(
            prompt=prompt,
            response_model=NcrData,
            agent_name="inspector",
            prompt_name="inspector_ncr_extract",
            prompt_version=get_prompt_version("inspector_ncr_extract"),
        )
    except Exception as e:
        logger.warning(f"Inspector: LLM extraction failed, using heuristic: {e}")
        ncr_data = _heuristic_ncr(transcript, equipment_tag, step_id)

    # Step 2: Trace Spec-DNA
    spec_dna_ref = ""
    if ncr_data.parameter_name:
        clause_results = neo4j_client.execute_query(
            queries.GET_CLAUSE_BY_PARAMETER,
            {"parameter_name": ncr_data.parameter_name},
        )
        if clause_results:
            spec_dna_ref = clause_results[0].get("spec_dna_id", "")

    if not spec_dna_ref:
        spec_dna_ref = generate_ncr_spec_dna(ncr_id, equipment_tag, ncr_data.parameter_name)

    # Step 3: Compute R0
    r0 = compute_r0_from_pkg(spec_dna_id=spec_dna_ref)
    severity = r0_to_severity(r0)

    # Step 4: Write NCR to PKG with pending_approval status (v1.2 HITL)
    neo4j_client.execute_write(
        queries.MERGE_NCR,
        {
            "ncr_id": ncr_id,
            "title": ncr_data.title,
            "description": ncr_data.description,
            "severity": severity,
            "raised_by": raised_by,
            "equipment_tag": equipment_tag,
            "spec_dna_ref": spec_dna_ref,
            "status": "pending_approval",  # v1.2: HITL gate
            "voice_transcript": transcript,
            "r0_score": r0,
        },
    )

    # Link NCR to clause
    if spec_dna_ref:
        neo4j_client.execute_write(
            queries.NCR_LINK_CLAUSE,
            {"ncr_id": ncr_id, "spec_dna_id": spec_dna_ref},
        )

    result = {
        "ncr_id": ncr_id,
        "title": ncr_data.title,
        "description": ncr_data.description,
        "equipment_tag": equipment_tag,
        "step_id": step_id,
        "severity": severity,
        "r0_score": r0,
        "status": "pending_approval",
        "spec_dna_ref": spec_dna_ref,
        "raised_by": raised_by,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "mitigation": ncr_data.immediate_action,
        "transcript": transcript,
    }

    logger.info(f"Inspector: created NCR {ncr_id} (R0={r0}, severity={severity})")
    return result


def _heuristic_ncr(transcript: str, equipment_tag: str, step_id: str) -> NcrData:
    """Fallback heuristic NCR extraction when LLM is unavailable."""
    return NcrData(
        title=f"Non-conformance on {equipment_tag} at {step_id}",
        description=transcript,
        parameter_name="unknown_parameter",
        actual_value=transcript,
        unit="",
        severity_suggestion="Major",
        immediate_action="Inspect equipment and raise corrective work order.",
    )


def generate_checklist(tag: str) -> list[dict]:
    """Generate a TIA-942 IST 10-step commissioning checklist."""
    is_gen = tag.upper().startswith("GEN")

    steps = [
        {"step_id": "IST-001", "seq": 1, "desc": "Verify physical clearance & foundation compliance", "criteria": "No cracks, standard seismic anchor bolts torque", "param": "bolting_compliance", "expected": "100%", "unit": "", "clause": "§5.2.1"},
        {"step_id": "IST-002", "seq": 2, "desc": "Fuel / fluid levels verification at 100% load" if is_gen else "Verify water circulation flow rates", "criteria": "Consumption within ±5% of design spec (260 L/h)" if is_gen else "Minimum 1200 gpm at full load", "param": "fuel_rate" if is_gen else "water_flow", "expected": 260 if is_gen else 1200, "unit": "L/h" if is_gen else "GPM", "clause": "§6.2.3" if is_gen else "§6.3.1"},
        {"step_id": "IST-003", "seq": 3, "desc": "Acoustic attenuation performance check", "criteria": "Noise levels below 85 dBA at 1 meter", "param": "acoustic_dba", "expected": 85, "unit": "dBA", "clause": "§8.4.1"},
        {"step_id": "IST-004", "seq": 4, "desc": "Structural vibrations monitoring", "criteria": "Velocity peak below 4.5 mm/s", "param": "bearing_vibration", "expected": 4.5, "unit": "mm/s", "clause": "§5.4.2"},
        {"step_id": "IST-005", "seq": 5, "desc": "Thermal threshold performance under peak load", "criteria": "Continuous thermal clearance at 50°C ambient", "param": "thermal_max", "expected": 50, "unit": "°C", "clause": "§6.7.1"},
        {"step_id": "IST-006", "seq": 6, "desc": "Safety shut-off valve timing test", "criteria": "Closes fully in under 2.0 seconds", "param": "cutoff_time", "expected": 2.0, "unit": "s", "clause": "§7.1.3"},
        {"step_id": "IST-007", "seq": 7, "desc": "Earthing ground loop impedance", "criteria": "Resistance below 1.0 Ohm", "param": "ground_resistance", "expected": 1.0, "unit": "Ohm", "clause": "§9.1.1"},
        {"step_id": "IST-008", "seq": 8, "desc": "Control panel telemetry sync", "criteria": "Modbus registers reporting standard values", "param": "telemetry_sync", "expected": "Active", "unit": "", "clause": "§10.2.1"},
        {"step_id": "IST-009", "seq": 9, "desc": "Overcurrent relay trip test", "criteria": "Breaker trips at 120% rating in under 400ms", "param": "trip_time", "expected": 400, "unit": "ms", "clause": "§9.3.2"},
        {"step_id": "IST-010", "seq": 10, "desc": "Ventilation intake dampers operations", "criteria": "Dampers open fully in under 5.0 seconds", "param": "damper_time", "expected": 5.0, "unit": "s", "clause": "§6.4.1"},
    ]

    result = []
    for s in steps:
        result.append({
            "step_id": s["step_id"],
            "sequence": s["seq"],
            "description": s["desc"],
            "acceptance_criteria": s["criteria"],
            "parameter_name": s["param"],
            "expected_value": s["expected"],
            "unit": s["unit"],
            "tia942_clause": s["clause"],
            "status": "pending",
        })

    return result


async def run_inspector(transcript: str, equipment_tag: str, step_id: str, raised_by: str = "field_engineer") -> dict:
    """Convenience wrapper for the tool registry."""
    return await process_voice_ncr(transcript, equipment_tag, step_id, raised_by)
