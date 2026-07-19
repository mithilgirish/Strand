#!/usr/bin/env python3
"""
Strand Synthetic Test Data Generator
=====================================
Generates three tiers of test data for all STRAND subsystems:
  1. CLEAN   – Golden-path data, perfectly formatted
  2. MESSY   – Realistic imperfections (typos, mixed casing, extra whitespace, etc.)
  3. EDGE    – Boundary conditions, nulls, extreme values, circular deps, etc.

Data types generated:
  • Schedule CSV         (scheduler agent)
  • Supplier Graph JSON  (oracle agent)
  • Commissioning JSON   (inspector agent)
  • Vendor Submittal PDFs (guardian agent)

Usage:
    python scripts/generate_test_data.py
"""
from __future__ import annotations

import csv
import json
import os
import random
import string
from datetime import datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Output directory
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "test_scenarios"


# ===========================================================================
# 1. SCHEDULE CSV GENERATOR
# ===========================================================================

DISCIPLINES = [
    "Civil", "Electrical", "Mechanical", "Structural", "HVAC",
    "Fire Safety", "Controls", "IT Infrastructure", "Security",
    "Commissioning", "Architectural", "Documentation", "Training",
    "Project Management", "Logistics",
]

EQUIPMENT_TAGS = [
    "EQ-HV-01", "EQ-LV-01", "EQ-UPS-01", "EQ-UPS-02", "EQ-GEN-01",
    "EQ-GEN-02", "EQ-CH-01", "EQ-CH-02", "EQ-CRAH-01", "EQ-CRAH-02",
    "EQ-PDU-01", "EQ-PDU-02", "EQ-PDU-03", "EQ-BAT-01", "EQ-BAT-02",
    "EQ-ATS-01", "EQ-FD-01", "EQ-FS-01", "EQ-FA-01", "EQ-BMS-01",
    "EQ-SCADA-01", "EQ-NET-01", "EQ-ACS-01", "EQ-TX-01", "EQ-TX-02",
    "CT-01", "CT-02",
]

TASK_NAMES_POOL = [
    "Site Clearing & Grading", "Foundation Excavation", "Pile Driving",
    "Concrete Raft Foundation", "Underground Cable Trench",
    "Steel Column Erection", "Roof Steel Installation", "Metal Deck Laying",
    "Raised Floor Substructure", "External Wall Cladding",
    "HV Switchgear Room Build", "LV Distribution Board Install",
    "Cable Tray Routing", "Fire Detection System Install",
    "UPS Room Civil Works", "UPS Unit Delivery & Placement",
    "Battery Room Construction", "Battery Bank Installation",
    "Generator Pad Construction", "Generator Set Delivery",
    "Generator Fuel System Install", "Generator Exhaust System",
    "Generator Electrical Hookup", "ATS Panel Installation",
    "Generator Load Bank Testing", "Cooling Tower Foundation",
    "Cooling Tower Assembly", "Cooling Water Piping",
    "Chiller Unit Delivery", "Chiller Installation & Hookup",
    "CRAH Unit Placement", "Chilled Water Loop Commissioning",
    "Raised Floor Tile Installation", "Under-Floor Cable Routing",
    "PDU Installation - Row A", "PDU Installation - Row B",
    "Busway Installation", "RPP Panel Wiring", "Server Rack Placement",
    "Hot/Cold Aisle Containment", "Fire Suppression Piping",
    "FM-200 System Installation", "Fire Alarm Panel Integration",
    "Smoke Detection Testing", "BMS Controller Installation",
    "BMS Sensor Wiring", "BMS Software Configuration",
    "SCADA Integration", "CCTV Installation", "Access Control System",
]


def _generate_schedule_clean(num_tasks: int = 60) -> list[dict]:
    """Generate a clean schedule with valid predecessors, dates, and statuses."""
    base_date = datetime(2026, 8, 1)
    tasks = []
    for i in range(1, num_tasks + 1):
        tid = f"TC{i:03d}"
        start = base_date + timedelta(days=(i - 1) * 2)
        end = start + timedelta(days=random.randint(3, 8))
        status = random.choice(["on_track", "on_track", "on_track", "delayed", "at_risk"])
        predecessors = ""
        if i > 1:
            pred_count = min(random.randint(1, 2), i - 1)
            pred_ids = random.sample(range(max(1, i - 5), i), pred_count)
            predecessors = ";".join(f"TC{p:03d}" for p in pred_ids)
        progress = random.randint(0, 100) if status != "delayed" else random.randint(0, 30)
        discipline = random.choice(DISCIPLINES)
        eq_tag = random.choice(EQUIPMENT_TAGS) if random.random() > 0.4 else ""
        tasks.append({
            "task_id": tid,
            "task_name": random.choice(TASK_NAMES_POOL) + (f" - Zone {chr(64 + (i % 4) + 1)}" if i % 3 == 0 else ""),
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
            "status": status,
            "progress_pct": progress,
            "predecessors": predecessors,
            "discipline": discipline,
            "equipment_tag": eq_tag,
        })
    return tasks


