import os
from PIL import Image, ImageDraw, ImageFont

def create_all_diagrams():
    docs_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Main Architecture Diagram
    create_arch_diagram(os.path.join(docs_dir, "architecture_diagram.png"))

    # 2. R0 Contagion Engine Diagram
    create_r0_diagram(os.path.join(docs_dir, "r0_contagion_diagram.png"))

    # 3. AST Cypher Security Diagram
    create_security_diagram(os.path.join(docs_dir, "cypher_security_diagram.png"))

    # 4. Edge Mobile Resilience Diagram
    create_mobile_diagram(os.path.join(docs_dir, "edge_resilience_diagram.png"))

def get_fonts():
    try:
        f_title = ImageFont.truetype("arial.ttf", 20)
        f_box = ImageFont.truetype("arial.ttf", 14)
        f_body = ImageFont.truetype("arial.ttf", 12)
        f_small = ImageFont.truetype("arial.ttf", 11)
    except:
        f_title = f_box = f_body = f_small = ImageFont.load_default()
    return f_title, f_box, f_body, f_small

def create_arch_diagram(out_path):
    f_title, f_box, f_body, f_small = get_fonts()
    img = Image.new('RGB', (1200, 680), color='#0F172A')
    draw = ImageDraw.Draw(img)

    draw.text((40, 20), "STRAND System Architecture & Multi-Agent Network", fill="#0D9488", font=f_title)
    draw.line([(40, 52), (1160, 52)], fill="#334155", width=2)

    boxes = [
        {"title": "1. INGESTION & KNOWLEDGE GRAPH", "rect": (40, 75, 360, 440), "border": "#0D9488",
         "items": ["PDF Submittals & CAD Drawings", "Vision Parser & OCR Engine", "Spec-DNA SHA-256 Fingerprint", "Neo4j Parametric Knowledge Graph", "ChromaDB Dense Vector Collection"]},
        {"title": "2. 5-CORE LANGGRAPH AGENT ENGINE", "rect": (400, 75, 800, 440), "border": "#3B82F6",
         "items": ["Guardian Agent (Compliance Audit)", "Brain Agent (Hybrid GraphRAG)", "Scheduler Agent (CPM & R0 Risk)", "Oracle Agent (GeoJSON Resilience)", "Inspector Agent (Field Telemetry)", "Planner & Judge Support Modules"]},
        {"title": "3. SECURITY & GOVERNANCE", "rect": (840, 75, 1160, 440), "border": "#10B981",
         "items": ["Human-In-The-Loop (HITL) Gate", "Redis Approval State Queue", "AST Cypher Query Sanitizer", "Regex Tenant_Id Injector", "Supabase JWKS Auth Validation"]},
        {"title": "4. INTERFACE SURFACES & ENTERPRISE INTEGRATIONS", "rect": (40, 480, 1160, 640), "border": "#F59E0B",
         "items": ["Web Command Dashboard: Next.js 14 + React-Grid-Layout + Recharts Visualizers", "Edge-Resilient Mobile App: React Native + Expo + AsyncStorage + 3s AbortController Timeout", "Enterprise Ecosystem Connectors: Procore (OAuth) | Autodesk APS | Primavera P6 | IBM Maximo"]}
    ]

    for b in boxes:
        x1, y1, x2, y2 = b["rect"]
        draw.rectangle([x1, y1, x2, y2], fill="#1E293B", outline=b["border"], width=2)
        draw.rectangle([x1, y1, x2, y1 + 32], fill=b["border"])
        draw.text((x1 + 12, y1 + 7), b["title"], fill="#FFFFFF", font=f_box)
        cy = y1 + 45
        for item in b["items"]:
            draw.rectangle([x1 + 12, cy, x2 - 12, cy + 30], fill="#0F172A", outline="#334155", width=1)
            draw.text((x1 + 20, cy + 7), item, fill="#E2E8F0", font=f_small)
            cy += 38

    draw.line([(360, 260), (400, 260)], fill="#0D9488", width=3)
    draw.line([(800, 260), (840, 260)], fill="#3B82F6", width=3)
    draw.line([(600, 440), (600, 480)], fill="#F59E0B", width=3)

    img.save(out_path, "PNG")

