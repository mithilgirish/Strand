"""Persist the latest Guardian submittal so every agent can read the same document."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger

STATE_PATH = Path(__file__).resolve().parents[1] / "data" / "runtime" / "latest_submittal.json"
OUTBOX_PATH = Path(__file__).resolve().parents[1] / "data" / "runtime" / "outbox.json"


def save_guardian_result(result: dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        **result,
        "saved_at": datetime.now(UTC).isoformat(),
    }
    STATE_PATH.write_text(json.dumps(payload, default=str), encoding="utf-8")
    logger.info(
        "Project state saved from submittal {} ({} violations)",
        payload.get("submittal_id"),
        len(payload.get("violations") or []),
    )
    queue_rfi_from_submittal(payload)
    try:
        from backend.redis_client import redis_client

        redis_client.delete_cache("scheduler:latest")
        redis_client.delete_cache("scheduler:latest:v2")
        for key in redis_client.keys("cache:oracle:*"):
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


def load_outbox() -> list[dict[str, Any]]:
    if not OUTBOX_PATH.exists():
        return []
    try:
        data = json.loads(OUTBOX_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception as exc:
        logger.warning("Failed to read outbox state: {}", exc)
        return []


def upsert_outbox_item(item: dict[str, Any]) -> None:
    rows = load_outbox()
    item_id = str(item.get("violation_id") or item.get("id") or "")
    rows = [row for row in rows if str(row.get("violation_id") or row.get("id") or "") != item_id]
    rows.append(item)
    OUTBOX_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTBOX_PATH.write_text(json.dumps(rows, default=str), encoding="utf-8")


def queue_rfi_from_submittal(state: dict[str, Any] | None = None) -> dict[str, Any] | None:
    """Persist the Guardian RFI letter so Outbox survives Redis restarts."""
    state = state or load_latest()
    if not state:
        return None
    rfi = str(state.get("rfi_draft") or "").strip()
    if not rfi or rfi.lower().startswith("no violations"):
        return None
    violations = state.get("violations") or []
    first = violations[0] if violations else {}
    item = {
        "violation_id": first.get("id") or state.get("submittal_id"),
        "tenant_id": state.get("tenant_id") or "default",
        "status": "queued",
        "approved_at": state.get("saved_at") or datetime.now(UTC).isoformat(),
        "delivery_channel": "System Outbox",
        "message": rfi,
        "submittal_id": state.get("submittal_id"),
        "parameter": first.get("parameter"),
        "spec_clause": first.get("section"),
        "contractor_recipient": "Vendor (submittal)",
        "source": "submittal",
    }
    existing = next(
        (
            row
            for row in load_outbox()
            if str(row.get("violation_id")) == str(item["violation_id"])
            and row.get("status") in {"approved_sent", "approved"}
        ),
        None,
    )
    if existing:
        return existing
    upsert_outbox_item(item)
    return item


def outbox_for_tenant(tenant_id: str) -> list[dict[str, Any]]:
    queue_rfi_from_submittal()
    latest = load_latest() or {}
    latest_submittal_id = latest.get("submittal_id")
    rows = []
    for item in load_outbox():
        item_tenant = item.get("tenant_id") or "default"
        shared_submittal = bool(latest_submittal_id) and item.get("submittal_id") == latest_submittal_id
        if item_tenant == tenant_id or item_tenant == "default" or shared_submittal:
            rows.append(item)
    rows.sort(key=lambda item: item.get("approved_at") or "", reverse=True)
    return rows


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
            "expected_delivery": datetime.now(UTC).date().isoformat(),
            "origin_port": "Vendor factory",
            "destination_port": "JNPT Mumbai",
            "r0_max": r0,
            "source": "submittal",
        }
    ]


def overlay_scheduler(result: dict[str, Any]) -> dict[str, Any]:
    """Annotate CPM schedule risk with the latest Guardian submittal. Never swap task IDs."""
    from backend.r0.classifier import r0_to_severity

    state = load_latest()
    if not state:
        return result

    violations = state.get("violations") or []
    submittal_id = state.get("submittal_id") or "SUB-UNKNOWN"
    tag_scores, discipline_scores = _submittal_match_scores(state)

    enriched_count = 0
    for task in result.get("at_risk_tasks") or []:
        tag = str(task.get("equipment_tag") or "").strip()
        discipline = str(task.get("discipline") or "").strip()
        boost = max(tag_scores.get(tag, 0.0), discipline_scores.get(discipline, 0.0))
        if boost <= 0:
            continue
        old_r0 = float(task.get("r0_score") or 0)
        new_r0 = round(min(10.0, old_r0 + min(2.0, boost * 0.35)), 2)
        task["r0_score"] = new_r0
        task["severity"] = r0_to_severity(new_r0)
        task["delay_probability"] = round(min(0.99, float(task.get("delay_probability") or 0) + 0.05), 2)
        task["submittal_linked"] = True
        task["submittal_id"] = submittal_id
        task["source"] = "submittal_enriched"
        enriched_count += 1

    result["at_risk_tasks"] = sorted(
        result.get("at_risk_tasks") or [],
        key=lambda task: (task.get("r0_score", 0), task.get("delay_probability", 0)),
        reverse=True,
    )
    result["r0_scores"] = {
        task.get("task_id"): task.get("r0_score", 0) for task in result["at_risk_tasks"] if task.get("task_id")
    }
    result["at_risk_count"] = len(result["at_risk_tasks"])
    result["submittal_id"] = submittal_id
    result["submittal_enriched"] = enriched_count > 0
    if violations:
        result["source"] = "submittal_enriched" if enriched_count else result.get("source")
        result["degraded"] = False
        result["provenance_note"] = (
            f"CPM schedule enriched with {len(violations)} Guardian violations from {submittal_id}"
            if enriched_count
            else f"Guardian submittal {submittal_id} analyzed ({len(violations)} violations); no schedule tags matched"
        )
    else:
        result["provenance_note"] = f"Guardian submittal {submittal_id} analyzed with 0 violations"

    return result


def _submittal_match_scores(state: dict[str, Any]) -> tuple[dict[str, float], dict[str, float]]:
    """Map Guardian violation parameters onto schedule equipment tags / disciplines."""
    tag_scores: dict[str, float] = {}
    discipline_scores: dict[str, float] = {}
    rules: list[tuple[tuple[str, ...], list[str], list[str]]] = [
        (
            ("cooling", "chill", "thermal", "ambient", "hvac", "crah", "temperature"),
            ["CT-01", "EQ-CH-01", "EQ-CRAH-01"],
            ["HVAC"],
        ),
        (("pdu",), ["EQ-PDU-01", "EQ-PDU-02"], ["Electrical"]),
        (("cable", "derating"), ["EQ-HV-01", "EQ-LV-01", "EQ-PDU-01", "EQ-PDU-02", "EQ-TX-01"], []),
        (("ups", "battery"), ["EQ-UPS-01", "EQ-BAT-01"], []),
        (("generator", "fuel"), ["EQ-GEN-01"], []),
        (("floor", "loading"), [], ["Civil", "Structural"]),
    ]
    extracted = state.get("extracted_parameters") or {}
    tokens: list[tuple[str, float]] = []
    for violation in state.get("violations") or []:
        tokens.append((str(violation.get("parameter") or "").lower(), float(violation.get("r0_score") or 0)))
    for name, payload in extracted.items():
        value = payload.get("value") if isinstance(payload, dict) else payload
        tokens.append((str(name).lower(), 1.0 if value not in (None, "") else 0.0))
    for token, score in tokens:
        if not token or score <= 0:
            continue
        for keys, tags, disciplines in rules:
            if any(key in token for key in keys):
                for tag in tags:
                    tag_scores[tag] = max(tag_scores.get(tag, 0.0), score)
                for discipline in disciplines:
                    discipline_scores[discipline] = max(discipline_scores.get(discipline, 0.0), score)
    return tag_scores, discipline_scores


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
        return [
            {
                "primary_metric": r0,
                "value": r0,
                "scale": "R0 Risk Index",
                "status": status,
                "submittal_id": submittal_id,
            }
        ]
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