def _generate_schedule_messy(num_tasks: int = 50) -> list[dict]:
    """Generate messy schedule data with realistic imperfections."""
    base_date = datetime(2026, 8, 1)
    tasks = []
    for i in range(1, num_tasks + 1):
        tid = f"TM{i:03d}"
        start = base_date + timedelta(days=(i - 1) * 2)
        end = start + timedelta(days=random.randint(3, 8))
        status = random.choice(["on_track", "delayed", "at_risk", "On_Track", "DELAYED", "  on_track ", "at risk"])
        predecessors = ""
        if i > 1:
            pred_count = min(random.randint(1, 3), i - 1)
            pred_ids = random.sample(range(max(1, i - 5), i), pred_count)
            # Mix separators: semicolons, commas, spaces
            sep = random.choice([";", ",", "; ", ", "])
            predecessors = sep.join(f"TM{p:03d}" for p in pred_ids)

        progress = random.choice([
            str(random.randint(0, 100)),    # Normal
            f" {random.randint(0, 100)} ",  # Extra whitespace
            f"{random.uniform(0, 100):.1f}",  # Float
            "",                               # Empty
            "N/A",                            # Non-numeric
            "-5",                             # Negative
            "110",                            # Over 100
        ])

        name = random.choice(TASK_NAMES_POOL)
        # Introduce messy names
        if random.random() < 0.2:
            name = name.upper()  # ALL CAPS
        elif random.random() < 0.15:
            name = f"  {name}  "  # Extra whitespace
        elif random.random() < 0.1:
            name = name + " (REVISED)"  # Annotation
        elif random.random() < 0.1:
            name = name.replace("&", "and")  # Inconsistent encoding

        # Mix date formats
        date_format = random.choice(["%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y", "%d-%b-%Y"])
        start_str = start.strftime(date_format)
        end_str = end.strftime(date_format)

        discipline = random.choice(DISCIPLINES)
        if random.random() < 0.15:
            discipline = discipline.lower()  # Inconsistent casing
        elif random.random() < 0.1:
            discipline = f" {discipline} "  # Extra whitespace

        eq_tag = random.choice(EQUIPMENT_TAGS) if random.random() > 0.4 else ""
        if eq_tag and random.random() < 0.15:
            eq_tag = eq_tag.lower()  # Inconsistent casing

        tasks.append({
            "task_id": tid,
            "task_name": name,
            "start_date": start_str,
            "end_date": end_str,
            "status": status,
            "progress_pct": progress,
            "predecessors": predecessors,
            "discipline": discipline,
            "equipment_tag": eq_tag,
        })
    return tasks


def _generate_schedule_edge(num_tasks: int = 40) -> list[dict]:
    """Generate edge-case schedule data to stress-test parsing & logic."""
    base_date = datetime(2026, 8, 1)
    tasks = []

    # 1. Normal baseline tasks (first 10)
    for i in range(1, 11):
        tid = f"TE{i:03d}"
        start = base_date + timedelta(days=(i - 1) * 2)
        end = start + timedelta(days=5)
        preds = f"TE{i-1:03d}" if i > 1 else ""
        tasks.append({
            "task_id": tid, "task_name": f"Baseline Task {i}",
            "start_date": start.strftime("%Y-%m-%d"), "end_date": end.strftime("%Y-%m-%d"),
            "status": "on_track", "progress_pct": str(random.randint(10, 90)),
            "predecessors": preds, "discipline": "Civil", "equipment_tag": "",
        })

    # 2. Circular dependency chain: TE011 -> TE012 -> TE013 -> TE011
    for i, preds in [(11, "TE013"), (12, "TE011"), (13, "TE012")]:
        start = base_date + timedelta(days=20 + i)
        end = start + timedelta(days=5)
        tasks.append({
            "task_id": f"TE{i:03d}", "task_name": f"Circular Dep Task {i}",
            "start_date": start.strftime("%Y-%m-%d"), "end_date": end.strftime("%Y-%m-%d"),
            "status": "at_risk", "progress_pct": "50",
            "predecessors": preds, "discipline": "Electrical", "equipment_tag": "",
        })

    # 3. Zero-duration task (milestone)
    tasks.append({
        "task_id": "TE014", "task_name": "Milestone: Phase 1 Complete",
        "start_date": "2026-08-30", "end_date": "2026-08-30",
        "status": "on_track", "progress_pct": "0",
        "predecessors": "TE010", "discipline": "Project Management", "equipment_tag": "",
    })

    # 4. End date BEFORE start date
    tasks.append({
        "task_id": "TE015", "task_name": "Negative Duration Task",
        "start_date": "2026-09-15", "end_date": "2026-09-10",
        "status": "on_track", "progress_pct": "25",
        "predecessors": "TE014", "discipline": "Civil", "equipment_tag": "",
    })

    # 5. Very long task name (255+ chars)
    tasks.append({
        "task_id": "TE016",
        "task_name": "A" * 300 + " - Extremely Long Task Name Edge Case",
        "start_date": "2026-09-01", "end_date": "2026-09-10",
        "status": "on_track", "progress_pct": "50",
        "predecessors": "TE010", "discipline": "Civil", "equipment_tag": "",
    })

    # 6. Task with ALL predecessors (maximum fan-in)
    all_preds = ";".join(f"TE{j:03d}" for j in range(1, 11))
    tasks.append({
        "task_id": "TE017", "task_name": "Max Fan-In Task",
        "start_date": "2026-09-05", "end_date": "2026-09-12",
        "status": "delayed", "progress_pct": "5",
        "predecessors": all_preds, "discipline": "Commissioning", "equipment_tag": "EQ-GEN-01",
    })

    # 7. Self-referencing predecessor
    tasks.append({
        "task_id": "TE018", "task_name": "Self-Reference Task",
        "start_date": "2026-09-06", "end_date": "2026-09-12",
        "status": "at_risk", "progress_pct": "10",
        "predecessors": "TE018", "discipline": "Controls", "equipment_tag": "",
    })

    # 8. Reference to non-existent predecessor
    tasks.append({
        "task_id": "TE019", "task_name": "Orphan Predecessor Reference",
        "start_date": "2026-09-08", "end_date": "2026-09-14",
        "status": "on_track", "progress_pct": "60",
        "predecessors": "TE999;TE998", "discipline": "Electrical", "equipment_tag": "",
    })

    # 9. Empty task_id (should be filtered out by parser)
    tasks.append({
        "task_id": "", "task_name": "Ghost Task No ID",
        "start_date": "2026-09-10", "end_date": "2026-09-15",
        "status": "on_track", "progress_pct": "0",
        "predecessors": "", "discipline": "Civil", "equipment_tag": "",
    })

    # 10. Unicode/special characters in name
    tasks.append({
        "task_id": "TE020", "task_name": "Install 500kVA UPS — «Phase α» (≥N+1) ⚡",
        "start_date": "2026-09-12", "end_date": "2026-09-18",
        "status": "on_track", "progress_pct": "35",
        "predecessors": "TE010", "discipline": "Electrical", "equipment_tag": "EQ-UPS-01",
    })

    # 11. Invalid date format
    tasks.append({
        "task_id": "TE021", "task_name": "Invalid Date Task",
        "start_date": "not-a-date", "end_date": "also-not",
        "status": "on_track", "progress_pct": "50",
        "predecessors": "TE010", "discipline": "Civil", "equipment_tag": "",
    })

    # 12. Massive progress value
    tasks.append({
        "task_id": "TE022", "task_name": "Over-Reported Progress",
        "start_date": "2026-09-14", "end_date": "2026-09-20",
        "status": "on_track", "progress_pct": "99999",
        "predecessors": "TE010", "discipline": "Electrical", "equipment_tag": "",
    })

    # 13. Task with status = unknown value
    tasks.append({
        "task_id": "TE023", "task_name": "Unknown Status Task",
        "start_date": "2026-09-15", "end_date": "2026-09-22",
        "status": "cancelled", "progress_pct": "100",
        "predecessors": "TE010", "discipline": "Civil", "equipment_tag": "",
    })

    # 14. Duplicate task_id (two tasks same ID)
    tasks.append({
        "task_id": "TE001", "task_name": "DUPLICATE of Baseline Task 1",
        "start_date": "2026-09-20", "end_date": "2026-09-25",
        "status": "delayed", "progress_pct": "0",
        "predecessors": "", "discipline": "Civil", "equipment_tag": "",
    })

    # 15. Far future dates
    tasks.append({
        "task_id": "TE024", "task_name": "Far Future Task",
        "start_date": "2099-12-01", "end_date": "2099-12-31",
        "status": "on_track", "progress_pct": "0",
        "predecessors": "", "discipline": "Civil", "equipment_tag": "",
    })

    # 16. Past dates
    tasks.append({
        "task_id": "TE025", "task_name": "Historical Task",
        "start_date": "2020-01-01", "end_date": "2020-01-10",
        "status": "on_track", "progress_pct": "100",
        "predecessors": "", "discipline": "Documentation", "equipment_tag": "",
    })

    return tasks


