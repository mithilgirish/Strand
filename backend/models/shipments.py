# backend/models/shipments.py — Oracle models
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class Shipment(BaseModel):
    shipment_id: str
    equipment_tag: str = ""
    supplier_id: str = ""
    supplier_name: str = ""
    supplier_tier: int = 1
    origin_port: str = ""
    destination_port: str = ""
    expected_delivery: str = ""
    current_status: str = ""
    delay_days: int = 0
    risk_flag: bool = False
    lat: float = 0.0
    lng: float = 0.0


class Supplier(BaseModel):
    supplier_id: str
    name: str
    tier: int = 1
    country: str = ""
    risk_score: float = 0.0
    on_time_rate: float = 0.0


class GeoJsonFeature(BaseModel):
    type: str = "Feature"
    geometry: dict = {}
    properties: dict = {}


class GeoJsonResponse(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJsonFeature] = []


class SupplyChainResponse(BaseModel):
    shipment: Optional[Shipment] = None
    supplier: Optional[Supplier] = None
    supply_chain_tiers: list[Supplier] = []
