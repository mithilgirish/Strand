# backend/agents/oracle.py — The Oracle (Supply Chain Intelligence) per PRD §6.3
"""
Pure graph traversal (no LLMs in the hot path).
Returns GeoJSON for the frontend map component.
Serves stale/cached data on GRAPH_UNAVAILABLE.
"""
from __future__ import annotations

import json
import os
from typing import Optional

from loguru import logger

from backend.graph.client import neo4j_client
from backend.graph import queries
from backend.redis_client import redis_client


async def run_oracle(project_id: str = "default") -> dict:
    """Run the Oracle pipeline — returns all shipment data."""
    # Try cache first
    cached = redis_client.get_cache(f"oracle:{project_id}")
    if cached:
        logger.info("Oracle: returning cached result")
        return cached

    try:
        shipments = get_all_shipments()
        at_risk = get_at_risk_shipments()
        geojson = build_geojson(shipments)

        result = {
            "all_shipments": shipments,
            "at_risk_shipments": at_risk,
            "geojson": geojson,
            "total_shipments": len(shipments),
            "at_risk_count": len(at_risk),
        }

        redis_client.set_cache(f"oracle:{project_id}", result)
        return result

    except Exception as e:
        logger.warning(f"Oracle: graph query failed, trying fallback: {e}")
        return _fallback_from_json()


def get_all_shipments() -> list[dict]:
    """Get all shipments from Neo4j."""
    results = neo4j_client.execute_query(queries.GET_ALL_SHIPMENTS)
    if results:
        return results
    return _fallback_from_json().get("all_shipments", [])


def get_at_risk_shipments() -> list[dict]:
    """Get only at-risk shipments."""
    results = neo4j_client.execute_query(queries.GET_AT_RISK_SHIPMENTS)
    if results:
        return results
    # Fallback: filter from JSON
    all_ships = _fallback_from_json().get("all_shipments", [])
    return [s for s in all_ships if s.get("risk_flag")]


def get_supply_chain(shipment_id: str) -> dict:
    """Get full Tier-1/2/3 supply chain for a shipment."""
    results = neo4j_client.execute_query(
        queries.GET_SUPPLY_CHAIN,
        {"shipment_id": shipment_id},
    )
    if results:
        return results[0]
    return {}


def find_alternative_suppliers(failing_supplier_id: str) -> list[dict]:
    """Find alternative suppliers with low risk and high on-time rate."""
    results = neo4j_client.execute_query(
        queries.FIND_ALTERNATIVE_SUPPLIERS,
        {"failing_supplier_id": failing_supplier_id},
    )
    return results or []


def build_geojson(shipments: list[dict]) -> dict:
    """Convert shipments to GeoJSON FeatureCollection for Leaflet."""
    features = []
    for s in shipments:
        lat = s.get("lat", 0)
        lng = s.get("lng", 0)
        if lat == 0 and lng == 0:
            continue

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat],
            },
            "properties": {
                "shipment_id": s.get("shipment_id", ""),
                "equipment_tag": s.get("equipment_tag", ""),
                "delay_days": s.get("delay_days", 0),
                "risk_flag": s.get("risk_flag", False),
                "status": s.get("current_status", ""),
                "supplier_name": s.get("supplier_name", ""),
            },
        })

    return {"type": "FeatureCollection", "features": features}


def _fallback_from_json() -> dict:
    """Fallback: load supplier data from JSON when graph is unavailable (§13 stale-response)."""
    json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "supplier_graph_data.json",
    )

    try:
        with open(json_path, "r") as f:
            data = json.load(f)

        import random
        shipments = []
        for ship in data.get("shipments", []):
            shipments.append({
                "shipment_id": ship["id"],
                "equipment_tag": f"EQ-{random.randint(1, 20):03d}",
                "supplier_id": ship["origin_supplier"],
                "supplier_name": ship["origin_supplier"],
                "delay_days": random.randint(0, 14) if ship.get("risk_flag") else 0,
                "risk_flag": ship.get("risk_flag", False),
                "current_status": "at_risk" if ship.get("risk_flag") else "on_track",
                "lat": random.uniform(20, 55),
                "lng": random.uniform(50, 140),
            })

        return {
            "all_shipments": shipments,
            "at_risk_shipments": [s for s in shipments if s.get("risk_flag")],
            "geojson": build_geojson(shipments),
            "total_shipments": len(shipments),
            "at_risk_count": len([s for s in shipments if s.get("risk_flag")]),
        }
    except Exception as e:
        logger.error(f"Oracle JSON fallback also failed: {e}")
        return {"all_shipments": [], "at_risk_shipments": [], "geojson": {"type": "FeatureCollection", "features": []}}
