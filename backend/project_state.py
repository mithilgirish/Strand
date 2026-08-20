"""Persist the latest Guardian submittal so every agent can read the same document."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger

STATE_PATH = Path(__file__).resolve().parents[1] / "data" / "runtime" / "latest_submittal.json"


def save_guardian_result(result: dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        **result,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    STATE_PATH.write_text(json.dumps(payload, default=str), encoding="utf-8")
    logger.info(
        "Project state saved from submittal {} ({} violations)",
        payload.get("submittal_id"),
        len(payload.get("violations") or []),
    )
    try:
        from backend.redis_client import redis_client

        redis_client.delete("scheduler:latest")
        for key in redis_client.keys("oracle:*"):
            redis_client.delete(key)
    except Exception as exc:
        logger.debug("Could not bust agent caches after submittal save: {}", exc)


def load_latest() -> dict[str, Any] | None:
    if not STATE_PATH.exists():
        return None
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to read latest submittal state: {}", exc)
        return None


def ncrs_from_submittal() -> list[dict[str, Any]]:
    state = load_latest()
    if not state:
        return []
    rows = []
    for violation in state.get("violations") or []:
        unit = violation.get("unit") or ""
        rows.append(
            {
                "ncr_id": f"NCR-{violation.get('id') or violation.get('parameter')}",
                "title": f"{violation.get('parameter')} deviation",
                "description": (
                    f"{violation.get('parameter')}: actual {violation.get('actual')}{unit} "
                    f"vs required {violation.get('required')}{unit}"
                ),
                "equipment_tag": violation.get("submittal_id") or state.get("submittal_id") or "CT-01",
                "step_id": str(violation.get("section") or violation.get("parameter") or ""),
                "transcript": (
                    f"{violation.get('parameter')}: actual {violation.get('actual')}{unit} "
                    f"vs required {violation.get('required')}{unit}"
                ),
                "r0_score": float(violation.get("r0_score") or state.get("r0_max") or 0),
                "severity": _severity(violation.get("severity")),
                "mitigation": "Resubmit compliant documentation or request a spec variance.",
                "raised_by": "guardian",
                "timestamp": state.get("saved_at") or "",
                "status": "open",
                "source": "submittal",
            }
        )
    return rows


def shipments_from_submittal() -> list[dict[str, Any]]:
    state = load_latest()
    if not state:
        return []
    violations = state.get("violations") or []
    submittal_id = state.get("submittal_id") or "SUB-UNKNOWN"
    r0 = float(state.get("r0_max") or 0)
    has_fail = bool(violations)
    params = state.get("extracted_parameters") or {}
    vendor = "Vendor (submittal)"
    equipment = "EQ-CT-01"
    lowered = json.dumps(params).lower()
    if "ups" in lowered:
        equipment = "EQ-UPS-01"
    elif "generator" in lowered or "fuel" in lowered:
        equipment = "EQ-GEN-01"
    return [
        {
            "shipment_id": f"SHIP-{submittal_id}",
            "equipment_tag": equipment,
            "supplier_id": f"SUPP-{submittal_id}",
            "supplier_name": vendor,
            "supplier_tier": 1,
            "supplier_risk_score": round(min(0.95, 0.15 + (r0 / 10.0) * 0.75), 2) if has_fail else 0.12,
            "delay_days": int(round(min(21, max(0, r0 * 2.2)))) if has_fail else 0,
            "risk_flag": has_fail and r0 >= 2.5,
            "current_status": "Raw Material Shortage" if has_fail else "on_track",
            "lat": 19.076,
            "lng": 72.877,
            "expected_delivery": datetime.now(timezone.utc).date().isoformat(),
            "origin_port": "Vendor factory",
            "destination_port": "JNPT Mumbai",
            "r0_max": r0,
            "source": "submittal",
        }
    ]


def overlay_scheduler(result: dict[str, Any]) -> dict[str, Any]:
    """Replace CSV schedule risk with tasks derived from the latest submittal."""
    state = load_latest()
    if not state:
        return result
    r0 = float(state.get("r0_max") or 0)
    violations = state.get("violations") or []
    submittal_id = state.get("submittal_id") or "SUB-UNKNOWN"
    tasks: list[dict[str, Any]] = []
    for index, violation in enumerate(violations):
        severity = _severity(violation.get("severity"))
        param = str(violation.get("parameter") or f"parameter-{index + 1}")
        score = float(violation.get("r0_score") or r0 or 0)
        delay_prob = round(min(0.95, 0.35 + (score / 10.0) * 0.55), 2)
        tasks.append(
            {
                "task_id": f"T-SUB-{index + 1:02d}",
                "task_name": f"Clear {param} deviation on {submittal_id}",
                "delay_probability": delay_prob,
                "r0_score": score,
                "severity": severity,
                "discipline": "Mechanical",
                "status": "at_risk",
                "on_critical_path": True,
                "expected_delay_days": max(1, int(round(score))) if score >= 1 else 0,
                "downstream_count": max(0, len(violations) - index - 1),
                "downstream_task_ids": [],
                "end_date": datetime.now(timezone.utc).date().isoformat(),
                "equipment_tag": violation.get("submittal_id") or submittal_id,
                "source": "submittal",
            }
        )
    if not tasks:
        tasks = [
            {
                "task_id": "T-SUBMITTAL",
                "task_name": f"Install / commission {submittal_id}",
                "delay_probability": 0.2 if r0 <= 0 else 0.85,
                "r0_score": r0,
                "severity": "Critical" if r0 >= 5 else "Major",
                "discipline": "Mechanical",
                "status": "at_risk" if r0 > 0 else "on_track",
                "on_critical_path": True,
                "expected_delay_days": 7 if r0 > 0 else 0,
                "downstream_count": 0,
                "downstream_task_ids": [],
                "end_date": datetime.now(timezone.utc).date().isoformat(),
                "equipment_tag": submittal_id,
                "source": "submittal",
            }
        ]
    tasks.sort(key=lambda task: (task.get("r0_score", 0), task.get("delay_probability", 0)), reverse=True)
    scores = {task.get("task_id"): task.get("r0_score", 0) for task in tasks if task.get("task_id")}
    result["at_risk_tasks"] = tasks
    result["critical_path"] = [task.get("task_id") for task in tasks]
    result["r0_scores"] = scores
    result["total_tasks"] = len(tasks)
    result["at_risk_count"] = len(tasks)
    result["source"] = "submittal"
    result["degraded"] = False
    result["provenance_note"] = f"Schedule risk derived from vendor submittal {submittal_id}"
    return result


def dashboard_rows(query: str) -> list[dict[str, Any]]:
    state = load_latest()
    if not state:
        return []
    q = (query or "").lower()
    violations = state.get("violations") or []
    r0 = float(state.get("r0_max") or 0)
    submittal_id = state.get("submittal_id")
    if "r0" in q:
        status = "Critical" if r0 >= 5 else ("Moderate" if r0 >= 2.5 else "Low")
        return [{"primary_metric": r0, "value": r0, "scale": "R0 Risk Index", "status": status, "submittal_id": submittal_id}]
    if "telemetry" in q or "thermal" in q or "temp" in q:
        return _thermal_series(state)
    if "count(" in q or "open_ncr" in q or "delayed_count" in q:
        return [{"value": len(violations), "delayed_count": len(violations), "open_ncrs": len(violations)}]
    if "contractor" in q:
        return [{"name": "Vendor (submittal)", "count": len(violations) or 1}]
    if "ncr" in q or "status" in q:
        buckets = {"Critical": 0, "Major": 0, "Minor": 0}
        for violation in violations:
            buckets[_severity(violation.get("severity"))] += 1
        return [{"name": name, "value": count} for name, count in buckets.items()]
    if "shipment" in q or "logistics" in q or "equipment" in q:
        return [
            {
                "Equipment": ship.get("equipment_tag"),
                "Carrier": ship.get("supplier_name"),
                "ETA": ship.get("expected_delivery"),
                "Status": ship.get("current_status"),
            }
            for ship in shipments_from_submittal()
        ]
    rows = []
    for violation in violations:
        rows.append(
            {
                "Code": submittal_id,
                "Parameter": violation.get("parameter"),
                "Required": violation.get("required"),
                "Actual": violation.get("actual"),
                "Unit": violation.get("unit"),
                "R0": violation.get("r0_score"),
                "Severity": _severity(violation.get("severity")),
            }
        )
    return rows or [
        {
            "metric": submittal_id,
            "status": "analyzed",
            "value": len(violations),
        }
    ]


def _thermal_series(state: dict[str, Any]) -> list[dict[str, Any]]:
    violations = state.get("violations") or []
    picked = None
    for violation in violations:
        name = str(violation.get("parameter") or "").lower()
        if any(token in name for token in ("temp", "ambient", "cooling", "thermal", "chill")):
            picked = violation
            break
    picked = picked or (violations[0] if violations else None)
    if not picked:
        return [{"date": "Submittal", "value": 0, "threshold": 0, "predicted": 0}]
    try:
        actual = float(picked.get("actual") or 0)
    except (TypeError, ValueError):
        actual = 0.0
    try:
        required = float(picked.get("required") or actual)
    except (TypeError, ValueError):
        required = actual
    return [
        {"date": "Spec", "value": required, "threshold": required, "predicted": required},
        {"date": "Submittal", "value": actual, "threshold": required, "predicted": actual},
        {"date": "Variance", "value": round(abs(actual - required), 2), "threshold": required, "predicted": required},
    ]


def _severity(value: Any) -> str:
    text = str(value or "Major")
    lowered = text.lower()
    if lowered in {"systemic", "critical"}:
        return "Critical"
    if lowered == "minor":
        return "Minor"
    return "Major"
