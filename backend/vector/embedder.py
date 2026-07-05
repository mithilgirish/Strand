# backend/vector/embedder.py — Embedding model wrapper
"""
Thin wrapper around the embedding model used for Chroma.
Uses Chroma's default embedding function (all-MiniLM-L6-v2) for Phase 1.
"""
from __future__ import annotations

from loguru import logger


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Split text into overlapping chunks for vector storage.

    Args:
        text: Full text to chunk
        chunk_size: Target characters per chunk
        overlap: Overlap between chunks

    Returns:
        List of text chunks
    """
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at a sentence boundary
        if end < len(text):
            # Look for period, newline, or other sentence boundary
            for sep in [". ", ".\n", "\n\n", "\n", " "]:
                last_sep = text[start:end].rfind(sep)
                if last_sep > chunk_size * 0.5:
                    end = start + last_sep + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks


def prepare_chunks_for_storage(
    text: str,
    document_source: str,
    page_number: int = 1,
    chunk_size: int = 500,
) -> tuple[list[str], list[dict], list[str]]:
    """
    Prepare text chunks with metadata for Chroma storage.

    Returns:
        Tuple of (documents, metadatas, ids)
    """
    chunks = chunk_text(text, chunk_size=chunk_size)

    documents = []
    metadatas = []
    ids = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{document_source}::p{page_number}::c{i}"
        documents.append(chunk)
        metadatas.append({
            "document_source": document_source,
            "page_number": page_number,
            "chunk_index": i,
        })
        ids.append(chunk_id)

    return documents, metadatas, ids