def _write_schedule_csv(tasks: list[dict], filepath: Path) -> None:
    """Write schedule tasks to CSV."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["task_id", "task_name", "start_date", "end_date", "status",
                  "progress_pct", "predecessors", "discipline", "equipment_tag"]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(tasks)


# ===========================================================================
# 2. SUPPLIER GRAPH JSON GENERATOR
# ===========================================================================

SUPPLIER_NAMES = [
    "Schneider Electric India", "ABB Power Products", "Vertiv Energy Pvt Ltd",
    "Cummins India Ltd", "Kirloskar Electric Co", "Emerson Climate Tech",
    "Siemens Energy India", "Tata Power SED", "L&T Electrical", "Thermax Ltd",
    "Blue Star Limited", "Carrier Midea India", "Caterpillar India",
    "Eaton India", "Legrand India", "Havells India Ltd", "Godrej & Boyce",
    "Voltas Ltd", "Danfoss India", "Rittal India Pvt Ltd",
    "Panduit India", "APC by Schneider", "Stulz India",
    "Delta Electronics India", "Fuji Electric India",
]

CITIES = [
    ("Pune", "Maharashtra", 18.52, 73.86), ("Chennai", "Tamil Nadu", 13.08, 80.27),
    ("Mumbai", "Maharashtra", 19.08, 72.88), ("Bengaluru", "Karnataka", 12.97, 77.59),
    ("Hyderabad", "Telangana", 17.39, 78.49), ("Delhi NCR", "Delhi", 28.61, 77.21),
    ("Ahmedabad", "Gujarat", 23.02, 72.57), ("Kolkata", "West Bengal", 22.57, 88.36),
]

PORTS = ["JNPT Mumbai", "Chennai Port", "Visakhapatnam Port", "Cochin Port",
         "Kolkata Port", "Mundra Port", "Nhava Sheva"]

DELAY_REASONS = [
    "Vendor Manufacturing Delay", "Customs Clearance Delay",
    "Transport Strike Impact", "Raw Material Shortage",
    "Quality Rejection at Factory", "Port Congestion",
    "Monsoon Disruption", "Documentation Error",
    "Payment Dispute", "Force Majeure - Flooding",
]


def _generate_supplier_graph_clean() -> dict:
    """Generate clean supplier & shipment data."""
    suppliers = []
    for i, name in enumerate(SUPPLIER_NAMES[:20], 1):
        city, state, lat, lng = CITIES[i % len(CITIES)]
        tier = 1 if i <= 8 else (2 if i <= 16 else 3)
        suppliers.append({
            "id": f"SUPP-C{i:03d}",
            "name": name,
            "tier": tier,
            "risk_score": round(random.uniform(0.1, 0.9), 4),
            "country": "India",
            "city": city, "state": state,
            "lat": round(lat + random.uniform(-0.5, 0.5), 6),
            "lng": round(lng + random.uniform(-0.5, 0.5), 6),
            "on_time_rate": round(random.uniform(0.65, 0.99), 2),
        })

    shipments = []
    for i in range(1, 26):
        supplier = random.choice(suppliers)
        is_risky = random.random() < 0.15
        delay = random.randint(5, 20) if is_risky else 0
        eta = datetime(2026, 8, 1) + timedelta(days=random.randint(1, 45))
        shipments.append({
            "id": f"SHIP-C{i:03d}",
            "origin_supplier": supplier["id"],
            "destination": "Site A",
            "eta": eta.strftime("%Y-%m-%d"),
            "risk_flag": is_risky,
            "lat": round(supplier["lat"] + random.uniform(-2, 2), 6),
            "lng": round(supplier["lng"] + random.uniform(-2, 2), 6),
            "supplier_name": supplier["name"],
            "equipment_tag": random.choice(EQUIPMENT_TAGS),
            "origin_port": random.choice(PORTS),
            "destination_port": "JNPT Mumbai",
            "expected_delivery": eta.strftime("%Y-%m-%d"),
            "delay_days": delay,
            "current_status": random.choice(DELAY_REASONS) if is_risky else "on_track",
        })

    return {"suppliers": suppliers, "shipments": shipments}


def _generate_supplier_graph_messy() -> dict:
    """Generate messy supplier data with inconsistencies."""
    suppliers = []
    for i in range(1, 16):
        city, state, lat, lng = CITIES[i % len(CITIES)]
        name = random.choice(SUPPLIER_NAMES)
        # Messy variations
        if random.random() < 0.2:
            name = name.upper()
        if random.random() < 0.15:
            name = f"  {name}  "

        tier = random.choice([1, 2, 3, 0, -1, 4, "unknown"])  # Invalid tiers
        risk_score = random.choice([
            round(random.uniform(0, 1), 4),
            round(random.uniform(-0.5, 2.0), 4),  # Out of range
            "N/A",
            None,
        ])

        on_time = random.choice([
            round(random.uniform(0.5, 1.0), 2),
            round(random.uniform(1.0, 1.5), 2),  # Over 1.0
            -0.1,
            "pending",
            None,
        ])

        suppliers.append({
            "id": f"SUPP-M{i:03d}",
            "name": name,
            "tier": tier,
            "risk_score": risk_score,
            "country": random.choice(["India", "india", "IN", "IND", " India "]),
            "city": city if random.random() > 0.1 else f" {city.lower()} ",
            "state": state,
            "lat": round(lat + random.uniform(-1, 1), 6) if random.random() > 0.1 else "unknown",
            "lng": round(lng + random.uniform(-1, 1), 6) if random.random() > 0.1 else None,
            "on_time_rate": on_time,
        })

    shipments = []
    for i in range(1, 16):
        supplier = random.choice(suppliers)
        eta_raw = datetime(2026, 8, 1) + timedelta(days=random.randint(1, 45))
        # Mix date formats
        date_fmt = random.choice(["%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"])
        shipments.append({
            "id": f"SHIP-M{i:03d}",
            "origin_supplier": supplier["id"],
            "destination": random.choice(["Site A", "site a", "Site-A", "SITE A", ""]),
            "eta": eta_raw.strftime(date_fmt),
            "risk_flag": random.choice([True, False, "yes", "no", 1, 0, None]),
            "lat": round(random.uniform(8, 30), 6),
            "lng": round(random.uniform(70, 90), 6),
            "supplier_name": supplier["name"],
            "equipment_tag": random.choice(EQUIPMENT_TAGS + [""]),
            "origin_port": random.choice(PORTS + ["Unknown Port"]),
            "destination_port": random.choice(["JNPT Mumbai", "", "TBD"]),
            "expected_delivery": eta_raw.strftime(date_fmt),
            "delay_days": random.choice([0, 5, 10, -3, "unknown", None]),
            "current_status": random.choice(DELAY_REASONS + ["on_track", "", None]),
        })

    return {"suppliers": suppliers, "shipments": shipments}


def _generate_supplier_graph_edge() -> dict:
    """Generate edge-case supplier data."""
    suppliers = [
        # Normal supplier
        {
            "id": "SUPP-E001", "name": "Normal Supplier Co", "tier": 1,
            "risk_score": 0.5, "country": "India", "city": "Mumbai",
            "state": "Maharashtra", "lat": 19.08, "lng": 72.88, "on_time_rate": 0.85
        },
        # Empty name
        {
            "id": "SUPP-E002", "name": "", "tier": 1,
            "risk_score": 0.3, "country": "India", "city": "Delhi NCR",
            "state": "Delhi", "lat": 28.61, "lng": 77.21, "on_time_rate": 0.9
        },
        # Duplicate ID
        {
            "id": "SUPP-E001", "name": "Duplicate ID Supplier", "tier": 2,
            "risk_score": 0.7, "country": "India", "city": "Chennai",
            "state": "Tamil Nadu", "lat": 13.08, "lng": 80.27, "on_time_rate": 0.6
        },
        # Risk score at exact boundaries
        {
            "id": "SUPP-E003", "name": "Zero Risk Supplier", "tier": 1,
            "risk_score": 0.0, "country": "India", "city": "Pune",
            "state": "Maharashtra", "lat": 18.52, "lng": 73.86, "on_time_rate": 1.0
        },
        {
            "id": "SUPP-E004", "name": "Max Risk Supplier", "tier": 3,
            "risk_score": 1.0, "country": "India", "city": "Kolkata",
            "state": "West Bengal", "lat": 22.57, "lng": 88.36, "on_time_rate": 0.0
        },
        # Coordinates at (0,0) — Null Island
        {
            "id": "SUPP-E005", "name": "Null Island Supplier", "tier": 2,
            "risk_score": 0.5, "country": "Unknown", "city": "",
            "state": "", "lat": 0.0, "lng": 0.0, "on_time_rate": 0.75
        },
        # Very long supplier name
        {
            "id": "SUPP-E006", "name": "X" * 500, "tier": 1,
            "risk_score": 0.4, "country": "India", "city": "Bengaluru",
            "state": "Karnataka", "lat": 12.97, "lng": 77.59, "on_time_rate": 0.88
        },
        # Negative coordinates (valid — south/west hemisphere edge)
        {
            "id": "SUPP-E007", "name": "Southern Hemisphere Supplier", "tier": 1,
            "risk_score": 0.3, "country": "Australia", "city": "Sydney",
            "state": "NSW", "lat": -33.87, "lng": 151.21, "on_time_rate": 0.95
        },
        # Missing multiple optional fields
        {
            "id": "SUPP-E008", "name": "Minimal Data Supplier", "tier": None,
            "risk_score": None, "country": None, "city": None,
            "state": None, "lat": None, "lng": None, "on_time_rate": None
        },
    ]

    shipments = [
        # Normal shipment
        {
            "id": "SHIP-E001", "origin_supplier": "SUPP-E001",
            "destination": "Site A", "eta": "2026-08-15", "risk_flag": False,
            "lat": 19.5, "lng": 73.5, "supplier_name": "Normal Supplier Co",
            "equipment_tag": "EQ-GEN-01", "origin_port": "JNPT Mumbai",
            "destination_port": "JNPT Mumbai", "expected_delivery": "2026-08-15",
            "delay_days": 0, "current_status": "on_track"
        },
        # Reference to non-existent supplier
        {
            "id": "SHIP-E002", "origin_supplier": "SUPP-GHOST",
            "destination": "Site A", "eta": "2026-08-20", "risk_flag": True,
            "lat": 20.0, "lng": 75.0, "supplier_name": "Ghost Supplier",
            "equipment_tag": "EQ-UPS-01", "origin_port": "Chennai Port",
            "destination_port": "JNPT Mumbai", "expected_delivery": "2026-08-20",
            "delay_days": 999, "current_status": "Supplier Disappeared"
        },
        # ETA in the past
        {
            "id": "SHIP-E003", "origin_supplier": "SUPP-E001",
            "destination": "Site A", "eta": "2024-01-01", "risk_flag": True,
            "lat": 19.0, "lng": 73.0, "supplier_name": "Normal Supplier Co",
            "equipment_tag": "EQ-CH-01", "origin_port": "JNPT Mumbai",
            "destination_port": "JNPT Mumbai", "expected_delivery": "2024-01-01",
            "delay_days": 900, "current_status": "Lost in Transit"
        },
        # Duplicate shipment ID
        {
            "id": "SHIP-E001", "origin_supplier": "SUPP-E004",
            "destination": "Site B", "eta": "2026-09-01", "risk_flag": False,
            "lat": 22.0, "lng": 88.0, "supplier_name": "Max Risk Supplier",
            "equipment_tag": "EQ-PDU-01", "origin_port": "Kolkata Port",
            "destination_port": "JNPT Mumbai", "expected_delivery": "2026-09-01",
            "delay_days": 0, "current_status": "on_track"
        },
        # Negative delay_days (arrived early)
        {
            "id": "SHIP-E004", "origin_supplier": "SUPP-E003",
            "destination": "Site A", "eta": "2026-08-10", "risk_flag": False,
            "lat": 18.5, "lng": 73.8, "supplier_name": "Zero Risk Supplier",
            "equipment_tag": "EQ-BAT-01", "origin_port": "JNPT Mumbai",
            "destination_port": "JNPT Mumbai", "expected_delivery": "2026-08-10",
            "delay_days": -5, "current_status": "Delivered Early"
        },
        # Empty equipment tag
        {
            "id": "SHIP-E005", "origin_supplier": "SUPP-E001",
            "destination": "Site A", "eta": "2026-08-25", "risk_flag": False,
            "lat": 19.2, "lng": 73.1, "supplier_name": "Normal Supplier Co",
            "equipment_tag": "", "origin_port": "", "destination_port": "",
            "expected_delivery": "2026-08-25", "delay_days": 0,
            "current_status": "on_track"
        },
    ]

    return {"suppliers": suppliers, "shipments": shipments}


# ===========================================================================
# 3. COMMISSIONING CHECKLIST GENERATOR
# ===========================================================================

CHECKLIST_STEPS_POOL = [
    "Verify oil level is within operating range",
    "Check coolant temperature ≤ 85°C at full load",
    "Confirm battery terminal voltage ≥ 24V DC",
    "Inspect exhaust flange gasket for leaks",
    "Test emergency stop button functionality",
    "Verify phase rotation A-B-C sequence",
    "Check vibration levels ≤ 4.5 mm/s RMS",
    "Confirm fuel system leak test pass at 1.5x operating pressure",
    "Verify automatic transfer switch response ≤ 10 seconds",
    "Check generator frequency within 50Hz ± 0.5Hz",
    "Measure insulation resistance ≥ 10 MΩ at 1000V DC",
    "Verify fire suppression interlock with main breaker",
    "Confirm UPS output voltage within ±1% of nominal",
    "Test battery autonomy ≥ 15 minutes at rated load",
    "Verify cooling water flow rate ≥ 500 L/min",
    "Check PDU input/output breaker trip curves",
    "Confirm BMS alarm integration test pass",
    "Verify VESDA smoke detection response ≤ 60 seconds",
    "Measure earth resistance ≤ 1Ω",
    "Test dual-path power switchover < 4ms",
]


def _generate_checklist_clean(equipment_tag: str = "EQ-GEN-01") -> dict:
    steps = []
    for i, desc in enumerate(CHECKLIST_STEPS_POOL[:12], 1):
        steps.append({
            "step": i,
            "description": desc,
            "status": "pending",
        })
    return {
        "checklist_id": f"IST-CLEAN-{equipment_tag}",
        "title": f"{equipment_tag} Commissioning Checklist",
        "equipment_tag": equipment_tag,
        "steps": steps,
    }


def _generate_checklist_messy(equipment_tag: str = "EQ-UPS-01") -> dict:
    steps = []
    for i in range(1, 16):
        desc = random.choice(CHECKLIST_STEPS_POOL)
        status = random.choice(["pending", "Pending", "PENDING", " pending ", "pass", "fail",
                                 "n/a", "N/A", "skipped", ""])
        if random.random() < 0.1:
            desc = ""  # Empty description
        if random.random() < 0.1:
            desc = desc.upper()

        steps.append({
            "step": i if random.random() > 0.1 else random.choice([0, -1, "A", None]),
            "description": desc,
            "status": status,
        })
    return {
        "checklist_id": f"IST-MESSY-{equipment_tag}",
        "title": f"  {equipment_tag}   Commissioning Checklist (REVISED) ",
        "equipment_tag": equipment_tag,
        "steps": steps,
    }


def _generate_checklist_edge() -> dict:
    """Edge cases for checklist data."""
    steps = [
        # Normal step
        {"step": 1, "description": "Normal verification step", "status": "pending"},
        # Duplicate step numbers
        {"step": 1, "description": "Duplicate step number", "status": "pending"},
        # Step 0
        {"step": 0, "description": "Step zero - should it exist?", "status": "pending"},
        # Negative step
        {"step": -1, "description": "Negative step number", "status": "pending"},
        # Very long description
        {"step": 2, "description": "V" * 2000, "status": "pending"},
        # Unicode/special chars
        {"step": 3, "description": "Check voltage ≥ 230V ± 5% @ 50Hz — «critical»", "status": "pending"},
        # Step with extra unexpected fields
        {"step": 4, "description": "Step with extras", "status": "pending",
         "extra_field": "surprise", "nested": {"deep": True}},
        # Empty step
        {"step": None, "description": None, "status": None},
        # HTML injection attempt
        {"step": 5, "description": '<script>alert("xss")</script> Check breaker', "status": "pending"},
        # SQL injection attempt
        {"step": 6, "description": "Verify; DROP TABLE steps;--", "status": "pending"},
    ]
    return {
        "checklist_id": "IST-EDGE-001",
        "title": "Edge Case Commissioning Checklist",
        "equipment_tag": "EQ-TEST-EDGE",
        "steps": steps,
    }


# ===========================================================================
# 4. VENDOR SUBMITTAL (TEXT-BASED PDFs)
# ===========================================================================
# Since we can't easily generate real PDFs without dependencies,
# we generate text files that mimic the extracted content format.

def _generate_submittal_clean() -> dict:
    """Generate a clean vendor submittal data file (compliant)."""
    return {
        "submittal_id": "SUB-CLEAN-001",
        "vendor": "Schneider Electric India",
        "equipment": "Symmetra PX 500kVA UPS",
        "equipment_tag": "EQ-UPS-01",
        "document_type": "vendor_submittal",
        "parameters": {
            "ups_redundancy": "N+1",
            "ambient_temperature_max": 55.0,
            "cooling_capacity": 550.0,
            "pdu_efficiency": 97.2,
            "fire_suppression": "FM-200",
            "generator_fuel_consumption": 245.0,
            "cable_derating": 0.80,
            "floor_loading": 14.5,
            "chilled_water_supply_temp": 8.0,
        },
        "compliance_status": "fully_compliant",
    }


def _generate_submittal_messy() -> dict:
    """Generate a messy submittal with mixed formatting and minor deviations."""
    return {
        "submittal_id": "SUB-MESSY-001",
        "vendor": "  vertiv energy PVT ltd ",
        "equipment": "Liebert EXL S1 300 kVA UPS SYSTEM",
        "equipment_tag": "eq-ups-02",
        "document_type": "Vendor Submittal",
        "parameters": {
            "ups_redundancy": " N+1 ",
            "ambient_temperature_max": "50°C",     # String with unit
            "cooling_capacity": "480 kW",           # Below spec, string format
            "pdu_efficiency": "95.8%",              # Below 96% spec, string
            "fire_suppression": "Novec 1230",
            "generator_fuel_consumption": "262 l/hr",  # Above 260 spec
            "cable_derating": "0.74",               # Below 0.75 spec
            "floor_loading": "11.8 kN/m2",          # Below 12.0 spec
            "chilled_water_supply_temp": "10.5 C",  # Above 10.0 spec
        },
        "compliance_status": "violations_found",
        "notes": "Multiple parameters slightly outside TIA-942 spec ranges",
    }


def _generate_submittal_edge() -> dict:
    """Generate edge-case submittal data."""
    return {
        "submittal_id": "SUB-EDGE-001",
        "vendor": "",  # Empty vendor
        "equipment": "Unknown Equipment Model (TBD)",
        "equipment_tag": "EQ-UNKNOWN-99",
        "document_type": "vendor_submittal",
        "parameters": {
            "ups_redundancy": "",                    # Empty value
            "ambient_temperature_max": -40.0,        # Extreme negative
            "cooling_capacity": 0.0,                 # Zero
            "pdu_efficiency": 100.1,                 # Over 100%
            "fire_suppression": None,                # Null
            "generator_fuel_consumption": 99999.0,   # Absurd
            "cable_derating": 0.0,                   # Zero
            "floor_loading": -5.0,                   # Negative
            "chilled_water_supply_temp": 999.0,      # Absurd
            "extra_unknown_param": "surprise_value",  # Unknown param
        },
        "compliance_status": None,
        "notes": None,
    }


# ===========================================================================
# 5. RFI (Request for Information) DATA
# ===========================================================================

def _generate_rfi_data_clean() -> list[dict]:
    """Generate clean RFI records."""
    rfis = []
    for i in range(1, 11):
        rfis.append({
            "rfi_id": f"RFI-CLEAN-{i:03d}",
            "title": f"Clarification on Section {6 + i}.{random.randint(1,9)} Specification",
            "status": random.choice(["open", "responded", "closed"]),
            "priority": random.choice(["low", "medium", "high", "critical"]),
            "raised_by": "Site Engineer",
            "raised_date": (datetime(2026, 7, 15) + timedelta(days=i)).strftime("%Y-%m-%d"),
            "due_date": (datetime(2026, 7, 25) + timedelta(days=i)).strftime("%Y-%m-%d"),
            "related_task_id": f"TC{i:03d}",
            "related_equipment": random.choice(EQUIPMENT_TAGS),
            "discipline": random.choice(DISCIPLINES),
            "description": f"Request clarification on installation tolerance for {random.choice(TASK_NAMES_POOL)}",
            "response": "Refer to Drawing Set Rev.C, Sheet E-14" if random.random() > 0.5 else "",
        })
    return rfis


def _generate_rfi_data_messy() -> list[dict]:
    """Generate messy RFI records."""
    rfis = []
    for i in range(1, 11):
        rfis.append({
            "rfi_id": f"RFI-MESSY-{i:03d}" if random.random() > 0.1 else "",
            "title": random.choice([
                f"  Need info on spec {i}  ",
                f"URGENT: {random.choice(TASK_NAMES_POOL).upper()}",
                "",  # Empty title
                "?" * 100,  # Garbage
            ]),
            "status": random.choice(["open", "Open", "OPEN", "responded", "pending", "unknown", "", None]),
            "priority": random.choice(["low", "LOW", "medium", "HIGH", "urgent", "P1", "", None]),
            "raised_by": random.choice(["Site Engineer", "  site engineer ", "", None]),
            "raised_date": random.choice([
                (datetime(2026, 7, 15) + timedelta(days=i)).strftime("%Y-%m-%d"),
                (datetime(2026, 7, 15) + timedelta(days=i)).strftime("%d/%m/%Y"),
                "TBD",
                "",
            ]),
            "due_date": random.choice([
                (datetime(2026, 7, 25) + timedelta(days=i)).strftime("%Y-%m-%d"),
                "ASAP",
                "",
                None,
            ]),
            "related_task_id": random.choice([f"TM{i:03d}", "", "N/A", None]),
            "related_equipment": random.choice(EQUIPMENT_TAGS + ["", "TBD", None]),
            "discipline": random.choice(DISCIPLINES + ["", None]),
            "description": random.choice([
                f"need info on {random.choice(TASK_NAMES_POOL).lower()}",
                "",
                "??",
            ]),
            "response": "",
        })
    return rfis


def _generate_rfi_data_edge() -> list[dict]:
    """Generate edge-case RFI records."""
    return [
        # Normal RFI
        {
            "rfi_id": "RFI-EDGE-001", "title": "Normal RFI",
            "status": "open", "priority": "medium", "raised_by": "Engineer A",
            "raised_date": "2026-08-01", "due_date": "2026-08-15",
            "related_task_id": "TE001", "related_equipment": "EQ-GEN-01",
            "discipline": "Electrical", "description": "Standard clarification",
            "response": "",
        },
        # Duplicate RFI ID
        {
            "rfi_id": "RFI-EDGE-001", "title": "Duplicate RFI ID",
            "status": "open", "priority": "high", "raised_by": "Engineer B",
            "raised_date": "2026-08-02", "due_date": "2026-08-16",
            "related_task_id": "TE002", "related_equipment": "EQ-UPS-01",
            "discipline": "Electrical", "description": "Duplicate ID test",
            "response": "",
        },
        # Due date before raised date
        {
            "rfi_id": "RFI-EDGE-002", "title": "Backwards Date RFI",
            "status": "open", "priority": "critical", "raised_by": "Engineer C",
            "raised_date": "2026-09-01", "due_date": "2026-08-01",
            "related_task_id": "TE003", "related_equipment": "EQ-CH-01",
            "discipline": "Mechanical", "description": "Due date before raised date",
            "response": "",
        },
        # XSS attempt in title
        {
            "rfi_id": "RFI-EDGE-003",
            "title": '<img src=x onerror=alert("XSS")>',
            "status": "open", "priority": "high", "raised_by": "Attacker",
            "raised_date": "2026-08-01", "due_date": "2026-08-15",
            "related_task_id": "TE001", "related_equipment": "EQ-GEN-01",
            "discipline": "Security", "description": "XSS test payload",
            "response": "",
        },
        # Very long description
        {
            "rfi_id": "RFI-EDGE-004", "title": "Long Description RFI",
            "status": "open", "priority": "low", "raised_by": "Engineer D",
            "raised_date": "2026-08-01", "due_date": "2026-08-15",
            "related_task_id": "TE001", "related_equipment": "EQ-GEN-01",
            "discipline": "Civil",
            "description": "Please clarify: " + " ".join(["specification"] * 500),
            "response": "",
        },
        # All null fields
        {
            "rfi_id": "RFI-EDGE-005", "title": None,
            "status": None, "priority": None, "raised_by": None,
            "raised_date": None, "due_date": None,
            "related_task_id": None, "related_equipment": None,
            "discipline": None, "description": None,
            "response": None,
        },
    ]


# ===========================================================================
# MAIN: Generate all test data
# ===========================================================================

def main():
    random.seed(42)  # Deterministic for reproducibility

    scenarios = {
        "clean": {
            "schedule": _generate_schedule_clean,
            "supplier_graph": _generate_supplier_graph_clean,
            "checklist_gen": lambda: _generate_checklist_clean("EQ-GEN-01"),
            "checklist_ups": lambda: _generate_checklist_clean("EQ-UPS-01"),
            "checklist_ch": lambda: _generate_checklist_clean("EQ-CH-01"),
            "submittal": _generate_submittal_clean,
            "rfis": _generate_rfi_data_clean,
        },
        "messy": {
            "schedule": _generate_schedule_messy,
            "supplier_graph": _generate_supplier_graph_messy,
            "checklist": lambda: _generate_checklist_messy("EQ-UPS-01"),
            "submittal": _generate_submittal_messy,
            "rfis": _generate_rfi_data_messy,
        },
        "edge_cases": {
            "schedule": _generate_schedule_edge,
            "supplier_graph": _generate_supplier_graph_edge,
            "checklist": _generate_checklist_edge,
            "submittal": _generate_submittal_edge,
            "rfis": _generate_rfi_data_edge,
        },
    }

    for scenario_name, generators in scenarios.items():
        scenario_dir = DATA_DIR / scenario_name
        scenario_dir.mkdir(parents=True, exist_ok=True)

        for data_name, gen_fn in generators.items():
            data = gen_fn()

            if data_name == "schedule":
                filepath = scenario_dir / f"project_schedule_{scenario_name}.csv"
                _write_schedule_csv(data, filepath)
                print(f"  ✓ {filepath.relative_to(DATA_DIR)}")
            elif data_name.startswith("checklist"):
                filepath = scenario_dir / f"commissioning_{data_name}_{scenario_name}.json"
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4, ensure_ascii=False, default=str)
                print(f"  ✓ {filepath.relative_to(DATA_DIR)}")
            elif data_name == "rfis":
                filepath = scenario_dir / f"rfi_data_{scenario_name}.json"
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4, ensure_ascii=False, default=str)
                print(f"  ✓ {filepath.relative_to(DATA_DIR)}")
            else:
                filepath = scenario_dir / f"{data_name}_{scenario_name}.json"
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4, ensure_ascii=False, default=str)
                print(f"  ✓ {filepath.relative_to(DATA_DIR)}")

    # Generate a manifest/index
    manifest = {
        "generated_at": datetime.now().isoformat(),
        "scenarios": {},
    }
    for scenario_name in scenarios:
        scenario_dir = DATA_DIR / scenario_name
        files = sorted(str(f.relative_to(DATA_DIR)) for f in scenario_dir.iterdir() if f.is_file())
        manifest["scenarios"][scenario_name] = {
            "description": {
                "clean": "Golden-path data — all fields valid, formats consistent, values within spec ranges",
                "messy": "Real-world imperfections — mixed casing, inconsistent date formats, extra whitespace, invalid enum values, string numbers",
                "edge_cases": "Boundary conditions — circular deps, self-references, duplicate IDs, null fields, XSS payloads, negative values, absurd ranges",
            }[scenario_name],
            "files": files,
        }

    manifest_path = DATA_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\n  ✓ {manifest_path.relative_to(DATA_DIR)}")

    # Print summary
    total_files = sum(
        len(m["files"]) for m in manifest["scenarios"].values()
    ) + 1  # +1 for manifest
    print(f"\n{'='*60}")
    print(f"Generated {total_files} test data files in: {DATA_DIR}")
    print(f"{'='*60}")
    for name, info in manifest["scenarios"].items():
        print(f"\n📁 {name}/  ({len(info['files'])} files)")
        print(f"   {info['description']}")
        for f in info['files']:
            print(f"   └── {f}")


if __name__ == "__main__":
    main()
