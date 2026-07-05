# backend/models/query.py — Brain models per PRD §6.5
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class BrainQuery(BaseModel):
    question: str
    project_id: str = "default"


class QueryRequest(BrainQuery):
    """Plan-compatible request model name."""
    pass


class Citation(BaseModel):
    document: str = ""
    page: int = 0
    section: str = ""
    excerpt: str = ""


class BrainAnswer(BaseModel):
    """
    Per PRD §6.5 (v1.2):
    - spec_dna_ids: differentiator from generic RAG — every cited fact traces to a PKG node
    - graph_context: 1-hop neighborhood when chunks correspond to PKG entities (v1.2 new)
    """
    answer: str
    citations: list[Citation] = []
    related_rfis: list[str] = []
    confidence: str = "Medium"
    spec_dna_ids: list[str] = []
    graph_context: Optional[dict] = None
    response_time_ms: int = 0


class QueryResponse(BrainAnswer):
    """Plan-compatible response model name."""
    pass
