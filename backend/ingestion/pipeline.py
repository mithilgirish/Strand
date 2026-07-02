# backend/ingestion/pipeline.py — Document ingestion orchestrator per PRD §3
"""
Orchestrates: parse → extract parameters → link entities → write to PKG + Chroma.
Handles PDF, CSV, and JSON file types.
"""
from __future__ import annotations

import os
from typing import Optional
from uuid import uuid4

from loguru import logger

from backend.ingestion.parsers.pdf_parser import extract_text_from_pdf, extract_parameters_from_pdf
from backend.ingestion.parsers.csv_parser import parse_schedule_csv
from backend.ingestion.parsers.json_parser import parse_supplier_graph, parse_checklist
from backend.ingestion.spec_dna.fingerprint import generate_spec_dna_id
from backend.ingestion.ner.entity_linker import link_entities_to_clauses
from backend.vector.store import chroma_store
from backend.vector.embedder import prepare_chunks_for_storage
from backend.graph.client import neo4j_client
from backend.graph import queries


def ingest_document(file_path: str, document_type: Optional[str] = None) -> dict:
    """
    Main ingestion entry point. Detects file type and routes to appropriate parser.

    Args:
        file_path: Path to the document to ingest
        document_type: Optional hint: "spec", "submittal", "schedule", "supplier", "checklist"

    Returns:
        Dict with ingestion results: document_id, node_count, chunk_count, status
    """
    ext = os.path.splitext(file_path)[1].lower()
    filename = os.path.basename(file_path)
    doc_id = f"DOC-{uuid4().hex[:8].upper()}"

    logger.info(f"Starting ingestion: {filename} (type={document_type}, ext={ext})")

    try:
        if ext == ".pdf":
            return _ingest_pdf(file_path, filename, doc_id, document_type)
        elif ext == ".csv":
            return _ingest_csv(file_path, filename, doc_id)
        elif ext == ".json":
            return _ingest_json(file_path, filename, doc_id, document_type)
        else:
            logger.warning(f"Unsupported file type: {ext}")
            return {
                "document_id": doc_id,
                "filename": filename,
                "status": "unsupported_format",
                "node_count": 0,
                "chunk_count": 0,
            }

    except Exception as e:
        logger.error(f"Ingestion failed for {filename}: {e}")
        return {
            "document_id": doc_id,
            "filename": filename,
            "status": "error",
            "error": str(e),
            "node_count": 0,
            "chunk_count": 0,
        }


def _ingest_pdf(
    file_path: str, filename: str, doc_id: str, doc_type: Optional[str]
) -> dict:
    """Ingest a PDF document: extract text, parameters, store in Chroma + PKG."""
    # Extract text pages
    pages = extract_text_from_pdf(file_path)
    node_count = 0
    chunk_count = 0

    # Store text chunks in Chroma for RAG retrieval
    for page_data in pages:
        documents, metadatas, ids = prepare_chunks_for_storage(
            text=page_data["text"],
            document_source=filename,
            page_number=page_data["page"],
        )
        if documents:
            chroma_store.add_documents(documents, metadatas, ids)
            chunk_count += len(documents)

    # Extract parameters and create PKG nodes
    if doc_type in ("spec", "specification"):
        # Spec document: create ContractClause nodes
        params = extract_parameters_from_pdf(file_path)
        for param_name, param_data in params.items():
            spec_dna_id = generate_spec_dna_id(
                document_source=filename,
                section=param_data.get("section", ""),
                parameter_name=param_name,
                parameter_value=str(param_data["value"]),
            )
            from backend.graph.schema import get_operator_for_parameter

            neo4j_client.execute_write(
                queries.MERGE_CONTRACT_CLAUSE,
                {
                    "spec_dna_id": spec_dna_id,
                    "section": param_data.get("section", ""),
                    "parameter_name": param_name,
                    "parameter_value": param_data["value"],
                    "unit": param_data.get("unit", ""),
                    "operator": get_operator_for_parameter(param_name),
                    "document_source": filename,
                    "page_number": param_data.get("page", 1),
                },
            )
            node_count += 1

    elif doc_type in ("submittal", "vendor_submittal"):
        # Vendor submittal: extract params and create VendorSubmittal node
        params = extract_parameters_from_pdf(file_path)
        submittal_id = doc_id

        # Detect vendor name and equipment tag from content
        vendor_name = "Unknown Vendor"
        equipment_tag = "UNKNOWN"

        for page_data in pages:
            text_lower = page_data["text"].lower()
            if "vendor:" in text_lower or "supplier:" in text_lower:
                import re
                match = re.search(r"(?:vendor|supplier)[:\s]+(.+?)(?:\n|$)", page_data["text"], re.IGNORECASE)
                if match:
                    vendor_name = match.group(1).strip()

        # Create submittal node
        spec_dna = generate_spec_dna_id(filename, "submittal", equipment_tag, vendor_name)
        import json

        neo4j_client.execute_write(
            queries.MERGE_VENDOR_SUBMITTAL,
            {
                "submittal_id": submittal_id,
                "spec_dna_id": spec_dna,
                "vendor_name": vendor_name,
                "equipment_tag": equipment_tag,
                "document_path": file_path,
                "status": "pending",
                "extracted_parameters": json.dumps(params),
                "r0_score": 0.0,
                "violation_count": 0,
            },
        )
        node_count += 1

    logger.info(
        f"PDF ingestion complete: {filename} → {node_count} nodes, {chunk_count} chunks"
    )
    return {
        "document_id": doc_id,
        "filename": filename,
        "status": "ingested",
        "node_count": node_count,
        "chunk_count": chunk_count,
    }


def _ingest_csv(file_path: str, filename: str, doc_id: str) -> dict:
    """Ingest a schedule CSV into task data."""
    tasks = parse_schedule_csv(file_path)

    # Store tasks in Chroma for Brain's retrieval
    for task in tasks:
        text = f"Task {task['task_id']}: {task['task_name']} — Status: {task['status']}, Progress: {task['progress_pct']}%"
        chroma_store.add_documents(
            documents=[text],
            metadatas=[{"document_source": filename, "task_id": task["task_id"]}],
            ids=[f"{filename}::{task['task_id']}"],
        )

    return {
        "document_id": doc_id,
        "filename": filename,
        "status": "ingested",
        "node_count": len(tasks),
        "chunk_count": len(tasks),
        "task_count": len(tasks),
    }


def _ingest_json(
    file_path: str, filename: str, doc_id: str, doc_type: Optional[str]
) -> dict:
    """Ingest a JSON file (supplier graph or checklist)."""
    if doc_type == "supplier" or "supplier" in filename.lower():
        data = parse_supplier_graph(file_path)
        node_count = len(data.get("suppliers", [])) + len(data.get("shipments", []))
        return {
            "document_id": doc_id,
            "filename": filename,
            "status": "ingested",
            "node_count": node_count,
            "chunk_count": 0,
        }
    else:
        data = parse_checklist(file_path)
        return {
            "document_id": doc_id,
            "filename": filename,
            "status": "ingested",
            "node_count": len(data.get("steps", [])),
            "chunk_count": 0,
        }
