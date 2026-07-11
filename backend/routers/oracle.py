# backend/routers/oracle.py — Phase 2: Full Oracle API routes
"""
Routes:
  GET  /oracle/shipments           → GeoJSON FeatureCollection
  GET  /oracle/shipments/at-risk   → filtered at-risk shipments only
  GET  /oracle/supply-chain/{id}   → Tier-1/2/3 supply chain tree
  GET  /oracle/alternatives/{id}   → alternative supplier list
  POST /oracle/initiate-switch     → stub for supplier switch action
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from loguru import logger

from backend.agents.oracle import (
    run_oracle,
    get_supply_chain,
    find_alternative_suppliers,
    build_geojson,
)
from backend.redis_client import redis_client

router = APIRouter(tags=["oracle"])


@router.get("/oracle/shipments")
async def get_shipments():
    """Return GeoJSON FeatureCollection for Leaflet map."""
    try:
        result = await run_oracle()
        geojson = result.get("geojson", {"type": "FeatureCollection", "features": []})

        # If geojson is empty, build from all_shipments
        if not geojson.get("features"):
            all_ships = result.get("all_shipments", [])
            if all_ships:
                geojson = build_geojson(all_ships)

        return geojson
    except Exception as e:
        logger.error(f"Oracle shipments endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch shipments: {e}")


@router.get("/oracle/shipments/at-risk")
async def get_at_risk_shipments():
    """Return only at-risk shipments with risk details."""
    try:
        result = await run_oracle()
        at_risk = result.get("at_risk_shipments", [])

        # Build GeoJSON from at-risk only
        geojson = build_geojson(at_risk)

        return {
            "geojson": geojson,
            "shipments": at_risk,
            "count": len(at_risk),
        }
    except Exception as e:
        logger.error(f"Oracle at-risk endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch at-risk shipments: {e}")


@router.get("/oracle/supply-chain/{shipment_id}")
async def get_supply_chain_tree(shipment_id: str):
    """Return Tier-1/2/3 supply chain tree for a specific shipment."""
    try:
        chain = get_supply_chain(shipment_id)
        if not chain:
            # Build from cached oracle result
            result = await run_oracle()
            all_ships = result.get("all_shipments", [])
            ship = next((s for s in all_ships if s.get("shipment_id") == shipment_id), None)

            if ship:
                return {
                    "shipment_id": shipment_id,
                    "supply_chain": {
                        "tier_1": {
                            "supplier_id": ship.get("supplier_id", ""),
                            "name": ship.get("supplier_name", ""),
                            "tier": 1,
                        },
                        "tier_2": [],
                        "tier_3": [],
                    },
                }

            raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")

        return {"shipment_id": shipment_id, "supply_chain": chain}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supply chain query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch supply chain: {e}")


@router.get("/oracle/alternatives/{supplier_id}")
async def get_alternatives(supplier_id: str):
    """Find alternative suppliers for a failing supplier."""
    try:
        alternatives = find_alternative_suppliers(supplier_id)

        if not alternatives:
            # Fallback: return mock alternatives from JSON data
            import json, os
            json_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "data", "supplier_graph_data.json",
            )
            with open(json_path, "r") as f:
                data = json.load(f)

            alts = [
                s for s in data.get("suppliers", [])
                if s["id"] != supplier_id and s.get("risk_score", 1.0) < 0.4
            ][:3]

            alternatives = [
                {
                    "supplier_id": s["id"],
                    "name": s.get("name", s["id"]),
                    "tier": s.get("tier", 1),
                    "risk_score": round(s.get("risk_score", 0.5), 2),
                    "on_time_rate": s.get("on_time_rate", 0.85),
                    "country": s.get("country", "India"),
                    "city": s.get("city", ""),
                }
                for s in alts
            ]

        return {
            "failing_supplier_id": supplier_id,
            "alternatives": alternatives,
            "count": len(alternatives),
        }

    except Exception as e:
        logger.error(f"Alternative suppliers query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to find alternatives: {e}")


@router.post("/oracle/initiate-switch")
async def initiate_switch(body: dict):
    """Stub endpoint for initiating a supplier switch protocol."""
    target = body.get("target_supplier_id", "unknown")
    replaced = body.get("replaced_supplier_id", "unknown")
    trigger = body.get("trigger", "manual")

    logger.info(f"Supplier switch initiated: {replaced} → {target} (trigger: {trigger})")

    return {
        "message": f"Supplier switch protocol initiated: {replaced} → {target}",
        "protocol_id": f"SWITCH-{target[:8].upper()}-{replaced[:8].upper()}",
        "status": "pending_approval",
        "trigger": trigger,
    }
