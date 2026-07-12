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


DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "supplier_graph_data.json"


def _load_data() -> dict[str, list[dict[str, Any]]]:
    with DATA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def _normalise_shipment(
    shipment: dict[str, Any],
    suppliers_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    supplier = suppliers_by_id.get(shipment.get("origin_supplier", ""), {})
    return {
        "shipment_id": shipment.get("shipment_id") or shipment.get("id", ""),
        "equipment_tag": shipment.get("equipment_tag", ""),
        "supplier_id": shipment.get("supplier_id") or shipment.get("origin_supplier", ""),
        "supplier_name": shipment.get("supplier_name") or supplier.get("name", "Unknown supplier"),
        "supplier_tier": int(shipment.get("supplier_tier") or supplier.get("tier", 1)),
        "supplier_risk_score": float(supplier.get("risk_score", 0.5)),
        "delay_days": int(shipment.get("delay_days", 0)),
        "risk_flag": bool(shipment.get("risk_flag", False)),
        "current_status": shipment.get("current_status", "on_track"),
        "lat": float(shipment.get("lat") or supplier.get("lat", 0)),
        "lng": float(shipment.get("lng") or supplier.get("lng", 0)),
        "expected_delivery": shipment.get("expected_delivery") or shipment.get("eta", ""),
        "origin_port": shipment.get("origin_port", ""),
        "destination_port": shipment.get("destination_port", ""),
    }


def _fallback_shipments() -> list[dict[str, Any]]:
    data = _load_data()
    suppliers = {supplier["id"]: supplier for supplier in data.get("suppliers", [])}
    return [_normalise_shipment(shipment, suppliers) for shipment in data.get("shipments", [])]


def get_all_shipments() -> list[dict[str, Any]]:
    """Return graph shipments, or the checked-in deterministic demo dataset."""
    if settings.DEMO_MODE:
        return _fallback_shipments()
    try:
        results = neo4j_client.execute_query(queries.GET_ALL_SHIPMENTS)
        if results:
            return [_normalise_shipment(shipment, {}) for shipment in results]
    except Exception as exc:
        logger.debug(f"Oracle graph unavailable, using local shipments: {exc}")
    return _fallback_shipments()


def get_at_risk_shipments() -> list[dict[str, Any]]:
    return [
        shipment
        for shipment in get_all_shipments()
        if shipment["risk_flag"] or shipment["delay_days"] > 7
    ]


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
    risk = float(supplier.get("risk_score", 0.5))
    return {
        "supplier_id": supplier["id"],
        "name": supplier.get("name", supplier["id"]),
        "tier": int(supplier.get("tier", 1)),
        "risk_score": round(risk, 2),
        "on_time_rate": round(float(supplier.get("on_time_rate", 0.8)), 2),
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
    """Return a deterministic Tier 1/2/3 tree for a shipment."""
    data = _load_data()
    suppliers = data.get("suppliers", [])
    suppliers_by_id = {supplier["id"]: supplier for supplier in suppliers}
    shipment = next(
        (item for item in data.get("shipments", []) if (item.get("id") or item.get("shipment_id")) == shipment_id),
        None,
    )
    if shipment is None:
        return {}

    root_supplier = suppliers_by_id.get(shipment.get("origin_supplier", ""))
    if root_supplier is None:
        return {}

    tier_2 = [supplier for supplier in suppliers if int(supplier.get("tier", 0)) == 2]
    tier_3 = [supplier for supplier in suppliers if int(supplier.get("tier", 0)) == 3]
    tier_2_start = _stable_offset(shipment_id, len(tier_2))
    selected_tier_2 = [tier_2[(tier_2_start + index) % len(tier_2)] for index in range(min(2, len(tier_2)))]

    root = _supplier_node(root_supplier)
    root["tier"] = 1
    for index, supplier in enumerate(selected_tier_2):
        child = _supplier_node(supplier)
        tier_3_start = _stable_offset(f"{shipment_id}:{supplier['id']}", len(tier_3))
        child["children"] = [
            _supplier_node(tier_3[(tier_3_start + index + child_index) % len(tier_3)])
            for child_index in range(min(2, len(tier_3)))
        ]
        root["children"].append(child)

    return {
        "shipment_id": shipment_id,
        "equipment_tag": shipment.get("equipment_tag", ""),
        "root": root,
    }


def get_supply_chain(shipment_id: str) -> dict[str, Any]:
    """Compatibility alias for older router callers."""
    return get_supply_chain_tree(shipment_id)


def find_alternative_suppliers(
    equipment_tag: str,
    failing_supplier_id: str = "",
) -> list[dict[str, Any]]:
    """Rank qualified Tier-1 alternatives for a failing equipment supplier."""
    try:
        if settings.DEMO_MODE:
            raise RuntimeError("Demo mode uses deterministic supplier rankings")
        results = neo4j_client.execute_query(
            queries.FIND_ALTERNATIVE_SUPPLIERS,
            {"failing_supplier_id": failing_supplier_id, "equipment_tag": equipment_tag},
        )
        if results:
            return results
    except Exception as exc:
        logger.debug(f"Oracle alternatives graph query unavailable: {exc}")

    suppliers = [
        supplier
        for supplier in _load_data().get("suppliers", [])
        if supplier["id"] != failing_supplier_id and int(supplier.get("tier", 0)) == 1
    ]
    suppliers.sort(
        key=lambda supplier: (
            float(supplier.get("risk_score", 1)),
            -float(supplier.get("on_time_rate", 0)),
        )
    )
    alternatives = []
    for index, supplier in enumerate(suppliers[:3]):
        risk = float(supplier.get("risk_score", 0.5))
        on_time = float(supplier.get("on_time_rate", 0.8))
        alternatives.append(
            {
                "supplier_id": supplier["id"],
                "name": supplier.get("name", supplier["id"]),
                "equipment_tag": equipment_tag,
                "tier": 1,
                "risk_score": round(risk, 2),
                "on_time_rate": round(on_time, 2),
                "match_score": round((1 - risk) * 55 + on_time * 45, 1),
                "lead_time_days": 12 + index * 3,
                "country": supplier.get("country", ""),
                "city": supplier.get("city", ""),
            }
        )
    return alternatives


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
    cached = redis_client.get_cache(f"oracle:{project_id}")
    if cached:
        return cached

    shipments = get_all_shipments()
    at_risk = [shipment for shipment in shipments if shipment["risk_flag"] or shipment["delay_days"] > 7]
    result = {
        "all_shipments": shipments,
        "at_risk_shipments": at_risk,
        "geojson": build_geojson(shipments),
        "total_shipments": len(shipments),
        "at_risk_count": len(at_risk),
    }
    redis_client.set_cache(f"oracle:{project_id}", result)
    return result
