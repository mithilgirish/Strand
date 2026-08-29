"""Deterministic local data used when external services are unavailable."""

from __future__ import annotations

from backend.ingestion.spec_dna.fingerprint import generate_spec_dna_id

_CLAUSES = [
    {
        "section": "6.7.1",
        "parameter_name": "ambient_temperature_max",
        "required_value": 50.0,
        "unit": "°C",
        "operator": "gte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Maximum ambient temperature: 50°C (TIA-942-B §6.7.1)",
    },
    {
        "section": "5.2.3",
        "parameter_name": "ups_redundancy",
        "required_value": "N+1",
        "unit": "",
        "operator": "eq",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "UPS redundancy level: N+1 minimum (§5.2.3)",
    },
    {
        "section": "7.4.2",
        "parameter_name": "fire_suppression",
        "required_value": "FM-200 or Novec 1230",
        "unit": "",
        "operator": "eq",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Fire suppression: FM-200 or Novec 1230 for UPS rooms >500kVA (§7.4.2)",
    },
    {
        "section": "8.3.4",
        "parameter_name": "generator_fuel_consumption",
        "required_value": 260.0,
        "unit": "l/hr",
        "operator": "lte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Generator fuel consumption: ≤260 l/hr at rated load (§8.3.4)",
    },
    {
        "section": "9.1.2",
        "parameter_name": "cable_derating",
        "required_value": 0.75,
        "unit": "",
        "operator": "gte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Cable derating factor: 0.75 minimum for bunched cables (§9.1.2)",
    },
    {
        "section": "10.2.1",
        "parameter_name": "cooling_capacity",
        "required_value": 500.0,
        "unit": "kW",
        "operator": "gte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Cooling capacity: 500 kW minimum per unit (§10.2.1)",
    },
    {
        "section": "4.3",
        "parameter_name": "floor_loading",
        "required_value": 12.0,
        "unit": "kN/m²",
        "operator": "gte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Floor loading capacity: 12.0 kN/m2 minimum (§4.3)",
    },
    {
        "section": "11.1",
        "parameter_name": "chilled_water_supply_temp",
        "required_value": 10.0,
        "unit": "°C",
        "operator": "lte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "Chilled water supply temperature: 10°C maximum (§11.1)",
    },
    {
        "section": "12.2",
        "parameter_name": "pdu_efficiency",
        "required_value": 96.0,
        "unit": "%",
        "operator": "gte",
        "document_source": "spec_tia942_synthetic.pdf",
        "page": 1,
        "text": "PDU efficiency: ≥96% at 50% load (§12.2)",
    },
]


def demo_contract_clauses() -> list[dict]:
    clauses = []
    for clause in _CLAUSES:
        enriched = dict(clause)
        enriched["spec_dna_id"] = generate_spec_dna_id(
            parameter_name=enriched["parameter_name"],
            parameter_value=enriched["required_value"],
            document_source=enriched["document_source"],
            section=enriched["section"],
        )
        clauses.append(enriched)
    return clauses


def get_demo_clause(parameter_name: str) -> dict | None:
    for clause in demo_contract_clauses():
        if clause["parameter_name"] == parameter_name:
            return clause
    return None


def demo_spec_chunks(query: str = "") -> list[dict]:
    terms = {term.strip(" ?.,").lower() for term in query.split() if term.strip(" ?.,")}
    clauses = demo_contract_clauses()
    if terms:
        ranked = []
        for clause in clauses:
            haystack = f"{clause['parameter_name']} {clause['text']}".lower()
            score = sum(1 for term in terms if term and term in haystack)
            if score:
                ranked.append((score, clause))
        clauses = [clause for _, clause in sorted(ranked, key=lambda item: item[0], reverse=True)] or clauses

    return [
        {
            "text": clause["text"],
            "source": clause["document_source"],
            "page": clause["page"],
            "section": clause["section"],
            "score": 1.0,
            "metadata": {
                "document_source": clause["document_source"],
                "page_number": clause["page"],
                "section": clause["section"],
                "parameter_name": clause["parameter_name"],
                "spec_dna_id": clause["spec_dna_id"],
            },
            "sources": ["demo"],
        }
        for clause in clauses
    ]


def demo_chain(submittal_id: str, violation: dict) -> list[dict]:
    return [
        {
            "id": violation.get("spec_dna_id", ""),
            "label": "ContractClause",
            "section": violation.get("section", ""),
            "parameter_name": violation.get("parameter", ""),
            "parameter_value": violation.get("required"),
        },
        {
            "id": f"{submittal_id}:boq",
            "label": "BOQLine",
            "section": violation.get("section", ""),
            "parameter_name": violation.get("parameter", ""),
            "parameter_value": violation.get("required"),
        },
        {
            "id": f"{submittal_id}:po",
            "label": "POLine",
            "section": violation.get("section", ""),
            "parameter_name": violation.get("parameter", ""),
            "parameter_value": violation.get("required"),
        },
        {
            "id": submittal_id,
            "label": "VendorSubmittal",
            "section": violation.get("section", ""),
            "parameter_name": violation.get("parameter", ""),
            "parameter_value": violation.get("actual"),
            "mutation": True,
        },
    ]
