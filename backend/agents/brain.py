# backend/agents/brain.py — The Brain (Project Knowledge Copilot) per PRD §6.5
"""
Hybrid retrieval (dense + BM25 + RRF fusion).
v1.2: spec_dna_ids as differentiator + graph_context for PKG-traceable answers.
Groundedness check: answers must cite sources.
"""
from __future__ import annotations

from typing import Optional

from loguru import logger

from backend.vector.retriever import hybrid_retriever
from backend.graph.client import neo4j_client
from backend.graph import queries
from backend.ingestion.spec_dna.chain import get_spec_dna_neighborhood
from backend.llm.client import invoke_structured
from backend.prompts.registry import load_prompt, get_prompt_version
from backend.models.query import BrainAnswer
import json


async def run_brain(question: str, project_id: str = "default") -> dict:
    """
    Main Brain query handler.
    1. Hybrid retrieval (BM25 + dense via RRF)
    2. LLM answer generation with citations
    3. Spec-DNA graph context enrichment (v1.2)
    4. Related RFI lookup
    """
    # Step 1: Hybrid retrieve
    chunks = hybrid_retriever.retrieve(question, k=8)

    # Step 2: Build context
    context = _build_context(chunks)

    # Step 3: Find related resolved RFIs/NCRs
    related_rfis = _find_related_rfis(question)

    # Step 4: Generate answer via LLM
    prompt = load_prompt(
        "brain_query",
        context=context,
        related_rfis=json.dumps(related_rfis[:2], indent=2, default=str),
        question=question,
    )

    try:
        answer = invoke_structured(
            prompt=prompt,
            response_model=BrainAnswer,
            agent_name="brain",
            prompt_name="brain_query",
            prompt_version=get_prompt_version("brain_query"),
        )
    except Exception as e:
        logger.warning(f"Brain: LLM answer generation failed: {e}")
        answer = BrainAnswer(
            answer="I couldn't generate a complete answer. Please try rephrasing your question.",
            citations=[],
            related_rfis=[],
            confidence="Low",
            spec_dna_ids=[],
        )

    # Step 5: Enrich with graph context (v1.2 differentiator)
    graph_context = None
    if answer.spec_dna_ids:
        graph_context = _enrich_with_graph_context(answer.spec_dna_ids)
        answer.graph_context = graph_context

    result = answer.model_dump()
    logger.info(
        f"Brain: answered with confidence={answer.confidence}, "
        f"citations={len(answer.citations)}, spec_dna_ids={len(answer.spec_dna_ids)}"
    )
    return result


def _build_context(chunks: list[dict]) -> str:
    """Build context string from retrieved chunks with source attribution."""
    if not chunks:
        return "No relevant context found in the project knowledge base."

    context_parts = []
    for i, chunk in enumerate(chunks):
        metadata = chunk.get("metadata", {})
        source = metadata.get("document_source", "unknown")
        page = metadata.get("page_number", "?")
        sources_str = ", ".join(chunk.get("sources", ["unknown"]))

        context_parts.append(
            f"[Source {i + 1}: {source}, Page {page}, Retrieved via: {sources_str}]\n"
            f"{chunk['text']}\n"
        )

    return "\n---\n".join(context_parts)


def _find_related_rfis(question: str) -> list[dict]:
    """Find resolved RFIs/NCRs with similar topic via Neo4j."""
    keywords = question.lower().split()[:5]

    try:
        results = neo4j_client.execute_query(
            queries.FIND_RELATED_RFIS,
            {"keywords": keywords},
        )
        return results or []
    except Exception as e:
        logger.warning(f"Brain: related RFI lookup failed: {e}")
        return []


def _enrich_with_graph_context(spec_dna_ids: list[str]) -> Optional[dict]:
    """
    v1.2: When retrieved chunks correspond to PKG entities with DERIVES_FROM lineage,
    include the 1-hop neighborhood so the answer can surface relationships
    a pure vector-search RAG system cannot.
    """
    context = {}
    for spec_dna_id in spec_dna_ids[:3]:  # Limit to 3 to avoid cost explosion
        neighborhood = get_spec_dna_neighborhood(spec_dna_id)
        if neighborhood:
            context[spec_dna_id] = neighborhood

    return context if context else None
