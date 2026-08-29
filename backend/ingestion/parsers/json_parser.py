# backend/ingestion/parsers/json_parser.py — JSON data loader
"""
Loads supplier graph data and commissioning checklists from JSON files.
"""

from __future__ import annotations

import json
from typing import Any

from loguru import logger


def parse_supplier_graph(file_path: str) -> dict[str, list[dict]]:
    """
    Parse supplier graph JSON.
    Expected format: {"suppliers": [...], "shipments": [...]}
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)

        suppliers = data.get("suppliers", [])
        shipments = data.get("shipments", [])

        logger.info(f"Parsed supplier graph: {len(suppliers)} suppliers, {len(shipments)} shipments")
        return {"suppliers": suppliers, "shipments": shipments}

    except FileNotFoundError:
        logger.error(f"Supplier graph file not found: {file_path}")
        return {"suppliers": [], "shipments": []}
    except Exception as e:
        logger.error(f"Failed to parse supplier graph {file_path}: {e}")
        return {"suppliers": [], "shipments": []}


def parse_checklist(file_path: str) -> dict[str, Any]:
    """
    Parse commissioning checklist JSON.
    Expected format: {"checklist_id": str, "title": str, "steps": [...]}
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)

        logger.info(f"Parsed checklist: {data.get('checklist_id', 'unknown')} with {len(data.get('steps', []))} steps")
        return data

    except FileNotFoundError:
        logger.error(f"Checklist file not found: {file_path}")
        return {"checklist_id": "", "title": "", "steps": []}
    except Exception as e:
        logger.error(f"Failed to parse checklist {file_path}: {e}")
        return {"checklist_id": "", "title": "", "steps": []}
