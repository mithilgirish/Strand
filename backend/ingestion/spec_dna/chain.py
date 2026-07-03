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
        if results and results[0].get("chain"):
            chain = results[0]["chain"]
            rank = {
                "ContractClause": 0,
                "BOQLine": 1,
                "POLine": 2,
                "VendorSubmittal": 3,
                "TestStep": 4
            }
            return sorted(chain, key=lambda x: rank.get(x.get("label", ""), 99))
        return []
    except Exception as e:
        logger.warning(f"Spec-DNA chain query failed for {submittal_id}: {e}")
        return []


def build_chain(submittal_id: str) -> dict:
    """
    Build DERIVES_FROM lineage edges for a submittal when enough PKG nodes exist.

    The Phase 1 demo can run with synthetic fallback chains, so this function is
    deliberately best-effort: it never blocks analysis when the graph lacks
    intermediate BOQ/PO nodes.
    """
    try:
        query = """
        MATCH (s:VendorSubmittal {submittal_id: $submittal_id})
        MATCH (c:ContractClause {spec_dna_id: s.spec_dna_id})
        MERGE (s)-[:DERIVES_FROM]->(c)
        RETURN s.submittal_id as submittal_id, c.spec_dna_id as spec_dna_id
        """
        results = neo4j_client.execute_write(query, {"submittal_id": submittal_id})
        return results[0] if results else {"submittal_id": submittal_id, "created": False}
    except Exception as e:
        logger.warning(f"Spec-DNA chain build skipped for {submittal_id}: {e}")
        return {"submittal_id": submittal_id, "created": False, "error": str(e)}


def get_chain(submittal_id: str) -> list[dict]:
    """Plan-compatible alias for get_spec_dna_chain()."""
    return get_spec_dna_chain(submittal_id)


def find_mutation_point(chain: list[dict]) -> dict | None:
    """
    Return the first node whose parameter value diverges from the root value.
    """
    if not chain:
        return None

    root_value = chain[0].get("parameter_value")
    for node in chain[1:]:
        if node.get("mutation") or node.get("parameter_value") != root_value:
            return node
    return None


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
