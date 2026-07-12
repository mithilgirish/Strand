"""Phase 2 Oracle API routes."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.agents.oracle import (
    build_geojson,
    find_alternative_suppliers,
    get_supply_chain_tree,
    run_oracle,
)
from backend.redis_client import redis_client


router = APIRouter(tags=["oracle"])


class SupplierSwitchRequest(BaseModel):
    equipment_tag: str = Field(min_length=1)
    replaced_supplier_id: str = Field(min_length=1)
    target_supplier_id: str = Field(min_length=1)
    trigger: Literal["manual", "oracle_recommendation"] = "manual"


@router.get("/oracle/shipments")
async def get_shipments():
    result = await run_oracle()
    return result["geojson"]


@router.get("/oracle/shipments/at-risk")
async def get_at_risk_shipments():
    result = await run_oracle()
    return build_geojson(result["at_risk_shipments"])


@router.get("/oracle/supply-chain/{shipment_id}")
async def supply_chain(shipment_id: str):
    tree = get_supply_chain_tree(shipment_id)
    if not tree:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    return tree


@router.get("/oracle/alternatives/{equipment_tag}")
async def get_alternatives(
    equipment_tag: str,
    failing_supplier_id: str = Query(default=""),
):
    alternatives = find_alternative_suppliers(equipment_tag, failing_supplier_id)
    return {
        "equipment_tag": equipment_tag,
        "failing_supplier_id": failing_supplier_id,
        "alternatives": alternatives,
        "count": len(alternatives),
    }


@router.post("/oracle/initiate-switch")
async def initiate_switch(body: SupplierSwitchRequest):
    if body.target_supplier_id == body.replaced_supplier_id:
        raise HTTPException(status_code=422, detail="Replacement supplier must be different")

    protocol_id = f"SWITCH-{body.equipment_tag}-{body.target_supplier_id}"
    protocol = {
        "message": "Supplier switch protocol created for approval.",
        "protocol_id": protocol_id,
        "status": "pending_approval",
        **body.model_dump(),
    }
    redis_client.set_json(f"oracle:switch:{protocol_id}", protocol, ttl=86400)
    return protocol