def create_r0_diagram(out_path):
    f_title, f_box, f_body, f_small = get_fonts()
    img = Image.new('RGB', (1100, 420), color='#0F172A')
    draw = ImageDraw.Draw(img)

    draw.text((40, 20), "R0 Contagion Risk Score Engine & Cascade Workflow", fill="#0D9488", font=f_title)
    draw.line([(40, 50), (1060, 50)], fill="#334155", width=2)

    # Formula Box
    draw.rectangle([(40, 70), (1060, 140)], fill="#1E293B", outline="#059669", width=2)
    draw.text((60, 85), "R0 FORMULA: R0 = ( downstream_count + 2 * critical_downstream_count ) / normalizer", fill="#34D399", font=f_box)
    draw.text((60, 112), "Evaluates blast radius on Neo4j Knowledge Graph & NetworkX Critical Path DAG. Scale: 0.0 to 10.0", fill="#CBD5E1", font=f_small)

    # 3 Severity Zones
    zones = [
        {"title": "Low Impact (R0 < 3.0)", "desc": "Localized component replacement. Logged in audit trail.", "bg": "#064E3B", "border": "#10B981"},
        {"title": "Moderate Risk (3.0 <= R0 <= 5.0)", "desc": "Requires engineering review & vendor notice.", "bg": "#78350F", "border": "#F59E0B"},
        {"title": "Critical Contagion (R0 > 5.0)", "desc": "Triggers Planner, Scheduler DAG rebuild & HITL Gate.", "bg": "#7F1D1D", "border": "#EF4444"}
    ]

    x = 40
    for z in zones:
        draw.rectangle([(x, 160), (x + 320, 380)], fill=z["bg"], outline=z["border"], width=2)
        draw.rectangle([(x, 160), (x + 320, 200)], fill=z["border"])
        draw.text((x + 12, 172), z["title"], fill="#FFFFFF", font=f_box)
        draw.text((x + 15, 220), z["desc"], fill="#F8FAFC", font=f_body)
        x += 350

    img.save(out_path, "PNG")

def create_security_diagram(out_path):
    f_title, f_box, f_body, f_small = get_fonts()
    img = Image.new('RGB', (1100, 420), color='#0F172A')
    draw = ImageDraw.Draw(img)

    draw.text((40, 20), "AST Cypher Query Sanitizer & Multi-Tenant Guardrails", fill="#3B82F6", font=f_title)
    draw.line([(40, 50), (1060, 50)], fill="#334155", width=2)

    steps = [
        {"title": "1. READ-ONLY CHECK", "desc": "Must start with MATCH, WITH, OPTIONAL MATCH, RETURN.", "border": "#3B82F6"},
        {"title": "2. MUTATION BLOCK", "desc": "Rejects CREATE, MERGE, DROP, DELETE, DETACH, SET.", "border": "#EF4444"},
        {"title": "3. TENANT INJECTION", "desc": "Injects {tenant_id: $tenant_id} into all node patterns via regex.", "border": "#10B981"},
        {"title": "4. EXPLOIT DEFENSE", "desc": "Strips comments (//, /* */) & blocks malicious AST injection.", "border": "#F59E0B"}
    ]

    x = 40
    for s in steps:
        draw.rectangle([(x, 80), (x + 235, 380)], fill="#1E293B", outline=s["border"], width=2)
        draw.rectangle([(x, 80), (x + 235, 120)], fill=s["border"])
        draw.text((x + 10, 92), s["title"], fill="#FFFFFF", font=f_box)
        
        # Details inside box
        lines = s["desc"].split(" ")
        txt_l1 = " ".join(lines[:len(lines)//2])
        txt_l2 = " ".join(lines[len(lines)//2:])
        draw.text((x + 12, 140), txt_l1, fill="#E2E8F0", font=f_small)
        draw.text((x + 12, 165), txt_l2, fill="#E2E8F0", font=f_small)
        x += 255

    img.save(out_path, "PNG")

def create_mobile_diagram(out_path):
    f_title, f_box, f_body, f_small = get_fonts()
    img = Image.new('RGB', (1100, 420), color='#0F172A')
    draw = ImageDraw.Draw(img)

    draw.text((40, 20), "Edge-Resilient Field Execution Architecture", fill="#10B981", font=f_title)
    draw.line([(40, 50), (1060, 50)], fill="#334155", width=2)

    components = [
        {"title": "3s AbortController Timeout", "desc": "Limits fetch calls to 3000ms. On timeout, instantly switches to offline cache.", "border": "#3B82F6"},
        {"title": "AsyncStorage Local Queue", "desc": "Queues observations locally under local_ncrs with QUEUED_OFFLINE status.", "border": "#F59E0B"},
        {"title": "Automated Background Sync", "desc": "SyncStatusScreen continuously flushes pending items when network reconnects.", "border": "#10B981"},
        {"title": "expo-av Voice Intake", "desc": "Strips default Content-Type header to allow native fetch multipart boundary creation.", "border": "#8B5CF6"}
    ]

    x = 40
    for c in components:
        draw.rectangle([(x, 80), (x + 235, 380)], fill="#1E293B", outline=c["border"], width=2)
        draw.rectangle([(x, 80), (x + 235, 120)], fill=c["border"])
        draw.text((x + 8, 92), c["title"], fill="#FFFFFF", font=f_box)
        
        lines = c["desc"].split(" ")
        txt_l1 = " ".join(lines[:len(lines)//2])
        txt_l2 = " ".join(lines[len(lines)//2:])
        draw.text((x + 10, 140), txt_l1, fill="#E2E8F0", font=f_small)
        draw.text((x + 10, 165), txt_l2, fill="#E2E8F0", font=f_small)
        x += 255

    img.save(out_path, "PNG")

if __name__ == "__main__":
    create_all_diagrams()
