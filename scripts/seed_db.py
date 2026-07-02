import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from loguru import logger
from backend.graph.client import neo4j_client
from backend.graph.queries import (
    MERGE_CONTRACT_CLAUSE,
    MERGE_SUPPLIER,
    MERGE_SHIPMENT,
    LINK_SHIPMENT_SUPPLIER,
    MERGE_VENDOR_SUBMITTAL,
    WRITE_VIOLATION,
    MERGE_NCR,
    NCR_LINK_CLAUSE
)
import uuid

async def seed_database():
    """Seeds the Neo4j database with synthetic data for testing and demo purposes."""
    
    # Wait for Neo4j to be ready
    if not neo4j_client.verify_connectivity():
        logger.error("Could not connect to Neo4j. Please check your .env credentials and ensure the database is running.")
        return
        
    logger.info("Connected to Neo4j. Starting seed process...")
    
    # 1. Seed Contract Clauses (PKG Nodes)
    clauses = [
        {
            "spec_dna_id": "tia942-b-6.7.1",
            "section": "6.7.1",
            "parameter_name": "Maximum ambient temperature",
            "parameter_value": "50",
            "unit": "C",
            "operator": "MAX",
            "document_source": "TIA-942-B Facility Specification",
            "page_number": "14"
        },
        {
            "spec_dna_id": "tia942-b-8.3.4",
            "section": "8.3.4",
            "parameter_name": "Generator fuel consumption",
            "parameter_value": "260",
            "unit": "l/hr",
            "operator": "MAX",
            "document_source": "TIA-942-B Facility Specification",
            "page_number": "22"
        },
        {
            "spec_dna_id": "tia942-b-11.1",
            "section": "11.1",
            "parameter_name": "Chilled water supply temperature",
            "parameter_value": "10",
            "unit": "C",
            "operator": "MAX",
            "document_source": "TIA-942-B Facility Specification",
            "page_number": "41"
        }
    ]
    
    for c in clauses:
        neo4j_client.execute_query(MERGE_CONTRACT_CLAUSE, c)
    logger.info(f"Seeded {len(clauses)} Contract Clauses.")

    # 2. Seed Suppliers
    suppliers = [
        {
            "supplier_id": "SUPP-001",
            "name": "CoolTech Industrial",
            "tier": 1,
            "country": "Germany",
            "risk_score": 0.2,
            "on_time_rate": 0.95,
            "lat": 51.1657,
            "lng": 10.4515
        },
        {
            "supplier_id": "SUPP-002",
            "name": "GenForce Heavy Industries",
            "tier": 2,
            "country": "USA",
            "risk_score": 0.6,
            "on_time_rate": 0.75,
            "lat": 37.0902,
            "lng": -95.7129
        }
    ]
    
    for s in suppliers:
        neo4j_client.execute_query(MERGE_SUPPLIER, s)
    logger.info(f"Seeded {len(suppliers)} Suppliers.")

    # 3. Seed Shipments
    shipments = [
        {
            "shipment_id": "SHIP-8821",
            "equipment_tag": "CHILLER-01",
            "supplier_id": "SUPP-001",
            "origin_port": "Hamburg",
            "destination_port": "Mumbai",
            "expected_delivery": "2026-08-15",
            "current_status": "In Transit",
            "delay_days": 2,
            "risk_flag": False,
            "lat": 19.0760,
            "lng": 72.8777
        },
        {
            "shipment_id": "SHIP-9942",
            "equipment_tag": "GENSET-04",
            "supplier_id": "SUPP-002",
            "origin_port": "Los Angeles",
            "destination_port": "Mumbai",
            "expected_delivery": "2026-08-01",
            "current_status": "Delayed at Customs",
            "delay_days": 14,
            "risk_flag": True,
            "lat": 34.0522,
            "lng": -118.2437
        }
    ]
    
    for sh in shipments:
        neo4j_client.execute_query(MERGE_SHIPMENT, sh)
        neo4j_client.execute_query(LINK_SHIPMENT_SUPPLIER, {"shipment_id": sh["shipment_id"], "supplier_id": sh["supplier_id"]})
    logger.info(f"Seeded {len(shipments)} Shipments and linked to Suppliers.")

    # 4. Seed Submittals & Violations
    submittals = [
        {
            "submittal_id": "SUB-101",
            "spec_dna_id": "tia942-b-8.3.4",
            "vendor_name": "GenForce Heavy Industries",
            "equipment_tag": "GENSET-04",
            "document_path": "data/vendor_submittal_generator_minor.pdf",
            "status": "rejected",
            "extracted_parameters": '{"Generator fuel consumption": "265 l/hr"}',
            "r0_score": 4.5,
            "violation_count": 1
        }
    ]
    
    for sub in submittals:
        neo4j_client.execute_query(MERGE_VENDOR_SUBMITTAL, sub)
        # Create the violation
        neo4j_client.execute_query(WRITE_VIOLATION, {
            "submittal_id": sub["submittal_id"],
            "spec_dna_id": sub["spec_dna_id"],
            "deviation_type": "Exceeds Maximum Limit",
            "expected_value": "260 l/hr",
            "actual_value": "265 l/hr",
            "severity": "Medium",
            "r0_score": 4.5
        })
    logger.info("Seeded Vendor Submittals and Violations.")

    # 5. Seed NCRs
    ncrs = [
        {
            "ncr_id": "NCR-2026-001",
            "title": "Chiller Supply Temp Deviation",
            "description": "Field inspector noted the chilled water supply is running at 12C, exceeding the 10C limit.",
            "severity": "High",
            "raised_by": "Eng. Patel",
            "equipment_tag": "CHILLER-01",
            "spec_dna_ref": "tia942-b-11.1",
            "status": "open",
            "voice_transcript": "Yeah, I'm at the chiller block... temperature gauge is reading 12 degrees. That's over the limit.",
            "r0_score": 7.2
        }
    ]
    
    for ncr in ncrs:
        neo4j_client.execute_query(MERGE_NCR, ncr)
        neo4j_client.execute_query(NCR_LINK_CLAUSE, {
            "ncr_id": ncr["ncr_id"],
            "spec_dna_id": ncr["spec_dna_ref"]
        })
    logger.info("Seeded NCRs.")

    logger.info("✅ Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
