# backend/vector/store.py — Chroma vector store client per PRD §3
"""
Chroma client singleton with collection management for document chunks.
"""
from __future__ import annotations

import gc
import shutil
from pathlib import Path
from typing import Optional
from loguru import logger

from backend.config import settings

_REPO_ROOT = Path(__file__).resolve().parents[2]


def _is_schema_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        token in text
        for token in ("mismatched types", "sql type `blob`", "backfill request to compactor")
    )


def _resolve_persist_dir() -> Path:
    raw = Path(settings.CHROMA_PERSIST_DIR)
    if raw.is_absolute():
        return raw
    return (_REPO_ROOT / raw).resolve()


class ChromaStore:
    """Chroma vector store wrapper."""

    def __init__(self):
        self._client = None
        self._collection = None
        self._last_error = None
        self._persist_dir = _resolve_persist_dir()
        self._connect()

    def _close_client(self) -> None:
        """Release the Rust/SQLite lock so Windows can delete chroma.sqlite3."""
        client = self._client
        self._collection = None
        self._client = None
        if client is None:
            return
        try:
            close = getattr(client, "close", None)
            if callable(close):
                close()
        except Exception as exc:
            logger.debug("Chroma client close failed: {}", exc)
        gc.collect()

    def _reset_persist_dir(self) -> None:
        self._close_client()
        path = self._persist_dir
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
        leftover = [p.name for p in path.iterdir()] if path.exists() else []
        if leftover:
            for child in list(path.rglob("*")):
                try:
                    if child.is_file():
                        child.unlink()
                except Exception:
                    pass
            leftover = [p.name for p in path.iterdir()] if path.exists() else []
        if leftover:
            alt = _REPO_ROOT / "data" / "runtime" / "chroma_db"
            if alt.exists():
                shutil.rmtree(alt, ignore_errors=True)
            alt.mkdir(parents=True, exist_ok=True)
            self._persist_dir = alt
            logger.warning("Chroma persist dir locked at {}; using {}", path, alt)
        logger.warning("Reset incompatible Chroma persist directory at {}", path)

    def _connect(self):
        import time
        retries = 3
        reset_attempted = False
        for attempt in range(retries):
            try:
                import chromadb
                self._client = chromadb.PersistentClient(
                    path=str(self._persist_dir),
                )
                self._collection = self._client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION,
                    metadata={"hnsw:space": "cosine"},
                )
                count = self._collection.count()
                logger.info(
                    f"Chroma connected: collection='{settings.CHROMA_COLLECTION}', "
                    f"count={count}"
                )
                self._last_error = None
                return
            except Exception as e:
                self._last_error = f"{type(e).__name__}: {e}"
                if _is_schema_error(e) and not reset_attempted:
                    logger.warning("Chroma schema incompatible with this build; recreating store: {}", e)
                    self._reset_persist_dir()
                    reset_attempted = True
                    continue
                if attempt < retries - 1:
                    logger.warning(f"Chroma init failed, retrying in 2s (attempt {attempt + 1}): {e}")
                    time.sleep(2)
                else:
                    logger.warning(f"Chroma initialization failed after {retries} attempts: {e}")
                    self._close_client()

    def reconnect(self) -> None:
        self._close_client()
        self._connect()

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
        if not self.is_available:
            try:
                self.reconnect()
            except Exception:
                pass
        if self.is_available:
            return {
                "status": "ok",
                "collection": settings.CHROMA_COLLECTION,
                "document_count": self.count(),
            }
        return {"status": "unavailable", "error": self._last_error}


# ── Singleton ────────────────────────────────────────────────────────
chroma_store = ChromaStore()
