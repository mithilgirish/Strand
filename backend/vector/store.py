# backend/vector/store.py — Chroma vector store client per PRD §3
"""
Chroma client singleton with collection management for document chunks.
"""
from __future__ import annotations

from typing import Optional
from loguru import logger

from backend.config import settings


class ChromaStore:
    """Chroma vector store wrapper."""

    def __init__(self):
        self._client = None
        self._collection = None
        self._connect()

    def _connect(self):
        import time
        retries = 3
        for attempt in range(retries):
            try:
                import chromadb
                self._client = chromadb.PersistentClient(
                    path=settings.CHROMA_PERSIST_DIR,
                )
                self._collection = self._client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION,
                    metadata={"hnsw:space": "cosine"},
                )
                logger.info(
                    f"Chroma connected: collection='{settings.CHROMA_COLLECTION}', "
                    f"count={self._collection.count()}"
                )
                return
            except Exception as e:
                if attempt < retries - 1:
                    logger.warning(f"Chroma init failed, retrying in 2s (attempt {attempt + 1}): {e}")
                    time.sleep(2)
                else:
                    logger.warning(f"Chroma initialization failed after {retries} attempts: {e}")
                    self._client = None
                    self._collection = None

    @property
    def is_available(self) -> bool:
        return self._collection is not None

    @property
    def collection(self):
        return self._collection

    def add_documents(
        self,
        documents: list[str],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        """Add document chunks to the collection."""
        if not self.is_available:
            logger.warning("Chroma unavailable — documents not stored")
            return

        try:
            self._collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids,
            )
            logger.info(f"Upserted {len(documents)} chunks to Chroma")
        except Exception as e:
            logger.error(f"Failed to add documents to Chroma: {e}")

    def query(
        self,
        query_text: str,
        n_results: int = 8,
        where: Optional[dict] = None,
    ) -> dict:
        """
        Query the collection for similar documents.

        Returns:
            Chroma query result dict with documents, metadatas, distances, ids
        """
        if not self.is_available:
            logger.warning("Chroma unavailable — returning empty results")
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "ids": [[]]}

        try:
            kwargs = {
                "query_texts": [query_text],
                "n_results": min(n_results, self._collection.count() or 1),
            }
            if where:
                kwargs["where"] = where

            return self._collection.query(**kwargs)
        except Exception as e:
            logger.error(f"Chroma query failed: {e}")
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "ids": [[]]}

    def count(self) -> int:
        """Return the number of documents in the collection."""
        if not self.is_available:
            return 0
        return self._collection.count()

    def health(self) -> dict:
        """Health check for /health endpoint."""
        if self.is_available:
            return {
                "status": "ok",
                "collection": settings.CHROMA_COLLECTION,
                "document_count": self.count(),
            }
        return {"status": "unavailable"}


# ── Singleton ────────────────────────────────────────────────────────
chroma_store = ChromaStore()
