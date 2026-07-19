# backend/agents/inspector.py — The Inspector (Commissioning QA) per PRD §6.4
"""
Converts field engineer voice transcripts into structured NCRs.
Per v1.2: NCR status starts as 'pending_approval' (HITL gate).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
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
from backend.redis_client import redis_client


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
CHECKLIST_PATH = DATA_DIR / "commissioning_checklist_generator.json"
AS_BUILT_DIR = DATA_DIR / "as_built_records"


async def process_voice_ncr(
    transcript: str,
    equipment_tag: str,
    step_id: str,
    raised_by: str = "field_engineer",
    tenant_id: str = "default"
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
        try:
            clause_results = neo4j_client.execute_query(
                queries.GET_CLAUSE_BY_PARAMETER,
                {"parameter_name": ncr_data.parameter_name},
            )
            if clause_results:
                spec_dna_ref = clause_results[0].get("spec_dna_id", "")
        except Exception as e:
            logger.warning(f"Inspector: Spec-DNA lookup skipped for {ncr_data.parameter_name}: {e}")

    if not spec_dna_ref:
        spec_dna_ref = generate_ncr_spec_dna(ncr_id, equipment_tag, ncr_data.parameter_name)

    # Step 3: Compute R0
    r0 = compute_r0_from_pkg(spec_dna_id=spec_dna_ref)
    severity = r0_to_severity(r0)

    # Step 4: Write NCR to PKG with pending_approval status (v1.2 HITL)
    try:
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
                "tenant_id": tenant_id
            },
        )

        # Link NCR to clause
        if spec_dna_ref:
            neo4j_client.execute_write(
                queries.NCR_LINK_CLAUSE,
                {"ncr_id": ncr_id, "spec_dna_id": spec_dna_ref},
            )
    except Exception as e:
        logger.warning(f"Inspector: NCR graph write skipped for {ncr_id}: {e}")

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
        "ncr_data": ncr_data.model_dump(),
        "raised_by": raised_by,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mitigation": ncr_data.immediate_action,
        "transcript": transcript,
    }

    redis_client.set_json(f"inspector:ncr:{ncr_id}", result, ttl=86400)
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
    """Generate the 23-step TIA-942 IST commissioning checklist."""
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
        {"step_id": "IST-011", "seq": 11, "desc": "Exhaust backpressure check" if is_gen else "Chilled water bypass valve modulation", "criteria": "Backpressure below 10 kPa at rated output" if is_gen else "Modulates smoothly from 0-100% open", "param": "backpressure" if is_gen else "valve_mod", "expected": 10 if is_gen else "100%", "unit": "kPa" if is_gen else "", "clause": "§6.2.5" if is_gen else "§6.3.5"},
        {"step_id": "IST-012", "seq": 12, "desc": "Emergency Power Off integration", "criteria": "EPO button cuts main contacts within 100ms", "param": "epo_time", "expected": 100, "unit": "ms", "clause": "§9.5.1"},
        {"step_id": "IST-013", "seq": 13, "desc": "Battery charger float voltage", "criteria": "Constant float at 27.2 VDC", "param": "charger_voltage", "expected": 27.2, "unit": "VDC", "clause": "§9.2.3"},
        {"step_id": "IST-014", "seq": 14, "desc": "Pre-heating jacket coolant temperature" if is_gen else "Water treatment chemical concentration", "criteria": "Maintains continuous temperature above 40°C" if is_gen else "Conductivity levels below 1500 uS/cm", "param": "coolant_temp" if is_gen else "water_conductivity", "expected": 40 if is_gen else 1500, "unit": "°C" if is_gen else "uS/cm", "clause": "§6.2.7" if is_gen else "§6.3.8"},
        {"step_id": "IST-015", "seq": 15, "desc": "Phase rotation & voltage balance check", "criteria": "Under 1% voltage unbalance between phases", "param": "voltage_unbalance", "expected": 1, "unit": "%", "clause": "§9.1.5"},
        {"step_id": "IST-016", "seq": 16, "desc": "Fuel filtration system efficiency" if is_gen else "Leak detection sensors functionality", "criteria": "Particulate compliance below ISO 4406 18/16/13" if is_gen else "Triggers alarm upon water presence in under 5s", "param": "fuel_purity" if is_gen else "leak_alarm_time", "expected": "ISO 18/16/13" if is_gen else 5, "unit": "" if is_gen else "s", "clause": "§6.2.9" if is_gen else "§6.3.9"},
        {"step_id": "IST-017", "seq": 17, "desc": "Fire suppression interlocks verification", "criteria": "System shuts down upon simulated release trigger", "param": "fire_interlock", "expected": "Compliant", "unit": "", "clause": "§11.1.2"},
        {"step_id": "IST-018", "seq": 18, "desc": "Local indicator alarms visual audit", "criteria": "All alarm LEDs illuminate during lamp test", "param": "alarm_lamp_test", "expected": "Passed", "unit": "", "clause": "§10.1.1"},
        {"step_id": "IST-019", "seq": 19, "desc": "Cable connection bolt torques", "criteria": "Meets torque requirements per manufacturer spec", "param": "bolt_torque", "expected": "Compliant", "unit": "", "clause": "§9.4.1"},
        {"step_id": "IST-020", "seq": 20, "desc": "Jacket heater safety cutouts check" if is_gen else "Condenser fan speed controller sweep", "criteria": "Trips at 80°C threshold" if is_gen else "VFD sweep from 10Hz to 60Hz without resonance", "param": "heater_trip_temp" if is_gen else "vfd_sweep", "expected": 80 if is_gen else "Passed", "unit": "°C" if is_gen else "", "clause": "§6.2.8" if is_gen else "§6.3.10"},
        {"step_id": "IST-021", "seq": 21, "desc": "Maintenance bypass keylock interlocks", "criteria": "Trapped key operation prevents incorrect switching", "param": "keylock_interlock", "expected": "Secured", "unit": "", "clause": "§9.5.3"},
        {"step_id": "IST-022", "seq": 22, "desc": "Lube oil pressure levels check" if is_gen else "Expansion tank level and pressurization", "criteria": "Exceeds 350 kPa at rated operating speed" if is_gen else "Maintains static pressure at 150 kPa", "param": "oil_pressure" if is_gen else "expansion_pressure", "expected": 350 if is_gen else 150, "unit": "kPa", "clause": "§6.2.4" if is_gen else "§6.3.3"},
        {"step_id": "IST-023", "seq": 23, "desc": "Cooling airflow static pressure", "criteria": "Airflow velocity meets design specification", "param": "airflow_velocity", "expected": "Compliant", "unit": "", "clause": "§6.4.3"},
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


async def get_checklist(equipment_tag: str, tenant_id: str = "default") -> dict:
    """Return the mobile-facing IST checklist loaded from the Phase 3 data source."""
    checklist_id = "IST-23"
    title = f"TIA-942 System Validation Checklist — {equipment_tag.upper()}"
    try:
        with CHECKLIST_PATH.open(encoding="utf-8") as handle:
            data = json.load(handle)
        checklist_id = data.get("checklist_id") or checklist_id
        title = data.get("title") or title
    except Exception as e:
        logger.warning(f"Inspector: checklist data source unavailable, using embedded IST library: {e}")

    steps = generate_checklist(equipment_tag)
    return {
        "checklist_id": checklist_id,
        "equipment_tag": equipment_tag.upper(),
        "checklist_title": title,
        "steps": steps,
    }


def _normalise_step_result(step: dict[str, Any]) -> dict[str, Any]:
    return {
        "step_id": step.get("step_id", ""),
        "sequence": step.get("sequence") or step.get("seq") or 0,
        "description": step.get("description", ""),
        "acceptance_criteria": step.get("acceptance_criteria", ""),
        "status": str(step.get("status", "pending")).lower(),
        "notes": step.get("notes") or "",
        "photo_uri": step.get("photoUri") or step.get("photo_uri") or "",
    }


async def close_checklist_session(
    equipment_tag: str,
    step_results: list[dict[str, Any]],
    closed_by: str = "field_engineer",
    tenant_id: str = "default"
) -> dict:
    """Generate an as-built Markdown record from completed checklist results."""
    if not step_results:
        checklist = await get_checklist(equipment_tag)
        step_results = checklist["steps"]

    steps = [_normalise_step_result(step) for step in step_results]
    pass_count = sum(1 for step in steps if step["status"] == "pass")
    fail_count = sum(1 for step in steps if step["status"] == "fail")
    pending_count = sum(1 for step in steps if step["status"] == "pending")
    now = datetime.now(timezone.utc)
    record_id = f"ABR-{now.strftime('%Y%m%d')}-{uuid4().hex[:5].upper()}"
    generated_at = now.isoformat()

    AS_BUILT_DIR.mkdir(parents=True, exist_ok=True)
    markdown_path = AS_BUILT_DIR / f"{record_id}-{equipment_tag.upper()}.md"
    markdown = _render_as_built_markdown(
        record_id=record_id,
        equipment_tag=equipment_tag.upper(),
        generated_at=generated_at,
        closed_by=closed_by,
        steps=steps,
        pass_count=pass_count,
        fail_count=fail_count,
        pending_count=pending_count,
    )
    markdown_path.write_text(markdown, encoding="utf-8")

    record = {
        "status": "closed" if pending_count == 0 else "closed_with_pending_items",
        "record_id": record_id,
        "as_built_id": record_id,
        "equipment_tag": equipment_tag.upper(),
        "markdown_path": str(markdown_path),
        "pdf_path": None,
        "completed_steps": pass_count + fail_count,
        "total_steps": len(steps),
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pending_count": pending_count,
        "ncr_count": fail_count,
        "generated_at": generated_at,
        "closed_by": closed_by,
    }
    redis_client.set_json(f"inspector:as_built:{equipment_tag.upper()}", record, ttl=86400)
    logger.info(f"Inspector: generated as-built record {record_id} for {equipment_tag.upper()}")
    return record


async def get_latest_as_built(equipment_tag: str, tenant_id: str = "default") -> dict:
    """Return the latest cached as-built record for an equipment tag."""
    record = redis_client.get_json(f"inspector:as_built:{equipment_tag.upper()}")
    return record or {}


async def list_ncrs(tenant_id: str = "default") -> list[dict]:
    """Return NCRs from Neo4j, falling back to recently generated agent cache."""
    try:
        rows = neo4j_client.execute_query(queries.GET_OPEN_NCRS, {"tenant_id": tenant_id})
        if rows:
            return [
                {
                    "ncr_id": row.get("ncr_id", ""),
                    "title": row.get("title", ""),
                    "description": row.get("description", ""),
                    "equipment_tag": row.get("equipment_tag", ""),
                    "step_id": row.get("step_id", ""),
                    "transcript": row.get("description", ""),
                    "r0_score": row.get("r0_score", 0.0),
                    "severity": row.get("severity", "Minor"),
                    "mitigation": "",
                    "raised_by": row.get("raised_by", ""),
                    "timestamp": str(row.get("raised_at", "")),
                    "status": row.get("status", ""),
                }
                for row in rows
            ]
    except Exception as e:
        logger.debug(f"Inspector: NCR graph list unavailable, using cache: {e}")

    ncrs = []
    for key in redis_client.keys("inspector:ncr:*"):
        cached = redis_client.get_json(key)
        if cached:
            ncrs.append(cached)
    return sorted(ncrs, key=lambda ncr: ncr.get("timestamp", ""), reverse=True)


def _render_as_built_markdown(
    record_id: str,
    equipment_tag: str,
    generated_at: str,
    closed_by: str,
    steps: list[dict[str, Any]],
    pass_count: int,
    fail_count: int,
    pending_count: int,
) -> str:
    rows = [
        "| Seq | Step ID | Description | Status | Notes | Photo |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for step in sorted(steps, key=lambda item: item.get("sequence") or 0):
        rows.append(
            "| {sequence} | {step_id} | {description} | {status} | {notes} | {photo_uri} |".format(
                sequence=step.get("sequence", ""),
                step_id=step.get("step_id", ""),
                description=str(step.get("description", "")).replace("|", "\\|"),
                status=str(step.get("status", "")).upper(),
                notes=str(step.get("notes", "")).replace("|", "\\|"),
                photo_uri=str(step.get("photo_uri", "")).replace("|", "\\|"),
            )
        )

    return (
        f"# As-Built Commissioning Record\n\n"
        f"- Record ID: {record_id}\n"
        f"- Equipment Tag: {equipment_tag}\n"
        f"- Generated At: {generated_at}\n"
        f"- Closed By: {closed_by}\n"
        f"- Pass Count: {pass_count}\n"
        f"- Fail Count / NCR Count: {fail_count}\n"
        f"- Pending Count: {pending_count}\n\n"
        "## Checklist Results\n\n"
        + "\n".join(rows)
        + "\n"
    )


async def run_inspector(transcript: str, equipment_tag: str, step_id: str, raised_by: str = "field_engineer") -> dict:
    """Convenience wrapper for the tool registry."""
    return await process_voice_ncr(transcript, equipment_tag, step_id, raised_by)
