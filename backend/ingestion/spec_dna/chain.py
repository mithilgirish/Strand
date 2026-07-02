# backend/ingestion/spec_dna/chain.py — Spec-DNA lineage chain builder per PRD §5.4
"""
Builds and queries the full lineage chain:
ContractClause → BOQLine → POLine → VendorSubmittal → TestStep

The chain shows the mutation point — where a requirement was violated
in its journey from specification to installed equipment.
"""
from __future__ import annotations

from typing import Optional
from loguru import logger

from backend.graph.client import neo4j_client
from backend.graph.queries import GET_SPEC_DNA_CHAIN, GET_SPEC_DNA_NEIGHBORHOOD


def get_spec_dna_chain(submittal_id: str) -> list[dict]:
    """
    Retrieve the full Spec-DNA lineage chain for a submittal.

    Returns a list of nodes from ContractClause (root) to VendorSubmittal (leaf),
    showing the complete traceability path.
    """
    try:
        results = neo4j_client.execute_query(
            GET_SPEC_DNA_CHAIN,
            {"submittal_id": submittal_id},
        )
        if results:
            return results
        return []
    except Exception as e:
        logger.warning(f"Spec-DNA chain query failed for {submittal_id}: {e}")
        return []


def get_spec_dna_neighborhood(spec_dna_id: str) -> dict:
    """
    Get the 1-hop neighborhood of a Spec-DNA node (§6.5 v1.2).

    Used by Brain's graph_context to show relationships a pure
    vector-search RAG system cannot surface.

    Returns:
        Dict with center node info and list of neighbors with relationships.
    """
    try:
        results = neo4j_client.execute_query(
            GET_SPEC_DNA_NEIGHBORHOOD,
            {"spec_dna_id": spec_dna_id},
        )
        if not results:
            return {}

        center = {
            "label": results[0].get("center_label"),
            "id": results[0].get("center_id"),
        }
        neighbors = [
            {
                "relationship": r.get("relationship"),
                "label": r.get("neighbor_label"),
                "id": r.get("neighbor_id"),
                "parameter": r.get("neighbor_param"),
            }
            for r in results
            if r.get("neighbor_id")
        ]
        return {"center": center, "neighbors": neighbors}
    except Exception as e:
        logger.warning(f"Spec-DNA neighborhood query failed for {spec_dna_id}: {e}")
        return {}


def trace_spec_dna(spec_dna_id: str) -> dict:
    """
    Tool-level function for the Tool Registry.
    Combines chain and neighborhood data for a spec_dna_id.
    """
    neighborhood = get_spec_dna_neighborhood(spec_dna_id)
    return {
        "spec_dna_id": spec_dna_id,
        "neighborhood": neighborhood,
    }
