# backend/ingestion/ner/entity_linker.py — NER output → PKG node linking
"""
Links extracted NER entities to PKG node types and existing ContractClause nodes.
"""

from __future__ import annotations

from typing import Optional

from loguru import logger

from backend.graph.client import neo4j_client
from backend.graph.queries import GET_CLAUSE_BY_PARAMETER


def link_entity_to_clause(parameter_name: str) -> dict | None:
    """
    Look up a ContractClause node by parameter name.

    Returns:
        Dict with required_value, spec_dna_id, section, unit, operator
        or None if no matching clause found
    """
    try:
        results = neo4j_client.execute_query(
            GET_CLAUSE_BY_PARAMETER,
            {"parameter_name": parameter_name},
        )
        if results:
            return results[0]
        return None
    except Exception as e:
        logger.warning(f"Entity linking failed for {parameter_name}: {e}")
        return None


def link_entities_to_clauses(
    extracted_params: dict[str, dict] | None,
) -> list[dict]:
    """
    Link a batch of extracted parameters to their governing ContractClause nodes.

    Args:
        extracted_params: Dict from pdf_parser.extract_parameters_from_pdf()

    Returns:
        List of matched pairs: {parameter, extracted, clause}
    """
    linked = []
    if not extracted_params:
        return linked

    for param_name, param_data in extracted_params.items():
        clause = link_entity_to_clause(param_name)
        if clause:
            linked.append(
                {
                    "parameter_name": param_name,
                    "extracted": param_data,
                    "clause": clause,
                }
            )
            logger.debug(f"Linked {param_name}={param_data['value']} → ContractClause section={clause.get('section')}")
        else:
            logger.debug(f"No ContractClause found for parameter: {param_name}")

    return linked
