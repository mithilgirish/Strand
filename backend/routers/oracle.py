"""Phase 2 Oracle API routes with live HITL supplier switch governance."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from backend.agents.oracle import (
    build_geojson,
    find_alternative_suppliers,
    get_supply_chain_tree,
    run_oracle,
    _merged_catalog,
)
from backend.redis_client import redis_client
from backend.deps import get_optional_current_user, CurrentUser


router = APIRouter(tags=["oracle"])


class SupplierSwitchRequest(BaseModel):
    equipment_tag: str = Field(min_length=1)
    replaced_supplier_id: str = Field(min_length=1)
    target_supplier_id: str = Field(min_length=1)
    trigger: Literal["manual", "oracle_recommendation"] = "manual"


class SwitchDecisionRequest(BaseModel):
    decision: Literal["approve", "reject"] = "approve"
    reason: str | None = None


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


@router.get("/oracle/switches")
async def list_switches():
    """Returns all active, pending, and resolved supplier switch protocols."""
    switches_list = []
    seen_ids = set()

    # 1. Pull from list index
    saved_ids = redis_client.get_json("oracle:switches:index") or []
    if isinstance(saved_ids, list):
        for pid in saved_ids:
            data = redis_client.get_json(f"oracle:switch:{pid}")
            if data and pid not in seen_ids:
                seen_ids.add(pid)
                switches_list.append(data)

    # 2. Check for any direct approved switches
    catalog_suppliers, _ = _merged_catalog()
    for item in switches_list:
        target_id = item.get("target_supplier_id")
        replaced_id = item.get("replaced_supplier_id")
        if target_id and target_id in catalog_suppliers:
            item["target_supplier_name"] = catalog_suppliers[target_id].get("name", target_id)
            item["target_city"] = catalog_suppliers[target_id].get("city", "")
            item["target_country"] = catalog_suppliers[target_id].get("country", "")
        if replaced_id and replaced_id in catalog_suppliers:
            item["replaced_supplier_name"] = catalog_suppliers[replaced_id].get("name", replaced_id)

    return {"switches": switches_list, "count": len(switches_list)}


@router.post("/oracle/initiate-switch")
async def initiate_switch(body: SupplierSwitchRequest, user: CurrentUser | None = Depends(get_optional_current_user)):
    if body.target_supplier_id == body.replaced_supplier_id:
        raise HTTPException(status_code=422, detail="Replacement supplier must be different")

    catalog_suppliers, _ = _merged_catalog()
    target_supp = catalog_suppliers.get(body.target_supplier_id, {})
    replaced_supp = catalog_suppliers.get(body.replaced_supplier_id, {})

    protocol_id = f"SWITCH-{body.equipment_tag}-{body.target_supplier_id}"
    now_iso = datetime.now(timezone.utc).isoformat()

    protocol = {
        "message": f"Supplier switch protocol created for {body.equipment_tag}.",
        "protocol_id": protocol_id,
        "status": "pending_approval",
        "equipment_tag": body.equipment_tag,
        "replaced_supplier_id": body.replaced_supplier_id,
        "replaced_supplier_name": replaced_supp.get("name", body.replaced_supplier_id),
        "target_supplier_id": body.target_supplier_id,
        "target_supplier_name": target_supp.get("name", body.target_supplier_id),
        "target_city": target_supp.get("city", ""),
        "target_country": target_supp.get("country", ""),
        "target_risk_score": float(target_supp.get("risk_score", 0.1)),
        "target_lead_time": target_supp.get("lead_time_days", 12),
        "trigger": body.trigger,
        "created_at": now_iso,
        "created_by": user.email if user else "procurement_lead@strand.ai",
    }

    # Store protocol
    redis_client.set_json(f"oracle:switch:{protocol_id}", protocol, ttl=86400 * 7)

    # Maintain index list
    current_index = redis_client.get_json("oracle:switches:index") or []
    if isinstance(current_index, list) and protocol_id not in current_index:
        current_index.insert(0, protocol_id)
        redis_client.set_json("oracle:switches:index", current_index, ttl=86400 * 7)

    return protocol


@router.post("/oracle/switches/{protocol_id}/approve")
async def approve_switch(protocol_id: str, user: CurrentUser | None = Depends(get_optional_current_user)):
    """Approves the switch protocol and re-routes active supply chain logistics."""
    protocol = redis_client.get_json(f"oracle:switch:{protocol_id}")
    if not protocol:
        # If not found directly, create from protocol_id pattern
        parts = protocol_id.split("-")
        if len(parts) >= 3:
            eq_tag = parts[1]
            target_id = "-".join(parts[2:])
            protocol = {
                "protocol_id": protocol_id,
                "equipment_tag": eq_tag,
                "target_supplier_id": target_id,
                "status": "pending_approval"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Switch protocol {protocol_id} not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    protocol["status"] = "approved"
    protocol["approved_at"] = now_iso
    protocol["approved_by"] = user.email if user else "procurement_director@strand.ai"
    protocol["message"] = f"Supplier switch approved for {protocol['equipment_tag']}. Logistics re-routed."

    eq_tag = protocol.get("equipment_tag", "")

    # 1. Update protocol in Redis
    redis_client.set_json(f"oracle:switch:{protocol_id}", protocol, ttl=86400 * 7)

    # 2. Persist active override so shipments immediately reflect the new green supplier
    if eq_tag:
        redis_client.set_json(f"oracle:approved_switch:{eq_tag}", protocol, ttl=86400 * 7)

    return {
        "status": "success",
        "message": f"Supplier switch approved for {eq_tag}. Shipment re-routed successfully.",
        "protocol": protocol
    }


@router.post("/oracle/switches/{protocol_id}/reject")
async def reject_switch(protocol_id: str, request: SwitchDecisionRequest | None = None, user: CurrentUser | None = Depends(get_optional_current_user)):
    """Rejects the switch protocol."""
    protocol = redis_client.get_json(f"oracle:switch:{protocol_id}")
    if not protocol:
        raise HTTPException(status_code=404, detail=f"Switch protocol {protocol_id} not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    protocol["status"] = "rejected"
    protocol["rejected_at"] = now_iso
    protocol["rejected_by"] = user.email if user else "admin@strand.ai"
    protocol["rejection_reason"] = request.reason if request and request.reason else "Declined by procurement governance."

    redis_client.set_json(f"oracle:switch:{protocol_id}", protocol, ttl=86400 * 7)
    return {
        "status": "rejected",
        "message": "Supplier switch protocol was rejected.",
        "protocol": protocol
    }
