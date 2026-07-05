# backend/graph/schema.py — PKG node/edge definitions per PRD §4
"""
Node types, properties, constraints, and the critical passes_constraint() function.
ContractClause.passes_constraint corrects the constraint-direction bug from the
reference code (PRD §11, correction #1).
"""
from __future__ import annotations

from typing import Any, Optional


# ── Cypher constraint creation statements (§4.1) ────────────────────
SCHEMA_CONSTRAINTS = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:ContractClause) REQUIRE c.spec_dna_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (d:DrawingElement) REQUIRE d.spec_dna_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (b:BOQLine) REQUIRE b.line_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (p:POLine) REQUIRE p.po_number IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (s:VendorSubmittal) REQUIRE s.submittal_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (t:TestStep) REQUIRE t.step_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (n:NCR) REQUIRE n.ncr_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (v:Supplier) REQUIRE v.supplier_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (z:Zone) REQUIRE z.zone_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (r:CodeReference) REQUIRE r.ref_id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (sh:Shipment) REQUIRE sh.shipment_id IS UNIQUE",
]

SCHEMA_INDEXES = [
    "CREATE INDEX IF NOT EXISTS FOR (c:ContractClause) ON (c.section, c.parameter_name)",
    "CREATE INDEX IF NOT EXISTS FOR (s:VendorSubmittal) ON (s.equipment_tag)",
    "CREATE INDEX IF NOT EXISTS FOR (n:NCR) ON (n.status)",
    "CREATE INDEX IF NOT EXISTS FOR (sh:Shipment) ON (sh.risk_flag)",
]


# ── Node schemas (§4.2) ─────────────────────────────────────────────
NODE_SCHEMAS: dict[str, dict[str, str]] = {
    "ContractClause": {
        "spec_dna_id": "str (SHA-256 fingerprint)",
        "section": "str (e.g. '6.7.1')",
        "parameter_name": "str (e.g. 'ambient_temperature_max')",
        "parameter_value": "float | str",
        "unit": "str (e.g. '°C', 'kW', 'mm')",
        "operator": "str (gte|lte|eq|range) — constraint direction",
        "document_source": "str (filename)",
        "page_number": "int",
        "created_at": "datetime",
    },
    "VendorSubmittal": {
        "submittal_id": "str",
        "spec_dna_id": "str (SHA-256 fingerprint of target clause)",
        "vendor_name": "str",
        "equipment_tag": "str (e.g. 'CT-01')",
        "document_path": "str",
        "upload_timestamp": "datetime",
        "status": "str (pending|approved|rejected|flagged)",
        "extracted_parameters": "JSON string",
        "r0_score": "float",
        "violation_count": "int",
    },
    "NCR": {
        "ncr_id": "str",
        "title": "str",
        "description": "str",
        "severity": "str (Critical|Major|Minor)",
        "raised_by": "str",
        "raised_at": "datetime",
        "equipment_tag": "str",
        "spec_dna_ref": "str (SHA-256 fingerprint of violated clause)",
        "status": "str (pending_approval|open|under_review|closed|rejected)",
        "voice_transcript": "str (optional)",
        "r0_score": "float",
    },
    "Supplier": {
        "supplier_id": "str",
        "name": "str",
        "tier": "int (1|2|3)",
        "country": "str",
        "risk_score": "float (0-1)",
        "on_time_rate": "float",
        "lat": "float",
        "lng": "float",
    },
    "Shipment": {
        "shipment_id": "str",
        "equipment_tag": "str",
        "supplier_id": "str",
        "origin_port": "str",
        "destination_port": "str",
        "expected_delivery": "date",
        "current_status": "str",
        "delay_days": "int",
        "risk_flag": "bool",
        "lat": "float",
        "lng": "float",
    },
}


# ── Constraint checking (§4.2, §11 correction #1) ───────────────────
# The reference code had a bug where passes_constraint only checked >=.
# In reality, some constraints are upper bounds (max temp, max consumption)
# and some are lower bounds (min capacity, min redundancy).
# The operator field on ContractClause determines the direction.

OPERATOR_MAP = {
    "gte": lambda actual, required: float(actual) >= float(required),
    "lte": lambda actual, required: float(actual) <= float(required),
    "eq": lambda actual, required: float(actual) == float(required),
    "range": lambda actual, required: True,  # placeholder for range checks
}

# Parameter-to-operator mapping — which params are upper vs lower bounds
# This is the ground truth for constraint direction per the TIA-942 spec
PARAMETER_OPERATORS: dict[str, str] = {
    # Upper bounds (value must be <= spec)
    "fuel_consumption": "lte",
    "fuel_rate": "lte",
    "generator_fuel_consumption": "lte",
    "noise_level": "lte",
    "bearing_vibration": "lte",
    "ground_resistance": "lte",
    "chilled_water_supply_temp": "lte",
    "voltage_unbalance": "lte",

    # Lower bounds (value must be >= spec)
    "ambient_temperature_max": "gte",
    "thermal_max": "gte",
    "cooling_capacity": "gte",
    "ups_redundancy": "gte",
    "floor_loading": "gte",
    "pdu_efficiency": "gte",
    "cable_derating": "gte",
    "water_flow": "gte",
    "oil_pressure": "gte",
}


def get_operator_for_parameter(parameter_name: str) -> str:
    """Return the correct constraint operator for a given parameter name."""
    return PARAMETER_OPERATORS.get(parameter_name, "gte")


def passes_constraint(
    actual_value: Any,
    required_value: Any,
    operator: Optional[str] = None,
    parameter_name: Optional[str] = None,
) -> bool:
    """
    Check if an actual value passes the constraint defined by the required value.

    Per PRD §4.2 and §11 correction #1:
    - The operator determines the direction of comparison
    - Falls back to string equality for non-numeric values

    Args:
        actual_value: The value from the vendor submittal
        required_value: The constraint value from ContractClause
        operator: Explicit operator (gte|lte|eq), or inferred from parameter_name
        parameter_name: Used to look up the correct operator if not explicit

    Returns:
        True if the constraint passes, False if violated
    """
    if operator is None and parameter_name:
        operator = get_operator_for_parameter(parameter_name)
    elif operator is None:
        operator = "gte"

    try:
        check_fn = OPERATOR_MAP.get(operator, OPERATOR_MAP["gte"])
        return check_fn(actual_value, required_value)
    except (TypeError, ValueError):
        # Non-numeric: fall back to string equality
        return str(actual_value).strip().lower() == str(required_value).strip().lower()


def init_schema(neo4j_client) -> None:
    """Create all constraints and indexes in Neo4j."""
    for stmt in SCHEMA_CONSTRAINTS + SCHEMA_INDEXES:
        try:
            neo4j_client.execute_write(stmt)
        except Exception as e:
            from loguru import logger
            logger.warning(f"Schema init statement failed (may already exist): {e}")
