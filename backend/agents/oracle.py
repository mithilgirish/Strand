"""Oracle supply-chain intelligence with deterministic offline behaviour."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from loguru import logger

from backend.config import settings
from backend.graph import queries
from backend.graph.client import neo4j_client
from backend.redis_client import redis_client

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATA_PATH = DATA_DIR / "supplier_graph_data.json"
EXTRA_GRAPH_PATHS = [
    DATA_DIR / "test_scenarios" / "clean" / "supplier_graph_clean.json",
    DATA_DIR / "test_scenarios" / "messy" / "supplier_graph_messy.json",
    DATA_DIR / "test_scenarios" / "edge_cases" / "supplier_graph_edge_cases.json",
]


def _load_data() -> dict[str, list[dict[str, Any]]]:
    with DATA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def _merged_catalog() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """Merge all checked-in supplier graphs so Aura-seeded SHIP-C* ids still resolve."""
    suppliers: dict[str, dict[str, Any]] = {}
    shipments: dict[str, dict[str, Any]] = {}
    for path in [DATA_PATH, *EXTRA_GRAPH_PATHS]:
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.debug(f"Oracle catalog skip {path.name}: {exc}")
            continue
        for supplier in payload.get("suppliers", []):
            supplier_id = supplier.get("id") or supplier.get("supplier_id")
            if supplier_id:
                suppliers[supplier_id] = supplier
        for shipment in payload.get("shipments", []):
            shipment_id = shipment.get("id") or shipment.get("shipment_id")
            if shipment_id:
                shipments[shipment_id] = shipment
    return suppliers, shipments


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _normalise_shipment(
    shipment: dict[str, Any],
    suppliers_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    supplier = suppliers_by_id.get(shipment.get("origin_supplier", ""), {})
    normalized = {
        "shipment_id": shipment.get("shipment_id") or shipment.get("id", ""),
        "equipment_tag": shipment.get("equipment_tag", ""),
        "supplier_id": shipment.get("supplier_id") or shipment.get("origin_supplier", ""),
        "supplier_name": shipment.get("supplier_name") or supplier.get("name", "Unknown supplier"),
        "supplier_tier": _safe_int(shipment.get("supplier_tier") or supplier.get("tier", 1), 1),
        "supplier_risk_score": float(supplier.get("risk_score", 0.5)),
        "delay_days": _safe_int(shipment.get("delay_days", 0), 0),
        "risk_flag": bool(shipment.get("risk_flag", False)),
        "current_status": shipment.get("current_status", "on_track"),
        "lat": float(shipment.get("lat") or supplier.get("lat", 0)),
        "lng": float(shipment.get("lng") or supplier.get("lng", 0)),
        "expected_delivery": shipment.get("expected_delivery") or shipment.get("eta", ""),
        "origin_port": shipment.get("origin_port", ""),
        "destination_port": shipment.get("destination_port", ""),
    }

    # Check for approved supplier switch overrides in Redis
    eq_tag = normalized.get("equipment_tag", "")
    if eq_tag:
        try:
            switch_override = redis_client.get_json(f"oracle:approved_switch:{eq_tag}")
            if switch_override and switch_override.get("status") == "approved":
                target_id = switch_override.get("target_supplier_id")
                catalog_suppliers, _ = _merged_catalog()
                target_supp = catalog_suppliers.get(target_id) or suppliers_by_id.get(target_id, {})
                if target_supp:
                    normalized["supplier_id"] = target_id
                    normalized["supplier_name"] = target_supp.get("name", normalized["supplier_name"])
                    normalized["supplier_risk_score"] = float(target_supp.get("risk_score", 0.1))
                    normalized["supplier_tier"] = _safe_int(target_supp.get("tier", 1), 1)
                    normalized["current_status"] = "on_track"
                    normalized["risk_flag"] = False
                    normalized["delay_days"] = 0
                    if target_supp.get("lat") and target_supp.get("lng"):
                        normalized["lat"] = float(target_supp["lat"])
                        normalized["lng"] = float(target_supp["lng"])
        except Exception:
            pass

    return normalized


def _fallback_shipments() -> list[dict[str, Any]]:
    data = _load_data()
    suppliers = {supplier["id"]: supplier for supplier in data.get("suppliers", [])}
    return [_normalise_shipment(shipment, suppliers) for shipment in data.get("shipments", [])]


def get_all_shipments() -> list[dict[str, Any]]:
    """Return graph shipments, or the checked-in deterministic demo dataset."""
    _rows, _source = get_all_shipments_with_source()
    return _rows


def get_all_shipments_with_source() -> tuple[list[dict[str, Any]], str]:
    if settings.DEMO_MODE:
        return _fallback_shipments(), "demo_json"
    catalog_suppliers, _ = _merged_catalog()
    try:
        results = neo4j_client.execute_query(queries.GET_ALL_SHIPMENTS)
        if results and len(results) >= 5:
            return [_normalise_shipment(shipment, catalog_suppliers) for shipment in results], "neo4j"
    except Exception as exc:
        logger.debug(f"Oracle graph unavailable, using local shipments: {exc}")
    return _fallback_shipments(), "demo_json"


def get_at_risk_shipments() -> list[dict[str, Any]]:
    return [shipment for shipment in get_all_shipments() if shipment["risk_flag"] or shipment["delay_days"] > 7]


def build_geojson(shipments: list[dict[str, Any]]) -> dict[str, Any]:
    """Convert normalized shipments to the strict Leaflet GeoJSON contract."""
    features = []
    for shipment in shipments:
        lat = float(shipment.get("lat", 0))
        lng = float(shipment.get("lng", 0))
        if not (-90 <= lat <= 90 and -180 <= lng <= 180) or (lat == 0 and lng == 0):
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "shipment_id": shipment.get("shipment_id", ""),
                    "equipment_tag": shipment.get("equipment_tag", ""),
                    "delay_days": int(shipment.get("delay_days", 0)),
                    "risk_flag": bool(shipment.get("risk_flag", False)),
                    "status": shipment.get("current_status", ""),
                    "supplier_id": shipment.get("supplier_id", ""),
                    "supplier_name": shipment.get("supplier_name", ""),
                    "tier": int(shipment.get("supplier_tier", 1)),
                    "expected_delivery": shipment.get("expected_delivery", ""),
                    "origin_port": shipment.get("origin_port", ""),
                    "destination_port": shipment.get("destination_port", ""),
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def get_geospatial_shipments(project_id: str = "default") -> dict[str, Any]:
    """Return the strict GeoJSON FeatureCollection required by the map."""
    del project_id  # The demo dataset currently represents one project.
    return build_geojson(get_all_shipments())


def _supplier_node(supplier: dict[str, Any]) -> dict[str, Any]:
    risk = float(supplier.get("risk_score", 0.5) or 0.5)
    supplier_id = supplier.get("id") or supplier.get("supplier_id") or "UNKNOWN"
    return {
        "supplier_id": supplier_id,
        "name": supplier.get("name") or supplier.get("supplier_name") or supplier_id,
        "tier": int(supplier.get("tier", 1) or 1),
        "risk_score": round(risk, 2),
        "on_time_rate": round(float(supplier.get("on_time_rate", 0.8) or 0.8), 2),
        "country": supplier.get("country", ""),
        "city": supplier.get("city", ""),
        "status": "critical" if risk >= 0.7 else "warning" if risk >= 0.4 else "healthy",
        "children": [],
    }


def _stable_offset(value: str, size: int) -> int:
    if size == 0:
        return 0
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % size


def get_supply_chain_tree(shipment_id: str) -> dict[str, Any]:
    """Return a deterministic Tier 1/2/3 tree for a shipment.

    Lookup uses the same shipment source as the map (Neo4j or JSON), then
    fills supplier tiers from the merged local catalogs so SHIP-C* ids resolve.
    """
    suppliers_by_id, json_shipments = _merged_catalog()
    live = next((row for row in get_all_shipments() if row.get("shipment_id") == shipment_id), None)
    if live and live.get("source") == "submittal":
        from backend.project_state import load_latest

        latest = load_latest() or {}
        children = []
        for violation in latest.get("violations") or []:
            children.append(
                {
                    "id": str(violation.get("id") or violation.get("parameter") or "violation"),
                    "name": (
                        f"{violation.get('parameter')}: {violation.get('actual')}"
                        f"{violation.get('unit') or ''} vs {violation.get('required')}"
                        f"{violation.get('unit') or ''}"
                    ),
                    "tier": 2,
                    "risk_score": float(violation.get("r0_score") or live.get("supplier_risk_score") or 0),
                    "on_time_rate": 0.0,
                    "country": "",
                    "city": "",
                    "status": "critical"
                    if str(violation.get("severity", "")).lower() in {"critical", "systemic"}
                    else "warning",
                    "children": [],
                }
            )
        return {
            "shipment_id": shipment_id,
            "equipment_tag": live.get("equipment_tag") or "",
            "root": {
                "id": live.get("supplier_id") or shipment_id,
                "name": live.get("supplier_name") or "Vendor (submittal)",
                "tier": 1,
                "risk_score": float(live.get("supplier_risk_score") or 0),
                "on_time_rate": 0.4 if live.get("risk_flag") else 0.9,
                "country": "",
                "city": live.get("origin_port") or "",
                "status": "critical" if live.get("risk_flag") else "healthy",
                "children": children,
            },
        }

    raw = json_shipments.get(shipment_id)
    if live is None and raw is None:
        return {}

    origin_id = ""
    equipment_tag = ""
    if live:
        origin_id = live.get("supplier_id") or ""
        equipment_tag = live.get("equipment_tag") or ""
    if raw:
        origin_id = origin_id or raw.get("origin_supplier") or raw.get("supplier_id") or ""
        equipment_tag = equipment_tag or raw.get("equipment_tag") or ""

    root_supplier = suppliers_by_id.get(origin_id)
    if root_supplier is None:
        root_supplier = {
            "id": origin_id or shipment_id,
            "name": (live or {}).get("supplier_name")
            or (raw or {}).get("supplier_name")
            or origin_id
            or "Unknown supplier",
            "tier": _safe_int((live or {}).get("supplier_tier") or 1, 1),
            "risk_score": float((live or {}).get("supplier_risk_score") or 0.5),
            "on_time_rate": 0.8,
            "country": "",
            "city": "",
        }

    suppliers = list(suppliers_by_id.values())
    tier_2 = [supplier for supplier in suppliers if _safe_int(supplier.get("tier", 0)) == 2]
    tier_3 = [supplier for supplier in suppliers if _safe_int(supplier.get("tier", 0)) == 3]
    tier_2_start = _stable_offset(shipment_id, len(tier_2)) if tier_2 else 0
    selected_tier_2 = [tier_2[(tier_2_start + index) % len(tier_2)] for index in range(min(2, len(tier_2)))]

    root = _supplier_node(root_supplier)
    root["tier"] = 1
    for index, supplier in enumerate(selected_tier_2):
        child = _supplier_node(supplier)
        supplier_key = supplier.get("id") or supplier.get("supplier_id") or str(index)
        tier_3_start = _stable_offset(f"{shipment_id}:{supplier_key}", len(tier_3)) if tier_3 else 0
        child["children"] = [
            _supplier_node(tier_3[(tier_3_start + index + child_index) % len(tier_3)])
            for child_index in range(min(2, len(tier_3)))
        ]
        root["children"].append(child)

    return {
        "shipment_id": shipment_id,
        "equipment_tag": equipment_tag,
        "root": root,
    }


def get_supply_chain(shipment_id: str) -> dict[str, Any]:
    """Compatibility alias for older router callers."""
    return get_supply_chain_tree(shipment_id)


def _alternative_from_supplier(
    supplier: dict[str, Any],
    equipment_tag: str,
    index: int,
) -> dict[str, Any]:
    risk = float(supplier.get("risk_score", 0.5) or 0.5)
    on_time = float(supplier.get("on_time_rate", 0.8) or 0.8)
    match_score = supplier.get("match_score")
    lead_time = supplier.get("lead_time_days") or supplier.get("lead_time")
    return {
        "supplier_id": supplier.get("supplier_id") or supplier.get("id", ""),
        "name": supplier.get("name") or supplier.get("supplier_name") or supplier.get("id", "Unknown supplier"),
        "equipment_tag": supplier.get("equipment_tag") or equipment_tag,
        "tier": _safe_int(supplier.get("tier", 1) or 1, 1),
        "risk_score": round(risk, 2),
        "on_time_rate": round(on_time, 2),
        "match_score": round(float(match_score), 1)
        if match_score is not None
        else round((1 - risk) * 55 + on_time * 45, 1),
        "lead_time_days": int(lead_time) if lead_time is not None else 12 + index * 3,
        "country": supplier.get("country", ""),
        "city": supplier.get("city", ""),
    }


def find_alternative_suppliers(
    equipment_tag: str,
    failing_supplier_id: str = "",
) -> list[dict[str, Any]]:
    """Rank qualified Tier-1 alternatives for a failing equipment supplier."""
    graph_results: list[dict[str, Any]] = []
    try:
        if settings.DEMO_MODE:
            raise RuntimeError("Demo mode uses deterministic supplier rankings")
        results = neo4j_client.execute_query(
            queries.FIND_ALTERNATIVE_SUPPLIERS,
            {"failing_supplier_id": failing_supplier_id, "equipment_tag": equipment_tag},
        )
        if results:
            graph_results = results
    except Exception as exc:
        logger.debug(f"Oracle alternatives graph query unavailable: {exc}")

    suppliers = [
        supplier
        for supplier in _load_data().get("suppliers", [])
        if supplier["id"] != failing_supplier_id and _safe_int(supplier.get("tier", 0)) == 1
    ]
    suppliers.sort(
        key=lambda supplier: (
            float(supplier.get("risk_score", 1)),
            -float(supplier.get("on_time_rate", 0)),
        )
    )
    alternatives = []
    for index, supplier in enumerate(suppliers[:3]):
        alternatives.append(_alternative_from_supplier(supplier, equipment_tag, index))
    if not graph_results:
        return alternatives

    supplemented = [
        _alternative_from_supplier(supplier, equipment_tag, index) for index, supplier in enumerate(graph_results)
    ]
    seen = {supplier.get("supplier_id") for supplier in supplemented}
    for alternative in alternatives:
        if alternative["supplier_id"] not in seen:
            supplemented.append(alternative)
            seen.add(alternative["supplier_id"])
        if len(supplemented) >= 3:
            break
    supplemented.sort(key=lambda supplier: supplier.get("match_score", 0), reverse=True)
    return supplemented[:3]


def _fallback_from_json() -> dict[str, Any]:
    shipments = _fallback_shipments()
    at_risk = [shipment for shipment in shipments if shipment["risk_flag"] or shipment["delay_days"] > 7]
    return {
        "all_shipments": shipments,
        "at_risk_shipments": at_risk,
        "geojson": build_geojson(shipments),
        "total_shipments": len(shipments),
        "at_risk_count": len(at_risk),
    }


async def run_oracle(project_id: str = "default") -> dict[str, Any]:
    from backend.project_state import shipments_from_submittal

    if not shipments_from_submittal():
        cached = redis_client.get_cache(f"oracle:{project_id}")
        if cached:
            return cached

    shipments, source = get_all_shipments_with_source()
    at_risk = [shipment for shipment in shipments if shipment["risk_flag"] or shipment["delay_days"] > 7]
    result = {
        "all_shipments": shipments,
        "at_risk_shipments": at_risk,
        "geojson": build_geojson(shipments),
        "total_shipments": len(shipments),
        "at_risk_count": len(at_risk),
        "source": source,
        "degraded": source not in {"neo4j", "submittal"},
        "provenance_note": (
            "Shipments derived from the latest Guardian vendor submittal."
            if source == "submittal"
            else "Shipments loaded from checked-in supplier_graph_data.json"
            if source == "demo_json"
            else ""
        ),
    }
    if source != "submittal":
        redis_client.set_cache(f"oracle:{project_id}", result)
    return result
