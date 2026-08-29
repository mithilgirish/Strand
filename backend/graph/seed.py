# backend/graph/seed.py — PKG seeder from synthetic data
"""
Seeds Neo4j PKG + Chroma from the files in data/.
Run via: python -m backend.graph.seed
"""

from __future__ import annotations

import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

from loguru import logger

from backend.demo_data import demo_contract_clauses
from backend.graph import queries
from backend.graph.client import neo4j_client
from backend.graph.schema import init_schema
from backend.vector.embedder import prepare_chunks_for_storage
from backend.vector.store import chroma_store

DATA_DIR = Path(__file__).parent.parent.parent / "data"


def seed_all():
    """Seed the entire PKG from synthetic data."""
    logger.info("Starting PKG seed...")
    random.seed(42)  # Make seed deterministic to prevent duplicate paths if rerun

    # 1. Initialize schema constraints
    init_schema(neo4j_client)

    # 2. Seed spec contract clauses
    seed_contract_clauses()

    # 3. Seed supplier graph
    seed_suppliers()

    # 4. Seed schedule data into Chroma
    seed_schedule_to_chroma()

    # 5. Seed spec PDF into Chroma
    seed_spec_to_chroma()

    logger.info("PKG seed complete")


def seed_contract_clauses():
    """Seed ContractClause nodes from the TIA-942 spec."""
    clauses = demo_contract_clauses()

    for clause in clauses:
        neo4j_client.execute_write(
            queries.MERGE_CONTRACT_CLAUSE,
            {
                "spec_dna_id": clause["spec_dna_id"],
                "section": clause["section"],
                "parameter_name": clause["parameter_name"],
                "parameter_value": clause["required_value"],
                "unit": clause["unit"],
                "operator": clause["operator"],
                "document_source": clause["document_source"],
                "page_number": clause["page"],
            },
        )

    logger.info(f"Seeded {len(clauses)} ContractClause nodes")


def seed_suppliers():
    """Seed Supplier and Shipment nodes from supplier_graph_data.json."""
    supplier_file = DATA_DIR / "supplier_graph_data.json"
    if not supplier_file.exists():
        logger.warning("supplier_graph_data.json not found, skipping supplier seed")
        return

    with open(supplier_file) as f:
        data = json.load(f)

    # Locations for geo data
    locations = [
        ("Shanghai", "CN", 31.23, 121.47),
        ("Mumbai", "IN", 19.08, 72.88),
        ("Dubai", "AE", 25.20, 55.27),
        ("Hamburg", "DE", 53.55, 9.99),
        ("Tokyo", "JP", 35.68, 139.69),
        ("Singapore", "SG", 1.35, 103.82),
        ("Seoul", "KR", 37.57, 126.98),
        ("Rotterdam", "NL", 51.92, 4.48),
    ]

    for sup in data.get("suppliers", []):
        loc = random.choice(locations)
        neo4j_client.execute_write(
            queries.MERGE_SUPPLIER,
            {
                "supplier_id": sup["id"],
                "name": sup["name"],
                "tier": sup["tier"],
                "country": loc[1],
                "risk_score": round(sup.get("risk_score", random.uniform(0.1, 0.9)), 2),
                "on_time_rate": round(random.uniform(0.7, 0.99), 2),
                "lat": loc[2] + random.uniform(-1, 1),
                "lng": loc[3] + random.uniform(-1, 1),
            },
        )

    for ship in data.get("shipments", []):
        origin_loc = random.choice(locations)
        neo4j_client.execute_write(
            queries.MERGE_SHIPMENT,
            {
                "shipment_id": ship["id"],
                "equipment_tag": f"EQ-{random.randint(1, 20):03d}",
                "supplier_id": ship["origin_supplier"],
                "origin_port": origin_loc[0],
                "destination_port": "Site A",
                "expected_delivery": ship.get("eta", "2026-08-01"),
                "current_status": "at_risk" if ship.get("risk_flag") else "on_track",
                "delay_days": random.randint(0, 14) if ship.get("risk_flag") else 0,
                "risk_flag": ship.get("risk_flag", False),
                "lat": origin_loc[2],
                "lng": origin_loc[3],
            },
        )
        # Link shipment to supplier
        neo4j_client.execute_write(
            queries.LINK_SHIPMENT_SUPPLIER,
            {"shipment_id": ship["id"], "supplier_id": ship["origin_supplier"]},
        )

    logger.info(f"Seeded {len(data.get('suppliers', []))} suppliers, {len(data.get('shipments', []))} shipments")


def seed_schedule_to_chroma():
    """Store schedule tasks in Chroma for Brain retrieval."""
    from backend.ingestion.parsers.csv_parser import parse_schedule_csv

    csv_file = DATA_DIR / "project_schedule_100tasks.csv"
    if not csv_file.exists():
        logger.warning("Schedule CSV not found, skipping")
        return

    tasks = parse_schedule_csv(str(csv_file))
    documents = []
    metadatas = []
    ids = []

    for task in tasks:
        text = (
            f"Task {task['task_id']}: {task['task_name']}. "
            f"Status: {task['status']}. Progress: {task['progress_pct']}%. "
            f"Start: {task['start_date']}, End: {task['end_date']}. "
            f"Predecessors: {task['predecessors'] or 'none'}."
        )
        documents.append(text)
        metadatas.append({"document_source": "project_schedule_100tasks.csv", "task_id": task["task_id"]})
        ids.append(f"schedule::{task['task_id']}")

    if documents:
        chroma_store.add_documents(documents, metadatas, ids)
        logger.info(f"Seeded {len(documents)} schedule tasks to Chroma")


def seed_spec_to_chroma():
    """Store spec PDF text in Chroma for Brain retrieval."""
    from backend.ingestion.parsers.pdf_parser import extract_text_from_pdf

    pdf_file = DATA_DIR / "spec_tia942_synthetic.pdf"
    if not pdf_file.exists():
        logger.warning("Spec PDF not found, skipping Chroma seed")
        return

    pages = extract_text_from_pdf(str(pdf_file))
    bm25_corpus = []
    total_chunks = 0

    for page_data in pages:
        documents, metadatas, ids = prepare_chunks_for_storage(
            text=page_data["text"],
            document_source="spec_tia942_synthetic.pdf",
            page_number=page_data["page"],
        )
        if documents:
            chroma_store.add_documents(documents, metadatas, ids)
            bm25_corpus.extend({"text": doc, "metadata": meta} for doc, meta in zip(documents, metadatas))
            total_chunks += len(documents)

    if bm25_corpus:
        from backend.vector.retriever import hybrid_retriever

        hybrid_retriever.build_bm25_index(bm25_corpus)

    logger.info(f"Seeded {total_chunks} spec chunks to Chroma")


if __name__ == "__main__":
    seed_all()
