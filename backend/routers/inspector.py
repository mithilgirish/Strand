import os
import json
import random
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from backend.deps import limiter

router = APIRouter()

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mock_ncr_db.json")

class NcrSubmission(BaseModel):
    transcript: str
    equipment_tag: str
    step_id: str
    raised_by: str = "field_engineer"

def load_db():
    if not os.path.exists(DB_FILE):
        # Seed with initial NCRs
        initial_ncrs = [
            {
                "ncr_id": "NCR-2841",
                "equipment_tag": "GEN-01",
                "step_id": "IST-002",
                "transcript": "Fuel consumption reads 285 litres per hour against spec 260",
                "r0_score": 4.2,
                "severity": "Critical",
                "mitigation": "Verify governor settings or replace fuel injector unit.",
                "raised_by": "field_engineer",
                "timestamp": "2026-07-02T02:00:00Z"
            },
            {
                "ncr_id": "NCR-1942",
                "equipment_tag": "CT-01",
                "step_id": "IST-005",
                "transcript": "Ambient operating temperature is 45°C which is below the TIA-942 spec of 50°C",
                "r0_score": 3.1,
                "severity": "Major",
                "mitigation": "Escalate to engineering lead for temperature tolerance override.",
                "raised_by": "field_engineer",
                "timestamp": "2026-07-02T02:15:00Z"
            }
        ]
        save_db(initial_ncrs)
        return initial_ncrs
    try:
        with open(DB_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

def generate_checklist(tag: str):
    # Generates a realistic TIA-942 IST 23-step checklist based on equipment tag
    is_gen = tag.upper().startswith("GEN")
    equip_type = "Standby Generator" if is_gen else "Cooling Infrastructure"
    
    clauses = [
        ("IST-001", "Verify physical clearance & foundation compliance", "No cracks, standard seismic anchor bolts torque", "bolting_compliance", "100%", "§5.2.1"),
        ("IST-002", "Fuel / fluid levels verification at 100% load", "Consumption within ±5% of design spec (260 L/h)", "fuel_rate", 260, "§6.2.3") if is_gen else ("IST-002", "Verify water circulation flow rates", "Minimum 1200 gpm at full load", "water_flow", 1200, "§6.3.1"),
        ("IST-003", "Acoustic attenuation performance check", "Noise levels below 85 dBA at 1 meter boundary", "acoustic_dba", 85, "§8.4.1"),
        ("IST-004", "Structural vibrations monitoring", "Velocity peak below 4.5 mm/s on critical bearings", "bearing_vibration", 4.5, "§5.4.2"),
        ("IST-005", "Thermal threshold performance under peak design load", "Continuous thermal clearance at 50°C ambient", "thermal_max", 50, "§6.7.1"),
        ("IST-006", "Safety shut-off valve timing test", "Closes fully in under 2.0 seconds", "cutoff_time", 2.0, "§7.1.3"),
        ("IST-007", "Earthing ground loop impedance", "Resistance below 1.0 Ohm", "ground_resistance", 1.0, "§9.1.1"),
        ("IST-008", "Control panel telemetry sync", "Modbus registers reporting standard values", "telemetry_sync", "Active", "§10.2.1"),
        ("IST-009", "Overcurrent relay trip test", "Breaker trips at 120% rating in under 400ms", "trip_time", 400, "§9.3.2"),
        ("IST-010", "Ventilation intake dampers operations", "Dampers open fully in under 5.0 seconds", "damper_time", 5.0, "§6.4.1"),
        ("IST-011", "Exhaust exhaust backpressure check", "Backpressure below 10 kPa at rated output", "backpressure", 10, "§6.2.5") if is_gen else ("IST-011", "Chilled water bypass valve modulation", "Modulates smoothly from 0-100% open", "valve_mod", "100%", "§6.3.5"),
        ("IST-012", "Emergency Power Off integration", "EPO button cuts main contacts within 100ms", "epo_time", 100, "§9.5.1"),
        ("IST-013", "Battery charger float voltage", "Constant float at 27.2 VDC", "charger_voltage", 27.2, "§9.2.3"),
        ("IST-014", "Pre-heating jacket coolant temperature", "Maintains continuous temperature above 40°C", "coolant_temp", 40, "§6.2.7") if is_gen else ("IST-014", "Water treatment chemical concentration", "Conductivity levels below 1500 uS/cm", "water_conductivity", 1500, "§6.3.8"),
        ("IST-015", "Phase rotation & voltage balance check", "Under 1% voltage unbalance between phases", "voltage_unbalance", 1, "§9.1.5"),
        ("IST-016", "Fuel filtration system efficiency", "Particulate compliance below ISO 4406 18/16/13", "fuel_purity", "ISO 18/16/13", "§6.2.9") if is_gen else ("IST-016", "Leak detection sensors functionality", "Triggers alarm upon water presence in under 5s", "leak_alarm_time", 5, "§6.3.9"),
        ("IST-017", "Fire suppression interlocks verification", "System shuts down upon simulated release trigger", "fire_interlock", "Compliant", "§11.1.2"),
        ("IST-018", "Local indicator alarms visual audit", "All alarm LEDs illuminate during lamp test", "alarm_lamp_test", "Passed", "§10.1.1"),
        ("IST-019", "Cables connection bolt torques", "Meets torque requirements per manufacturer spec", "bolt_torque", "Compliant", "§9.4.1"),
        ("IST-020", "Jacket heater safety cutouts check", "Trips at 80°C threshold", "heater_trip_temp", 80, "§6.2.8") if is_gen else ("IST-020", "Condenser fan speed controller sweep", "VFD sweep from 10Hz to 60Hz without resonance", "vfd_sweep", "Passed", "§6.3.10"),
        ("IST-021", "Maintenance bypass keylock interlocks", "Trapped key operation prevents incorrect switching", "keylock_interlock", "Secured", "§9.5.3"),
        ("IST-022", "Lube oil pressure levels check", "Exceeds 350 kPa at rated operating speed", "oil_pressure", 350, "§6.2.4") if is_gen else ("IST-022", "Expansion tank level and pressurization", "Maintains static pressure at 150 kPa", "expansion_pressure", 150, "§6.3.3"),
        ("IST-023", "Cooling airflow static pressure", "Airflow velocity meets design specification", "airflow_velocity", "Compliant", "§6.4.3")
    ]
    
    steps = []
    for seq, clause in enumerate(clauses, 1):
        steps.append({
            "step_id": clause[0],
            "sequence": seq,
            "description": clause[1],
            "acceptance_criteria": clause[2],
            "parameter_name": clause[3],
            "expected_value": clause[4],
            "unit": "VDC" if clause[3] == "charger_voltage" else ("°C" if "temp" in clause[3] or "thermal" in clause[3] else ("mm/s" if "vibration" in clause[3] else ("Ohm" if "resistance" in clause[3] else ("kPa" if "pressure" in clause[3] else ("ms" if "time" in clause[3] else "GPM" if "flow" in clause[3] else ""))))),
            "tia942_clause": clause[5],
            "status": "pending"
        })
    return steps

@router.get("/inspector/checklist/{tag}")
async def get_checklist(tag: str):
    return {
        "equipment_tag": tag.upper(),
        "checklist_title": f"TIA-942 System Validation Checklist — {tag.upper()}",
        "steps": generate_checklist(tag)
    }

@router.post("/inspector/ncr")
@limiter.limit("30/minute")
async def log_ncr(request: Request, ncr: NcrSubmission):
    db = load_db()
    
    # Calculate mock R0 contagion scores based on tag and step reference
    is_gen = ncr.equipment_tag.upper().startswith("GEN")
    r0_score = 4.2 if is_gen and ncr.step_id == "IST-002" else (3.1 if ncr.step_id == "IST-005" else round(random.uniform(1.2, 3.8), 1))
    
    severity = "Critical" if r0_score >= 4.0 else ("Major" if r0_score >= 2.5 else "Minor")
    
    mitigations = {
        "IST-002": "Verify governor settings or replace fuel injector unit." if is_gen else "Check water booster pump flow calibration.",
        "IST-005": "Escalate to engineering lead for temperature tolerance override.",
        "IST-003": "Inspect silencer baffles and acoustic enclosure door seals.",
        "IST-004": "Align rotor shafts or retorque vibration isolation springs."
    }
    mitigation = mitigations.get(ncr.step_id, "Inspect equipment node and raise corrective work order.")

    new_ncr = {
        "ncr_id": f"NCR-{random.randint(1000, 9999)}",
        "equipment_tag": ncr.equipment_tag.upper(),
        "step_id": ncr.step_id,
        "transcript": ncr.transcript,
        "r0_score": r0_score,
        "severity": severity,
        "mitigation": mitigation,
        "raised_by": ncr.raised_by,
        "timestamp": f"2026-07-02T{random.randint(0,23):02}:{random.randint(0,59):02}:00Z"
    }
    
    db.insert(0, new_ncr)
    save_db(db)
    return new_ncr

@router.get("/inspector/ncrs")
async def get_ncrs():
    return load_db()

@router.post("/inspector/checklist/{tag}/close")
async def close_checklist(tag: str):
    return {
        "status": "success",
        "message": f"Checklist session closed for tag {tag.upper()}.",
        "as_built_id": f"ABR-{random.randint(10000, 99999)}"
    }
