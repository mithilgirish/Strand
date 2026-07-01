import os
import csv
import json
import random
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

def create_pdf(filepath, title, paragraphs, table_data=None):
    doc = SimpleDocTemplate(filepath, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph(title, styles['Title']))
    story.append(Spacer(1, 12))
    
    for p in paragraphs:
        story.append(Paragraph(p, styles['Normal']))
        story.append(Spacer(1, 6))
        
    if table_data:
        story.append(Spacer(1, 12))
        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        story.append(t)
        
    doc.build(story)

def create_spec_tia942(filepath):
    paragraphs = [
        "This specification dictates the operational parameters for the Tier III data center facility.",
        "Maximum ambient temperature: 50°C (TIA-942-B §6.7.1)",
        "UPS redundancy level: N+1 minimum (§5.2.3)",
        "Fire suppression: FM-200 or Novec 1230 for UPS rooms >500kVA (§7.4.2)",
        "Generator fuel consumption: ≤260 l/hr at rated load (§8.3.4)",
        "Cable derating factor: 0.75 minimum for bunched cables (§9.1.2)",
        "Cooling capacity: 500 kW minimum per unit (§10.2.1)",
        "Floor loading capacity: 12.0 kN/m2 minimum (§4.3)",
        "Seismic bracing: Zone 4 compliance required (§4.5.1)",
        "Chilled water supply temperature: 10°C maximum (§11.1)",
        "Aisle containment: Cold aisle containment mandatory (§11.4)",
        "PDU efficiency: ≥98% at 50% load (§12.2)"
    ]
    create_pdf(filepath, "TIA-942-B Facility Specification (Synthetic)", paragraphs)

def create_vendor_submittals(data_dir):
    # 1. Faulty cooling tower (Critical deviation: 45C vs 50C)
    table_ct = [
        ["Parameter", "Submitted Value"],
        ["Equipment Type", "Evaporative Cooling Tower"],
        ["Maximum ambient temperature", "45°C"],
        ["Cooling capacity", "550 kW"],
        ["Water flow rate", "1200 GPM"]
    ]
    create_pdf(os.path.join(data_dir, "vendor_submittal_cooling_tower.pdf"), "Submittal: Cooling Tower Equipment", ["Vendor: CoolTech Industrial"], table_ct)
    
    # 2. Compliant UPS
    table_ups = [
        ["Parameter", "Submitted Value"],
        ["Equipment Type", "Uninterruptible Power Supply"],
        ["UPS redundancy level", "N+1"],
        ["Efficiency", "96%"],
        ["Capacity", "600 kVA"]
    ]
    create_pdf(os.path.join(data_dir, "vendor_submittal_ups_compliant.pdf"), "Submittal: UPS System", ["Vendor: PowerSure Inc."], table_ups)
    
    # 3. Minor deviation Generator
    table_gen = [
        ["Parameter", "Submitted Value"],
        ["Equipment Type", "Diesel Generator"],
        ["Generator fuel consumption", "265 l/hr"], # slightly over 260
        ["Output", "2000 kW"],
        ["Emissions", "Tier 4 Final"]
    ]
    create_pdf(os.path.join(data_dir, "vendor_submittal_generator_minor.pdf"), "Submittal: Standby Generator", ["Vendor: GenForce Heavy Industries"], table_gen)

def create_schedule(filepath):
    with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['task_id', 'task_name', 'start_date', 'end_date', 'status', 'progress_pct', 'predecessors']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        start_date = datetime(2026, 7, 1)
        for i in range(1, 101):
            task_id = f'T{i:03d}'
            t_start = start_date + timedelta(days=i)
            t_end = t_start + timedelta(days=5)
            
            status = 'on_track'
            if i in [15, 42, 88]:
                status = 'delayed'
            elif i in [16, 43, 89]:
                status = 'at_risk'
                
            preds = ""
            if i > 1:
                if random.random() > 0.5:
                    preds = f"T{i-1:03d}"
                else:
                    preds = f"T{max(1, i-2):03d};T{i-1:03d}"
                    
            writer.writerow({
                'task_id': task_id,
                'task_name': f'Construction Activity {i}',
                'start_date': t_start.strftime('%Y-%m-%d'),
                'end_date': t_end.strftime('%Y-%m-%d'),
                'status': status,
                'progress_pct': random.randint(10, 90) if status != 'completed' else 100,
                'predecessors': preds
            })

def create_supplier_graph(filepath):
    data = {
        "suppliers": [],
        "shipments": []
    }
    
    for i in range(1, 41):
        tier = 1 if i <= 10 else (2 if i <= 28 else 3)
        data["suppliers"].append({
            "id": f"SUPP-{i:03d}",
            "name": f"Supplier {i}",
            "tier": tier,
            "risk_score": random.uniform(0.1, 0.9)
        })
        
    for i in range(1, 48):
        risk_flag = True if i in [5, 17, 33] else False
        data["shipments"].append({
            "id": f"SHIP-{i:03d}",
            "origin_supplier": f"SUPP-{random.randint(1, 40):03d}",
            "destination": "Site A",
            "eta": (datetime.now() + timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d'),
            "risk_flag": risk_flag
        })
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def create_checklist(filepath):
    data = {
        "checklist_id": "IST-23",
        "title": "Generator Commissioning Checklist",
        "steps": [
            {"step": i, "description": f"Verify generator test {i}", "status": "pending"} for i in range(1, 24)
        ]
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def create_rfis(rfi_dir):
    os.makedirs(rfi_dir, exist_ok=True)
    for i in range(1, 51):
        create_pdf(
            os.path.join(rfi_dir, f"rfi_{i:03d}.pdf"),
            f"Request for Information RFI-{i:03d}",
            [f"Question related to section {random.randint(1, 12)} of the specifications."]
        )

if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    create_spec_tia942(os.path.join(data_dir, "spec_tia942_synthetic.pdf"))
    create_vendor_submittals(data_dir)
    create_schedule(os.path.join(data_dir, "project_schedule_100tasks.csv"))
    create_supplier_graph(os.path.join(data_dir, "supplier_graph_data.json"))
    create_checklist(os.path.join(data_dir, "commissioning_checklist_generator.json"))
    create_rfis(os.path.join(data_dir, "rfi_corpus"))
    
    print(f"Successfully generated evaluation files in {data_dir}")
