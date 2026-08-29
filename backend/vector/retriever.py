# backend/vector/retriever.py — Hybrid BM25 + dense retrieval with RRF per PRD §6.5
"""
Brain Agent's retrieval engine:
1. Dense retrieval via Chroma (semantic similarity)
2. BM25 keyword retrieval (exact term matching)
3. Reciprocal Rank Fusion (RRF) to merge results

Per PRD §6.5: the groundedness check ensures answers cite sources.
"""

from __future__ import annotations

from typing import Optional

from loguru import logger

from backend.vector.store import chroma_store


class HybridRetriever:
    """Hybrid BM25 + Dense retrieval with Reciprocal Rank Fusion."""

    def __init__(self):
        self._bm25_corpus: list[dict] = []  # {text, metadata}
        self._bm25_index = None

    def build_bm25_index(self, corpus: list[dict]) -> None:
        """
        Build BM25 index from a corpus of documents.

        Args:
            corpus: List of {text: str, metadata: dict}
        """
        self._bm25_corpus = corpus
        try:
            from rank_bm25 import BM25Okapi

            tokenised = [doc["text"].lower().split() for doc in corpus]
            self._bm25_index = BM25Okapi(tokenised)
            logger.info(f"BM25 index built with {len(corpus)} documents")
        except ImportError:
            logger.warning("rank_bm25 not available — BM25 retrieval disabled")
            self._bm25_index = None

    def retrieve(self, query: str, k: int = 8) -> list[dict]:
        """
        Hybrid retrieval: BM25 + dense, merged via RRF.

        Args:
            query: Search query string
            k: Number of results to return

        Returns:
            List of {text, metadata, score, source} dicts, ranked by RRF score
        """
        self._ensure_bm25_index()

        dense_results = self._dense_retrieve(query, k=k)
        bm25_results = self._bm25_retrieve(query, k=k)

        # Merge via Reciprocal Rank Fusion — keep RRF rank (do not re-sort by page)
        fused = self._reciprocal_rank_fusion(dense_results, bm25_results, k=k)
        from backend.config import settings

        if settings.DEMO_MODE and len(fused) < k:
            from backend.demo_data import demo_spec_chunks

            seen = {doc["text"][:100] for doc in fused}
            for doc in demo_spec_chunks(""):
                key = doc["text"][:100]
                if key not in seen:
                    meta = dict(doc.get("metadata") or {})
                    meta["context_source"] = "demo"
                    fused.append({**doc, "metadata": meta})
                    seen.add(key)
                if len(fused) >= k:
                    break

        logger.debug(f"Hybrid retrieval: {len(dense_results)} dense, {len(bm25_results)} BM25, {len(fused)} fused")
        return fused

    def _ensure_bm25_index(self) -> None:
        """Build a small local BM25 corpus when no persisted runtime index exists."""
        if self._bm25_index and self._bm25_corpus:
            return
        try:
            from backend.config import settings
            from backend.demo_data import demo_spec_chunks

            if not settings.DEMO_MODE:
                return
            self.build_bm25_index(
                [
                    {"text": chunk["text"], "metadata": {**chunk.get("metadata", {}), "context_source": "demo"}}
                    for chunk in demo_spec_chunks("")
                ]
            )
        except Exception as e:
            logger.debug(f"BM25 lazy index build skipped: {e}")

    def _dense_retrieve(self, query: str, k: int = 8) -> list[dict]:
        """Dense (semantic) retrieval via Chroma."""
        result = chroma_store.query(query_text=query, n_results=k)

        docs = []
        if result["documents"] and result["documents"][0]:
            for i, doc_text in enumerate(result["documents"][0]):
                metadata = {}
                if result["metadatas"] and result["metadatas"][0]:
                    metadata = result["metadatas"][0][i] if i < len(result["metadatas"][0]) else {}

                distance = 0.0
                if result["distances"] and result["distances"][0]:
                    distance = result["distances"][0][i] if i < len(result["distances"][0]) else 0.0

                docs.append(
                    {
                        "text": doc_text,
                        "metadata": metadata,
                        "source": metadata.get("document_source", "dense"),
                        "page": metadata.get("page_number", 0),
                        "section": metadata.get("section", ""),
                        "score": 1.0 - distance,  # Convert distance to similarity
                    }
                )
        return docs

    def _bm25_retrieve(self, query: str, k: int = 8) -> list[dict]:
        """BM25 keyword retrieval."""
        if not self._bm25_index or not self._bm25_corpus:
            return []

        tokenised_query = query.lower().split()
        scores = self._bm25_index.get_scores(tokenised_query)

        # Get top-k by BM25 score
        scored_docs = list(zip(scores, self._bm25_corpus))
        scored_docs.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "text": doc["text"],
                "metadata": doc.get("metadata", {}),
                "source": doc.get("metadata", {}).get("document_source", "bm25"),
                "page": doc.get("metadata", {}).get("page_number", 0),
                "section": doc.get("metadata", {}).get("section", ""),
                "score": float(score),
            }
            for score, doc in scored_docs[:k]
            if score > 0
        ]

    def _reciprocal_rank_fusion(
        self,
        dense_results: list[dict],
        bm25_results: list[dict],
        k: int = 8,
        rrf_k: int = 60,
    ) -> list[dict]:
        """
        Reciprocal Rank Fusion (RRF) per PRD §6.5.

        RRF_score(d) = Σ 1/(rrf_k + rank_in_list_i)

        Merges two ranked lists with deduplication.
        """
        doc_scores: dict[str, dict] = {}

        # Score dense results
        for rank, doc in enumerate(dense_results):
            key = doc["text"][:100]  # Use text prefix as dedup key
            if key not in doc_scores:
                doc_scores[key] = {
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "source": doc.get("source", doc["metadata"].get("document_source", "dense")),
                    "page": doc["metadata"].get("page_number", 0),
                    "section": doc["metadata"].get("section", ""),
                    "rrf_score": 0.0,
                    "sources": [],
                }
            doc_scores[key]["rrf_score"] += 1.0 / (rrf_k + rank + 1)
            doc_scores[key]["sources"].append("dense")

        # Score BM25 results
        for rank, doc in enumerate(bm25_results):
            key = doc["text"][:100]
            if key not in doc_scores:
                doc_scores[key] = {
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "source": doc.get("source", doc["metadata"].get("document_source", "bm25")),
                    "page": doc["metadata"].get("page_number", 0),
                    "section": doc["metadata"].get("section", ""),
                    "rrf_score": 0.0,
                    "sources": [],
                }
            doc_scores[key]["rrf_score"] += 1.0 / (rrf_k + rank + 1)
            doc_scores[key]["sources"].append("bm25")

        # Sort by RRF score and return top-k
        fused = sorted(doc_scores.values(), key=lambda x: x["rrf_score"], reverse=True)
        return fused[:k]


# ── Singleton ────────────────────────────────────────────────────────
hybrid_retriever = HybridRetriever()


def hybrid_retrieve(query: str, k: int = 8) -> list[dict]:
    """Plan-compatible function wrapper around the singleton retriever."""
    return hybrid_retriever.retrieve(query, k=k)
