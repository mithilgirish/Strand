# backend/ingestion/parsers/csv_parser.py — Schedule CSV parser
"""
Parses project schedule CSV (MS Project / Primavera export format).
Expected columns: task_id, task_name, start_date, end_date, status,
                   progress_pct, predecessors
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from loguru import logger


def parse_schedule_csv(file_path: str) -> list[dict[str, Any]]:
    """
    Parse a project schedule CSV into a list of task dicts.

    Args:
        file_path: Path to the CSV file

    Returns:
        List of task dicts with normalised fields
    """
    tasks = []

    try:
        with open(file_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                task = {
                    "task_id": row.get("task_id", "").strip(),
                    "task_name": row.get("task_name", "").strip(),
                    "start_date": row.get("start_date", "").strip(),
                    "end_date": row.get("end_date", "").strip(),
                    "status": row.get("status", "on_track").strip().lower(),
                    "progress_pct": _safe_float(row.get("progress_pct", "0")),
                    "predecessors": row.get("predecessors", "").strip(),
                    "discipline": row.get("discipline", "").strip(),
                    "equipment_tag": row.get("equipment_tag", "").strip(),
                }

                if task["task_id"]:
                    tasks.append(task)

        logger.info(f"Parsed {len(tasks)} tasks from {file_path}")

    except FileNotFoundError:
        logger.error(f"Schedule CSV not found: {file_path}")
    except Exception as e:
        logger.error(f"Failed to parse schedule CSV {file_path}: {e}")

    return tasks


def _safe_float(value: str) -> float:
    """Safely convert a string to float, defaulting to 0.0."""
    try:
        return float(value.strip())
    except (ValueError, AttributeError):
        return 0.0
