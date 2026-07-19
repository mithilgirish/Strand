# STRAND — Agent Build Guide & Architecture Reference
> "The DNA of Every Great Build"  
> ET AI Hackathon 2026 · Problem Statement 4  
> This file is your single source of truth for building, structuring, and deploying STRAND.

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Repository Folder Structure](#2-repository-folder-structure)
3. [Environment Setup](#3-environment-setup)
4. [Parametric Knowledge Graph Schema](#4-parametric-knowledge-graph-schema)
5. [Agent 1 — The Guardian](#5-agent-1--the-guardian)
6. [Agent 2 — The Scheduler](#6-agent-2--the-scheduler)
7. [Agent 3 — The Oracle](#7-agent-3--the-oracle)
8. [Agent 4 — The Inspector](#8-agent-4--the-inspector)
9. [Agent 5 — The Brain](#9-agent-5--the-brain)
10. [LangGraph Orchestration Layer](#10-langgraph-orchestration-layer)
11. [FastAPI Backend Routes](#11-fastapi-backend-routes)
12. [Next.js Frontend](#12-nextjs-frontend)
13. [Mobile React Native App (Inspector)](#13-mobile-react-native-app-inspector)
14. [Synthetic Dataset Generation](#14-synthetic-dataset-generation)
15. [Build Order & Week-by-Week Plan](#15-build-order--week-by-week-plan)
16. [Deployment](#16-deployment)
17. [Demo Day Checklist](#17-demo-day-checklist)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STRAND PLATFORM                               │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 5 — SURFACES                                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│  │  Risk Cockpit    │ │  Inspector App   │ │   Brain Chat     │    │
│  │  (Next.js 15)    │ │  (React Native / │ │  (Next.js 15)    │    │
│  │  Dashboard       │ │   Expo App)      │ │  Conversational  │    │
│  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘    │
│           └────────────────────┼────────────────────┘              │
├───────────────────────────────────────────────────────────────────┤
│  LAYER 4 — REASONING (LangGraph Agent Mesh)                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐ ┌────────┐ │
│  │ GUARDIAN  │ │SCHEDULER  │ │  ORACLE   │ │INSPECT │ │ BRAIN  │ │
│  │ Spec-DNA  │ │ R0 Score  │ │SupplyChain│ │ QA Cop │ │  RAG   │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───┬────┘ └───┬────┘ │
│        └─────────────┴──────────────┴───────────┴──────────┘      │
│                        FastAPI Backend                               │
├───────────────────────────────────────────────────────────────────┤
│  LAYER 3 — MEMORY (Parametric Knowledge Graph)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Neo4j Aura (Graph DB)    Chroma (Vector DB)   Redis (Cache) │  │
│  └──────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────┤
│  LAYER 2 — UNDERSTANDING (Document Intelligence)                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Unstructured.io · PyMuPDF · LayoutLMv3 · NER Pipeline       │  │
│  └──────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────┤
│  LAYER 1 — ACQUISITION (Document Ingestion)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Upload API · Email Parser · SFTP Watcher · Mock ERP Feed    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Agent Communication Flow
```
Document Upload
     │
     ▼
[Ingestion Pipeline] ──────────────────────────────────────────────┐
     │                                                               │
     ▼                                                               │
[Neo4j PKG] ◄──── Agent writes ────┐                               │
     │                             │                                 │
     ├──► GUARDIAN ──► Spec-DNA violation? ──► RFI Draft ──► API   │
     │        │                                                      │
     │        └──► R0 Score ──► SCHEDULER ──► Risk Dashboard        │
     │                                │                              │
     │                                └──► ORACLE ──► Supply Map    │
     │                                                               │
     ├──► INSPECTOR ──► NCR via Voice ──► PKG write ──► Dashboard   │
     │                                                               │
     └──► BRAIN ──► Hybrid RAG ──► Cited Answer ──► Chat UI        │
```

---

## 2. Repository Folder Structure

```
strand/
├── README.md                          # Setup in 5 commands
├── .env.example                       # All env vars, no real values
├── docker-compose.yml                 # Full stack local dev
├── requirements.txt                   # Python dependencies
├── package.json                       # Root Node deps
│
├── backend/                           # FastAPI Python backend
│   ├── main.py                        # App entry point
│   ├── config.py                      # Settings via pydantic-settings
│   ├── deps.py                        # Shared dependencies (DB clients)
│   │
│   ├── agents/                        # One file per agent
│   │   ├── __init__.py
│   │   ├── guardian.py                # Agent 1 — Spec compliance
│   │   ├── scheduler.py               # Agent 2 — R0 risk engine
│   │   ├── oracle.py                  # Agent 3 — Supply chain
│   │   ├── inspector.py               # Agent 4 — Commissioning QA
│   │   ├── brain.py                   # Agent 5 — RAG knowledge
│   │   └── orchestrator.py            # LangGraph graph definition
│   │
│   ├── ingestion/                     # Document processing pipeline
│   │   ├── __init__.py
│   │   ├── pipeline.py                # Main ingestion orchestrator
│   │   ├── parsers/
│   │   │   ├── pdf_parser.py          # PyMuPDF + Unstructured
│   │   │   ├── csv_parser.py          # Schedule CSV parser
│   │   │   └── json_parser.py         # Supplier graph, checklist
│   │   ├── ner/
│   │   │   ├── parameter_extractor.py # NER for tech parameters
│   │   │   └── entity_linker.py       # Links NER output to PKG nodes
│   │   └── spec_dna/
│   │       ├── fingerprint.py         # SHA-256 lineage ID generator
│   │       └── chain.py               # Spec-DNA chain builder
│   │
│   ├── graph/                         # Neo4j PKG layer
│   │   ├── __init__.py
│   │   ├── client.py                  # Neo4j driver singleton
│   │   ├── schema.py                  # Node/edge type definitions
│   │   ├── queries.py                 # All Cypher queries
│   │   └── seed.py                    # Seed PKG from synthetic data
│   │
│   ├── vector/                        # Chroma vector store layer
│   │   ├── __init__.py
│   │   ├── store.py                   # Chroma client + collection mgmt
│   │   ├── embedder.py                # Embedding model wrapper
│   │   └── retriever.py               # Hybrid BM25 + dense retrieval
│   │
│   ├── r0/                            # R0 Contagion Score engine
│   │   ├── __init__.py
│   │   ├── engine.py                  # Core R0 computation
│   │   ├── graph_traversal.py         # NetworkX dependency spreading
│   │   └── classifier.py              # R0 → severity label mapping
│   │
│   ├── routers/                       # FastAPI route definitions
│   │   ├── __init__.py
│   │   ├── documents.py               # POST /documents/upload
│   │   ├── guardian.py                # GET /guardian/violations
│   │   ├── scheduler.py               # GET /scheduler/risks
│   │   ├── oracle.py                  # GET /oracle/shipments
│   │   ├── inspector.py               # POST /inspector/ncr
│   │   ├── brain.py                   # POST /brain/query
│   │   └── health.py                  # GET /health
│   │
│   └── models/                        # Pydantic request/response models
│       ├── documents.py
│       ├── violations.py
│       ├── risks.py
│       ├── ncr.py
│       └── query.py
│
├── frontend/                          # Next.js 15 web dashboard
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with STRAND nav
│   │   ├── page.tsx                   # Risk Cockpit dashboard (/)
│   │   ├── guardian/
│   │   │   └── page.tsx               # Guardian upload + violations
│   │   ├── scheduler/
│   │   │   └── page.tsx               # R0 risk dashboard
│   │   ├── oracle/
│   │   │   └── page.tsx               # Geospatial supply map
│   │   ├── inspector/
│   │   │   └── page.tsx               # Commissioning progress
│   │   └── brain/
│   │       └── page.tsx               # Chat interface
│   │
│   └── components/
│       ├── layout/
│       │   ├── Sidebar.tsx            # Nav sidebar with agent links
│       │   ├── TopBar.tsx             # Project name + health score
│       │   └── AgentStatusBadge.tsx   # Live/idle indicator per agent
│       ├── guardian/
│       │   ├── UploadZone.tsx         # Drag-drop submittal upload
│       │   ├── ViolationCard.tsx      # Single deviation with Spec-DNA
│       │   ├── SpecDnaChain.tsx       # Visual lineage chain renderer
│       │   └── RfiPreview.tsx         # Auto-drafted RFI preview
│       ├── scheduler/
│       │   ├── R0Gauge.tsx            # Animated R0 score meter
│       │   ├── RiskTimeline.tsx       # Critical path with risk flags
│       │   └── MilestoneCard.tsx      # Individual milestone + R0
│       ├── oracle/
│       │   ├── SupplyMap.tsx          # Leaflet shipment map
│       │   ├── ShipmentCard.tsx       # Individual shipment details
│       │   └── SupplierTree.tsx       # Tier-1/2/3 tree view
│       ├── brain/
│       │   ├── ChatWindow.tsx         # Message thread
│       │   ├── MessageBubble.tsx      # User + AI bubbles
│       │   └── CitationBadge.tsx      # Clickable source citation
│       └── shared/
│           ├── ImmunityScore.tsx      # Overall project health score
│           ├── SeverityBadge.tsx      # Critical/Major/Minor badge
│           └── StatCard.tsx           # KPI summary cards
│
├── mobile/                            # React Native Expo App
│   ├── package.json
│   ├── app.json
│   ├── App.tsx
│   └── screens/
│       ├── ChecklistScreen.tsx        # IST checklist stepper
│       ├── QrScanScreen.tsx           # QR scanner
│       ├── NcrLogScreen.tsx           # Voice-to-NCR form
│       └── SyncStatusScreen.tsx       # Offline sync indicator
│
├── data/                              # Synthetic demo dataset
│   ├── README.md                      # What each file contains
│   ├── spec_tia942_synthetic.pdf      # 50-page spec corpus
│   ├── vendor_submittal_cooling_tower.pdf   # Critical deviation
│   ├── vendor_submittal_ups_compliant.pdf   # Clean submittal
│   ├── vendor_submittal_generator_minor.pdf # Minor deviation
│   ├── project_schedule_100tasks.csv
│   ├── supplier_graph_data.json
│   ├── commissioning_checklist_generator.json
│   └── rfi_corpus/                    # 50 synthetic RFI PDFs
│       └── rfi_001.pdf ... rfi_050.pdf
│
├── scripts/                           # One-time setup + utility scripts
│   ├── seed_db.py                     # Seeds Neo4j + Chroma from /data
│   ├── generate_synthetic_data.py     # Generates /data files
│   ├── test_agents.py                 # Smoke tests all 5 agents
│   └── precompute_demo.py             # Pre-caches all demo queries
│
└── docs/
    ├── architecture.png               # High-res architecture diagram
    ├── STRAND_Project_Document.pdf    # Full PRD (this document)
    └── demo_script.md                 # 7-beat demo script
```

---

## 3. Environment Setup

### 3.1 Prerequisites
```bash
# Python 3.11+
python --version

# Node 18+
node --version

# Docker (optional but recommended)
docker --version
```

### 3.2 Clone and Install
```bash
git clone https://github.com/mithilgirish/Strand
cd strand

# Python backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..

# Mobile (optional for Week 4)
cd mobile && npm install && cd ..
```

### 3.3 Environment Variables (.env)
```bash
# Copy template
cp .env.example .env
```

```ini
# .env.example — fill in real values in .env, never commit .env

# LLM (use Groq free tier for dev, switch to Claude for demo day)
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
LLM_PROVIDER=groq                  # groq | anthropic
LLM_MODEL=llama-3.1-8b-instant    # for dev; claude-sonnet-4-6 for demo

# Neo4j
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# Chroma (local by default)
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION=strand_docs

# Unstructured.io (optional — falls back to PyMuPDF if absent)
UNSTRUCTURED_API_KEY=...

# Backend
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000,http://localhost:19006

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3.4 requirements.txt
```txt
# Core
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.3.0
python-multipart==0.0.9

# LangGraph / LangChain
langgraph==0.2.0
langchain==0.2.0
langchain-anthropic==0.1.0
langchain-groq==0.1.0
langchain-community==0.2.0

# Vector DB
chromadb==0.5.0
rank-bm25==0.2.2

# Graph DB
neo4j==5.21.0
networkx==3.3

# Document Parsing
pymupdf==1.24.0
unstructured[pdf]==0.14.0
layoutlm-transformers==0.1.0      # fallback: skip if install fails
pytesseract==0.3.10
pillow==10.3.0

# NLP / NER
transformers==4.41.0
torch==2.3.0
spacy==3.7.0

# Analytics
prophet==1.1.5
xgboost==2.0.3
scikit-learn==1.5.0
pandas==2.2.0
numpy==1.26.0

# Utilities
httpx==0.27.0
python-dotenv==1.0.0
loguru==0.7.0
hashlib                            # stdlib
```

---

## 4. Parametric Knowledge Graph Schema

### 4.1 Node Types (Cypher)
```cypher
// Run once to create constraints and indexes

// Contract Clause
CREATE CONSTRAINT FOR (c:ContractClause) REQUIRE c.spec_dna_id IS UNIQUE;
CREATE INDEX FOR (c:ContractClause) ON (c.section, c.parameter_name);

// Drawing Element  
CREATE CONSTRAINT FOR (d:DrawingElement) REQUIRE d.spec_dna_id IS UNIQUE;

// BOQ Line Item
CREATE CONSTRAINT FOR (b:BOQLine) REQUIRE b.line_id IS UNIQUE;

// Purchase Order Line
CREATE CONSTRAINT FOR (p:POLine) REQUIRE p.po_number IS UNIQUE;

// Vendor Submittal
CREATE CONSTRAINT FOR (s:VendorSubmittal) REQUIRE s.submittal_id IS UNIQUE;

// Test Step
CREATE CONSTRAINT FOR (t:TestStep) REQUIRE t.step_id IS UNIQUE;

// NCR
CREATE CONSTRAINT FOR (n:NCR) REQUIRE n.ncr_id IS UNIQUE;

// Supplier
CREATE CONSTRAINT FOR (v:Supplier) REQUIRE v.supplier_id IS UNIQUE;

// Zone / Location
CREATE CONSTRAINT FOR (z:Zone) REQUIRE z.zone_id IS UNIQUE;

// Regulatory Code Reference
CREATE CONSTRAINT FOR (r:CodeReference) REQUIRE r.ref_id IS UNIQUE;

// Shipment
CREATE CONSTRAINT FOR (sh:Shipment) REQUIRE sh.shipment_id IS UNIQUE;
```

### 4.2 Node Properties
```python
# backend/graph/schema.py

NODE_SCHEMAS = {
    "ContractClause": {
        "spec_dna_id": "str (SHA-256 fingerprint)",
        "section": "str (e.g. '6.7.1')",
        "parameter_name": "str (e.g. 'ambient_temperature_max')",
        "parameter_value": "float | str",
        "unit": "str (e.g. '°C', 'kW', 'mm')",
        "document_source": "str (filename)",
        "page_number": "int",
        "created_at": "datetime"
    },
    "VendorSubmittal": {
        "submittal_id": "str",
        "spec_dna_id": "str",
        "vendor_name": "str",
        "equipment_tag": "str (e.g. 'CT-01')",
        "document_path": "str",
        "upload_timestamp": "datetime",
        "status": "str (pending|approved|rejected|flagged)",
        "extracted_parameters": "JSON string",
        "r0_score": "float",
        "violation_count": "int"
    },
    "NCR": {
        "ncr_id": "str",
        "title": "str",
        "description": "str",
        "severity": "str (Critical|Major|Minor)",
        "raised_by": "str",
        "raised_at": "datetime",
        "equipment_tag": "str",
        "spec_dna_ref": "str (spec_dna_id of violated clause)",
        "status": "str (open|under_review|closed)",
        "voice_transcript": "str (optional)",
        "r0_score": "float"
    },
    "Supplier": {
        "supplier_id": "str",
        "name": "str",
        "tier": "int (1|2|3)",
        "country": "str",
        "risk_score": "float (0-1)",
        "on_time_rate": "float",
        "lat": "float",
        "lng": "float"
    },
    "Shipment": {
        "shipment_id": "str",
        "equipment_tag": "str",
        "supplier_id": "str",
        "origin_port": "str",
        "destination_port": "str",
        "expected_delivery": "date",
        "current_status": "str",
        "delay_days": "int",
        "risk_flag": "bool",
        "lat": "float",
        "lng": "float"
    }
}
```

### 4.3 Edge Types (Cypher)
```cypher
// Spec-DNA Lineage Chain
(ContractClause)-[:DERIVES_FROM]->(ContractClause)
(BOQLine)-[:DERIVES_FROM]->(ContractClause)
(POLine)-[:DERIVES_FROM]->(BOQLine)
(VendorSubmittal)-[:DERIVES_FROM]->(POLine)
(TestStep)-[:DERIVES_FROM]->(VendorSubmittal)

// Violations
(VendorSubmittal)-[:VIOLATES {
  deviation_type: str,
  expected_value: float,
  actual_value: float,
  severity: str,
  r0_score: float
}]->(ContractClause)

// Supply Chain
(Shipment)-[:SUPPLIED_BY]->(Supplier)
(Supplier)-[:TIER_OF]->(Supplier)
(POLine)-[:FULFILLED_BY]->(Shipment)

// Construction
(VendorSubmittal)-[:INSTALLED_AT]->(Zone)
(TestStep)-[:TESTS]->(VendorSubmittal)
(NCR)-[:RAISED_AGAINST]->(VendorSubmittal)
(NCR)-[:REFERENCES]->(ContractClause)

// Scheduling
(TestStep)-[:DEPENDS_ON]->(TestStep)
(POLine)-[:BLOCKS]->(TestStep)
```

### 4.4 Key Cypher Queries
```python
# backend/graph/queries.py

# Get full Spec-DNA chain for a submittal
GET_SPEC_DNA_CHAIN = """
MATCH path = (c:ContractClause)<-[:DERIVES_FROM*]-(s:VendorSubmittal {submittal_id: $submittal_id})
RETURN path
"""

# Get all violations with R0 scores above threshold
GET_HIGH_R0_VIOLATIONS = """
MATCH (s:VendorSubmittal)-[v:VIOLATES]->(c:ContractClause)
WHERE v.r0_score > $threshold
RETURN s, v, c
ORDER BY v.r0_score DESC
LIMIT 20
"""

# Get downstream impact of a violation (for R0 calculation)
GET_DOWNSTREAM_DEPENDENCIES = """
MATCH (s:VendorSubmittal {submittal_id: $submittal_id})-[:DERIVES_FROM*]->(c:ContractClause)
MATCH (downstream)-[:DERIVES_FROM*]->(c)
WHERE downstream.submittal_id <> $submittal_id
RETURN DISTINCT downstream, labels(downstream) as type
"""

# Get at-risk shipments
GET_AT_RISK_SHIPMENTS = """
MATCH (sh:Shipment)-[:SUPPLIED_BY]->(sup:Supplier)
WHERE sh.risk_flag = true OR sh.delay_days > 7
OPTIONAL MATCH (sup)-[:TIER_OF*]->(parent:Supplier)
RETURN sh, sup, collect(parent) as supply_chain
ORDER BY sh.delay_days DESC
"""

# Get all open NCRs with Spec-DNA
GET_OPEN_NCRS = """
MATCH (n:NCR {status: 'open'})-[:REFERENCES]->(c:ContractClause)
OPTIONAL MATCH (s:VendorSubmittal)-[:VIOLATES]->(c)
RETURN n, c, s
ORDER BY n.raised_at DESC
"""
```

---

## 5. Agent 1 — The Guardian

**File:** `backend/agents/guardian.py`

### What it does
- Receives a vendor submittal PDF upload
- Extracts all technical parameters via NER pipeline
- Compares each parameter against the PKG spec constraints
- Computes Spec-DNA chain for each violation
- Generates R0 score for each deviation
- Auto-drafts RFI document

### Core Logic
```python
# backend/agents/guardian.py

from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END
from backend.ingestion.parsers.pdf_parser import extract_parameters_from_pdf
from backend.graph.queries import GET_SPEC_DNA_CHAIN, GET_HIGH_R0_VIOLATIONS
from backend.r0.engine import compute_r0_score
from backend.graph.client import get_neo4j_session
import hashlib, json
from datetime import datetime

class GuardianState(TypedDict):
    submittal_id: str
    document_path: str
    extracted_parameters: dict       # {param_name: {value, unit, page}}
    violations: list                 # [{param, expected, actual, severity, r0}]
    spec_dna_chain: dict             # lineage for each violation
    rfi_draft: str                   # auto-generated RFI text
    r0_max: float                    # highest R0 in this submittal
    messages: list

def extract_parameters(state: GuardianState) -> GuardianState:
    """
    Step 1: Parse PDF and extract all technical parameters.
    Uses PyMuPDF for layout, NER model for parameter identification.
    
    Output shape:
    {
      "ambient_temp_max": {"value": 45.0, "unit": "°C", "page": 3, "confidence": 0.94},
      "cooling_capacity": {"value": 500, "unit": "kW", "page": 4, "confidence": 0.87}
    }
    """
    params = extract_parameters_from_pdf(state["document_path"])
    return {**state, "extracted_parameters": params}

def check_against_spec(state: GuardianState) -> GuardianState:
    """
    Step 2: Compare extracted parameters against PKG constraints.
    For each parameter, query Neo4j for the governing ContractClause.
    """
    violations = []
    with get_neo4j_session() as session:
        for param_name, param_data in state["extracted_parameters"].items():
            result = session.run("""
                MATCH (c:ContractClause {parameter_name: $param_name})
                RETURN c.parameter_value as required,
                       c.spec_dna_id as spec_dna_id,
                       c.section as section,
                       c.unit as unit
            """, param_name=param_name).single()
            
            if result and not _passes_constraint(param_data["value"], result["required"]):
                violations.append({
                    "parameter": param_name,
                    "required": result["required"],
                    "actual": param_data["value"],
                    "unit": param_data["unit"],
                    "spec_dna_id": result["spec_dna_id"],
                    "section": result["section"],
                    "page": param_data["page"]
                })
    return {**state, "violations": violations}

def compute_spec_dna(state: GuardianState) -> GuardianState:
    """
    Step 3: For each violation, build the full Spec-DNA lineage chain.
    Shows the mutation point in the requirement's journey.
    """
    chains = {}
    with get_neo4j_session() as session:
        for v in state["violations"]:
            result = session.run(GET_SPEC_DNA_CHAIN, 
                               submittal_id=state["submittal_id"]).data()
            chains[v["parameter"]] = result
    return {**state, "spec_dna_chain": chains}

def score_r0(state: GuardianState) -> GuardianState:
    """
    Step 4: Compute R0 contagion score for each violation.
    R0 = number of downstream tasks that will fail if this is unresolved.
    """
    scored = []
    r0_max = 0.0
    for v in state["violations"]:
        r0 = compute_r0_score(
            spec_dna_id=v["spec_dna_id"],
            submittal_id=state["submittal_id"]
        )
        v["r0_score"] = r0
        v["severity"] = _r0_to_severity(r0)
        r0_max = max(r0_max, r0)
        scored.append(v)
    
    # Write violations to PKG
    _write_violations_to_pkg(state["submittal_id"], scored)
    
    return {**state, "violations": scored, "r0_max": r0_max}

def draft_rfi(state: GuardianState) -> GuardianState:
    """
    Step 5: LLM-drafted RFI with full evidentiary Spec-DNA chain.
    """
    from langchain_anthropic import ChatAnthropic
    from backend.config import settings
    
    llm = ChatAnthropic(model="claude-sonnet-4-6")
    
    violation_summary = json.dumps(state["violations"][:3], indent=2)
    
    prompt = f"""
You are a senior EPC engineer drafting a formal RFI (Request for Information) document.

PROJECT: Hyperscale Data Centre - Phase 1
SUBMITTAL ID: {state["submittal_id"]}
DATE: {datetime.now().strftime('%d %B %Y')}

VIOLATIONS DETECTED:
{violation_summary}

Draft a formal, professional RFI that:
1. References the specific contract clause and section number
2. States the exact deviation (expected vs actual value with units)  
3. Requests vendor confirmation or substitution
4. Cites the Tier III certification implication
5. Sets a 5-business-day response deadline

Use standard EPC RFI format. Be concise and factual.
"""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    return {**state, "rfi_draft": response.content}

def build_guardian_graph():
    workflow = StateGraph(GuardianState)
    workflow.add_node("extract_parameters", extract_parameters)
    workflow.add_node("check_against_spec", check_against_spec)
    workflow.add_node("compute_spec_dna", compute_spec_dna)
    workflow.add_node("score_r0", score_r0)
    workflow.add_node("draft_rfi", draft_rfi)
    
    workflow.set_entry_point("extract_parameters")
    workflow.add_edge("extract_parameters", "check_against_spec")
    workflow.add_edge("check_against_spec", "compute_spec_dna")
    workflow.add_edge("compute_spec_dna", "score_r0")
    workflow.add_edge("score_r0", "draft_rfi")
    workflow.add_edge("draft_rfi", END)
    
    return workflow.compile()

def _r0_to_severity(r0: float) -> str:
    if r0 < 1.0: return "Minor"
    if r0 < 2.5: return "Major"
    if r0 < 5.0: return "Critical"
    return "Systemic"

def _passes_constraint(actual, required) -> bool:
    """Simple numeric comparison — extend for range, enum constraints."""
    try:
        return float(actual) >= float(required)
    except (TypeError, ValueError):
        return str(actual).lower() == str(required).lower()

guardian_graph = build_guardian_graph()
```

### API Endpoint
```python
# backend/routers/guardian.py

@router.post("/guardian/analyze")
async def analyze_submittal(file: UploadFile = File(...)):
    # Save file
    submittal_id = f"SUB-{uuid4().hex[:8].upper()}"
    path = f"/tmp/{submittal_id}.pdf"
    with open(path, "wb") as f:
        f.write(await file.read())
    
    # Run Guardian agent
    result = await guardian_graph.ainvoke({
        "submittal_id": submittal_id,
        "document_path": path,
        "extracted_parameters": {},
        "violations": [],
        "spec_dna_chain": {},
        "rfi_draft": "",
        "r0_max": 0.0,
        "messages": []
    })
    
    return {
        "submittal_id": submittal_id,
        "violations": result["violations"],
        "r0_max": result["r0_max"],
        "rfi_draft": result["rfi_draft"],
        "spec_dna_chain": result["spec_dna_chain"]
    }
```

---

## 6. Agent 2 — The Scheduler

**File:** `backend/agents/scheduler.py`

### What it does
- Parses project schedule CSV (MS Project / Primavera export format)
- Builds CPM dependency graph via NetworkX
- Runs Prophet time-series forecast on task completion probability
- XGBoost model for delay risk scoring per task
- Computes R0 score for each at-risk task
- Identifies critical path impacts

### Core Logic
```python
# backend/agents/scheduler.py

import networkx as nx
import pandas as pd
from prophet import Prophet
from xgboost import XGBClassifier
from backend.r0.engine import compute_r0_from_task_graph

class SchedulerState(TypedDict):
    schedule_data: list             # Raw CSV rows
    task_graph: nx.DiGraph          # CPM dependency graph
    at_risk_tasks: list             # Tasks with delay probability > 0.6
    r0_scores: dict                 # {task_id: r0_score}
    critical_path: list             # Ordered list of critical path task IDs
    mitigation_suggestions: list    # LLM-generated mitigations

def build_task_graph(state: SchedulerState) -> SchedulerState:
    """
    Parse schedule CSV and build NetworkX directed graph.
    
    CSV format expected:
    task_id, task_name, start_date, end_date, predecessors, 
    discipline, status, progress_pct, equipment_tag
    """
    df = pd.DataFrame(state["schedule_data"])
    G = nx.DiGraph()
    
    for _, row in df.iterrows():
        G.add_node(row["task_id"], **row.to_dict())
        
        if pd.notna(row.get("predecessors")):
            for pred in str(row["predecessors"]).split(";"):
                pred = pred.strip()
                if pred:
                    G.add_edge(pred, row["task_id"])
    
    # Compute critical path
    try:
        critical_path = nx.dag_longest_path(G)
    except nx.NetworkXUnfeasible:
        critical_path = []
    
    return {**state, "task_graph": G, "critical_path": critical_path}

def forecast_delays(state: SchedulerState) -> SchedulerState:
    """
    Prophet forecast: predict each task's completion date.
    XGBoost: binary classifier for delay risk (1 = will be late).
    
    Features: progress_pct, days_remaining, predecessor_delay_avg,
              supplier_risk_score, discipline_on_time_rate
    """
    at_risk = []
    
    for task_id, data in state["task_graph"].nodes(data=True):
        # Simple heuristic for MVP (replace with trained XGBoost model)
        delay_probability = _estimate_delay_probability(data, state["task_graph"])
        
        if delay_probability > 0.6:
            at_risk.append({
                "task_id": task_id,
                "task_name": data.get("task_name"),
                "delay_probability": delay_probability,
                "expected_delay_days": _estimate_delay_days(data),
                "on_critical_path": task_id in state["critical_path"],
                "discipline": data.get("discipline"),
                "equipment_tag": data.get("equipment_tag")
            })
    
    return {**state, "at_risk_tasks": at_risk}

def compute_task_r0(state: SchedulerState) -> SchedulerState:
    """
    R0 for schedule: how many downstream tasks are blocked if this task delays?
    """
    r0_scores = {}
    for task in state["at_risk_tasks"]:
        task_id = task["task_id"]
        # Count all reachable nodes downstream
        downstream = nx.descendants(state["task_graph"], task_id)
        
        # Weight by critical path membership
        critical_downstream = [t for t in downstream 
                               if t in state["critical_path"]]
        
        # R0 = total downstream + 2x weight for critical path tasks
        r0 = len(downstream) + len(critical_downstream)
        r0_scores[task_id] = round(r0 / 10, 1)  # Normalise to 0-10 scale
        task["r0_score"] = r0_scores[task_id]
        task["severity"] = _r0_to_severity(r0_scores[task_id])
    
    return {**state, "r0_scores": r0_scores}

def suggest_mitigations(state: SchedulerState) -> SchedulerState:
    """LLM suggests actionable mitigations for top 3 R0 risks."""
    from langchain_anthropic import ChatAnthropic
    
    top_risks = sorted(state["at_risk_tasks"], 
                       key=lambda x: x.get("r0_score", 0), 
                       reverse=True)[:3]
    
    llm = ChatAnthropic(model="claude-sonnet-4-6")
    prompt = f"""
You are a senior EPC project manager. These tasks are at high delay risk:

{json.dumps(top_risks, indent=2)}

For each task, suggest ONE specific, actionable mitigation that can be 
executed within 48 hours. Format as JSON array with fields:
task_id, mitigation_action, responsible_party, deadline_hours
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    mitigations = json.loads(response.content)
    return {**state, "mitigation_suggestions": mitigations}

def _estimate_delay_probability(task_data: dict, G: nx.DiGraph) -> float:
    """
    Heuristic delay model for MVP.
    Replace with trained XGBoost model in production.
    """
    progress = float(task_data.get("progress_pct", 0)) / 100
    status = task_data.get("status", "").lower()
    
    if status == "delayed": return 0.9
    if status == "at_risk": return 0.75
    if progress < 0.2: return 0.65
    return 0.3
```

---

## 7. Agent 3 — The Oracle

**File:** `backend/agents/oracle.py`

### What it does
- Loads supplier graph from Neo4j (Tier 1/2/3 relationships)
- Pulls shipment status data (mock API or JSON for demo)
- Computes supplier risk scores
- Flags at-risk shipments
- Finds alternative suppliers for at-risk deliveries

```python
# backend/agents/oracle.py — Key functions

def get_at_risk_shipments(project_id: str) -> list:
    """Query Neo4j for flagged shipments with full Tier chain."""
    with get_neo4j_session() as session:
        return session.run(GET_AT_RISK_SHIPMENTS).data()

def find_alternative_suppliers(equipment_tag: str, 
                                failing_supplier_id: str) -> list:
    """
    Graph traversal: find suppliers with same equipment grade
    but different supply chain path (avoids same-risk exposure).
    """
    with get_neo4j_session() as session:
        return session.run("""
            MATCH (s:Supplier)-[:CAN_SUPPLY {equipment_tag: $tag}]->()
            WHERE s.supplier_id <> $failing_id
              AND s.risk_score < 0.4
              AND s.on_time_rate > 0.85
            RETURN s
            ORDER BY s.risk_score ASC
            LIMIT 3
        """, tag=equipment_tag, failing_id=failing_supplier_id).data()

def get_geospatial_shipments(project_id: str) -> dict:
    """Returns GeoJSON FeatureCollection for Leaflet map rendering."""
    shipments = get_at_risk_shipments(project_id)
    features = []
    for s in shipments:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", 
                        "coordinates": [s["lng"], s["lat"]]},
            "properties": {
                "shipment_id": s["shipment_id"],
                "equipment_tag": s["equipment_tag"],
                "delay_days": s["delay_days"],
                "risk_flag": s["risk_flag"],
                "status": s["current_status"]
            }
        })
    return {"type": "FeatureCollection", "features": features}
```

---

## 8. Agent 4 — The Inspector

**File:** `backend/agents/inspector.py`

### What it does
- Serves commissioning checklist to mobile app
- Receives voice transcript from field engineer
- Converts voice observation to structured NCR via LLM
- Traces Spec-DNA root cause for the NCR
- Writes NCR to Neo4j PKG
- Generates as-built commissioning record

```python
# backend/agents/inspector.py

async def process_voice_ncr(
    voice_transcript: str,
    equipment_tag: str,
    step_id: str,
    raised_by: str
) -> dict:
    """
    Convert voice observation to structured NCR with Spec-DNA.
    
    Input: "Fuel consumption reads 285 litres per hour against spec 260"
    Output: Structured NCR with severity, spec reference, R0 score
    """
    from langchain_anthropic import ChatAnthropic
    
    llm = ChatAnthropic(model="claude-sonnet-4-6")
    prompt = f"""
Convert this field engineer voice observation into a structured NCR.

OBSERVATION: "{voice_transcript}"
EQUIPMENT TAG: {equipment_tag}
TEST STEP: {step_id}

Return ONLY valid JSON with these fields:
{{
  "title": "short NCR title",
  "description": "detailed description",
  "parameter_name": "the parameter that failed (snake_case)",
  "actual_value": <number or string>,
  "unit": "unit of measurement",
  "severity_suggestion": "Critical|Major|Minor",
  "immediate_action": "what should happen next"
}}
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    ncr_data = json.loads(response.content)
    
    # Trace Spec-DNA for the violated parameter
    spec_dna_ref = _find_spec_dna_for_parameter(
        ncr_data["parameter_name"], equipment_tag
    )
    
    # Write to PKG
    ncr_id = f"NCR-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:4].upper()}"
    _write_ncr_to_pkg(ncr_id, ncr_data, spec_dna_ref, raised_by)
    
    # Compute R0
    r0 = compute_r0_score(spec_dna_id=spec_dna_ref, 
                          submittal_id=equipment_tag)
    
    return {
        "ncr_id": ncr_id,
        "ncr_data": ncr_data,
        "spec_dna_ref": spec_dna_ref,
        "r0_score": r0,
        "severity": _r0_to_severity(r0)
    }
```

---

## 9. Agent 5 — The Brain

**File:** `backend/agents/brain.py`

### What it does
- Hybrid BM25 + dense retrieval over all project documents
- Answers natural language queries with cited sources
- Cross-references RFI corpus to surface similar resolved issues
- Returns response with Spec-DNA node links

```python
# backend/agents/brain.py

from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from chromadb import PersistentClient
from langchain_anthropic import ChatAnthropic

class BrainAgent:
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-6",
            max_tokens=2000
        )
        self.chroma_client = PersistentClient(
            path=settings.CHROMA_PERSIST_DIR
        )
        self.collection = self.chroma_client.get_collection("strand_docs")
    
    async def query(self, question: str, project_id: str) -> dict:
        """
        Main query handler.
        1. Hybrid retrieval (BM25 + dense)
        2. LLM answer generation with citations
        3. Neo4j lookup for related RFIs
        """
        # Retrieve relevant chunks
        chunks = self._hybrid_retrieve(question, k=8)
        
        # Build context with source attribution
        context = self._build_context(chunks)
        
        # Check for related resolved RFIs
        related_rfis = self._find_related_rfis(question)
        
        # Generate cited answer
        prompt = f"""
You are STRAND's Brain — the knowledge copilot for a hyperscale data centre EPC project.

Answer the engineer's question using ONLY the provided context.
Always cite your sources as [Doc: filename, Page: N, Section: X.X].
If a similar RFI has been resolved before, mention it.
Be specific and technical. Use engineering units.

CONTEXT:
{context}

RELATED RESOLVED RFIs:
{json.dumps(related_rfis[:2], indent=2)}

QUESTION: {question}

Respond in this JSON format:
{{
  "answer": "your detailed answer",
  "citations": [
    {{"document": "filename", "page": N, "section": "X.X", "excerpt": "brief quote"}}
  ],
  "related_rfis": ["rfi_id_1"],
  "confidence": "High|Medium|Low",
  "spec_dna_ids": ["id1", "id2"]
}}
"""
        response = self.llm.invoke([HumanMessage(content=prompt)])
        return json.loads(response.content)
    
    def _hybrid_retrieve(self, query: str, k: int = 8) -> list:
        """BM25 + dense embedding hybrid retrieval."""
        # Dense retrieval via Chroma
        dense_results = self.collection.query(
            query_texts=[query],
            n_results=k
        )
        
        # BM25 keyword retrieval (pre-built from document corpus)
        # Returns list of {text, source, page, section}
        bm25_results = self.bm25_retriever.get_relevant_documents(query)
        
        # Merge and deduplicate (RRF fusion)
        return self._reciprocal_rank_fusion(
            dense_results["documents"][0], 
            [d.page_content for d in bm25_results]
        )
    
    def _find_related_rfis(self, question: str) -> list:
        """Find resolved RFIs with similar topic via Neo4j."""
        with get_neo4j_session() as session:
            # Simple keyword match — upgrade to semantic search later
            keywords = question.lower().split()[:5]
            return session.run("""
                MATCH (r:RFI {status: 'resolved'})
                WHERE any(kw IN $keywords WHERE toLower(r.description) CONTAINS kw)
                RETURN r LIMIT 3
            """, keywords=keywords).data()

brain_agent = BrainAgent()
```

---

## 10. LangGraph Orchestration Layer

**File:** `backend/agents/orchestrator.py`

```python
# backend/agents/orchestrator.py
# Routes incoming events to the right agent

from langgraph.graph import StateGraph, END
from backend.agents.guardian import guardian_graph
from backend.agents.scheduler import scheduler_graph  
from backend.agents.oracle import oracle_graph
from backend.agents.brain import brain_agent

class OrchestratorState(TypedDict):
    event_type: str          # "submittal_upload" | "schedule_update" | "query" | "ncr"
    payload: dict
    results: dict
    active_agents: list

def route_event(state: OrchestratorState) -> str:
    """Route to correct agent based on event type."""
    return {
        "submittal_upload": "guardian",
        "schedule_update": "scheduler",
        "shipment_update": "oracle",
        "voice_ncr": "inspector",
        "query": "brain"
    }.get(state["event_type"], "brain")

def run_guardian(state: OrchestratorState) -> OrchestratorState:
    result = guardian_graph.invoke(state["payload"])
    return {**state, "results": {"guardian": result}}

# ... similar wrappers for each agent

def build_orchestrator():
    workflow = StateGraph(OrchestratorState)
    workflow.add_node("guardian", run_guardian)
    workflow.add_node("scheduler", run_scheduler)
    workflow.add_node("oracle", run_oracle)
    workflow.add_node("inspector", run_inspector)
    workflow.add_node("brain", run_brain)
    
    workflow.set_conditional_entry_point(route_event, {
        "guardian": "guardian",
        "scheduler": "scheduler",
        "oracle": "oracle",
        "inspector": "inspector",
        "brain": "brain"
    })
    
    for node in ["guardian", "scheduler", "oracle", "inspector", "brain"]:
        workflow.add_edge(node, END)
    
    return workflow.compile()

orchestrator = build_orchestrator()
```

---

## 11. FastAPI Backend Routes

**File:** `backend/main.py`

```python
# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import documents, guardian, scheduler, oracle, inspector, brain, health
from backend.config import settings

app = FastAPI(title="STRAND API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(health.router)
app.include_router(documents.router, prefix="/api/v1")
app.include_router(guardian.router, prefix="/api/v1")
app.include_router(scheduler.router, prefix="/api/v1")
app.include_router(oracle.router, prefix="/api/v1")
app.include_router(inspector.router, prefix="/api/v1")
app.include_router(brain.router, prefix="/api/v1")
```

### Complete Route Table
```
GET    /health                              Health check + agent status
POST   /api/v1/documents/upload             Upload any document for ingestion
GET    /api/v1/documents/{id}               Document status + PKG node count

POST   /api/v1/guardian/analyze             Analyze submittal PDF → violations
GET    /api/v1/guardian/violations          List all violations (filter by severity/R0)
GET    /api/v1/guardian/violations/{id}     Single violation + Spec-DNA chain
GET    /api/v1/guardian/rfi/{violation_id}  Get auto-drafted RFI
POST   /api/v1/guardian/rfi/{id}/approve    Approve + transmit RFI

GET    /api/v1/scheduler/risks              All at-risk tasks with R0 scores
GET    /api/v1/scheduler/critical-path      Critical path with milestone status
GET    /api/v1/scheduler/r0/{task_id}       R0 score + downstream impact map
GET    /api/v1/scheduler/mitigations        LLM mitigation suggestions

GET    /api/v1/oracle/shipments             All shipments GeoJSON
GET    /api/v1/oracle/shipments/at-risk     At-risk shipments only
GET    /api/v1/oracle/supply-chain/{id}     Full Tier-1/2/3 tree for a shipment
GET    /api/v1/oracle/alternatives/{tag}    Alternative suppliers for equipment tag

GET    /api/v1/inspector/checklist/{tag}    Commissioning checklist for equipment
POST   /api/v1/inspector/ncr               Create NCR (text or voice transcript)
GET    /api/v1/inspector/ncrs              All open NCRs
GET    /api/v1/inspector/as-built/{tag}    Generated as-built record for equipment

POST   /api/v1/brain/query                 Natural language query → cited answer
GET    /api/v1/brain/rfis/similar          Find similar resolved RFIs

GET    /api/v1/project/immunity-score      Overall project health 0-100
GET    /api/v1/project/summary             KPI summary for dashboard
```

---

## 12. Next.js Frontend

### 12.1 Risk Cockpit Dashboard (`app/page.tsx`)
```
Components needed:
├── ImmunityScore          — Large circular gauge (0-100), animates on load
├── StatCard × 4           — Violations Today, Open NCRs, At-Risk Shipments, R0 Max
├── ViolationFeed          — Real-time stream of Guardian outputs
├── R0Heatmap              — Grid of project zones coloured by R0 score
└── AgentStatusBar         — Live/idle status for all 5 agents
```

### 12.2 Guardian Page (`app/guardian/page.tsx`)
```
Components needed:
├── UploadZone             — Drag-drop PDF upload with progress
├── ViolationList          — Sortable by severity / R0 / date
├── ViolationDetail        — Full Spec-DNA chain as visual node graph
│   └── SpecDnaChain       — Contract Clause → BOQ → PO → Submittal chain
│       └── MutationPoint  — Red highlight on the node where value changed
├── RfiPreview             — Split pane: auto-draft on right, violations on left
└── RfiActions             — Approve / Edit / Transmit buttons
```

### 12.3 Scheduler Page (`app/scheduler/page.tsx`)
```
Components needed:
├── R0Gauge                — Animated gauge showing highest current R0
├── CriticalPathTimeline   — Horizontal bar chart with risk overlay
├── MilestoneGrid          — Table: task, delay prob, R0, severity
├── R0ContagionMap         — Network graph showing infected downstream tasks
└── MitigationPanel        — LLM suggestions, one per at-risk task
```

### 12.4 Oracle Page (`app/oracle/page.tsx`)
```
Components needed:
├── SupplyMap              — Leaflet map with shipment markers
│   ├── ShipmentMarker     — Green/amber/red dot based on risk
│   └── ShipmentPopup      — On click: equipment, delay, Tier chain
├── ShipmentTable          — List view with sort/filter
├── SupplierTree           — Collapsible Tier-1/2/3 tree
└── AlternativesPanel      — Alternative supplier cards on at-risk click
```

### 12.5 Brain Page (`app/brain/page.tsx`)
```
Components needed:
├── ChatWindow             — Message thread, scrollable
├── MessageBubble          — User (right) / Brain (left) with avatar
├── CitationBadge          — Clickable pill: "Spec Rev-3 p.47 §7.4.2"
├── DocumentDrawer         — Slide-in: highlighted source page on citation click
└── RfiSuggestion          — "Similar RFI #127 resolved Feb 2026 — view?"
```

---

## 13. Mobile React Native App (Inspector)

**Framework:** React Native (Expo) for iOS/Android native deployment  
**Key Screens:**

```typescript
// mobile/screens/ChecklistScreen.tsx
// Shows IST checklist for an equipment tag
// Each step: checkbox, acceptance criteria, camera button, notes

// mobile/screens/QrScanScreen.tsx
// Uses expo-barcode-scanner
// Scans QR code on equipment → fetches checklist from API

// mobile/screens/NcrLogScreen.tsx
// Voice recording: expo-av
// Transcription: Native voice recognition (@react-native-voice/voice) or backend transcription using Whisper API
// Submit: POST /api/v1/inspector/ncr with transcript

// mobile/screens/SyncStatusScreen.tsx
// Shows offline queue when no internet
// AsyncStorage for offline-first data
// Auto-sync on connectivity restore
```

### Expo App Config (app.json)
```json
{
  "expo": {
    "name": "STRAND Inspector",
    "slug": "strand-inspector",
    "platforms": ["ios", "android"],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#1A1A2E"
      }
    }
  }
}
```

---

## 14. Synthetic Dataset Generation

**Run:** `python scripts/generate_synthetic_data.py`

```python
# scripts/generate_synthetic_data.py

"""
Generates all files needed in /data/ for a reliable demo.
Run once in Week 1. All demo inputs are pre-validated.
"""

import json
import pandas as pd
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, Paragraph

def generate_supplier_graph():
    """
    10 Tier-1, 18 Tier-2, 12 Tier-3 suppliers.
    3 shipments flagged at-risk.
    """
    suppliers = [
        # Tier-1
        {"supplier_id": "S001", "name": "Schneider Electric India", "tier": 1, 
         "risk_score": 0.15, "on_time_rate": 0.94, "lat": 28.6, "lng": 77.2},
        {"supplier_id": "S002", "name": "Vertiv Solutions", "tier": 1,
         "risk_score": 0.22, "on_time_rate": 0.89, "lat": 19.0, "lng": 72.8},
        # ... add 8 more Tier-1
    ]
    
    shipments = [
        {
            "shipment_id": "SHP-001",
            "equipment_tag": "CT-01",
            "supplier_id": "S001",
            "expected_delivery": "2026-07-15",
            "current_status": "In Transit - Port Congestion",
            "delay_days": 12,
            "risk_flag": True,
            "lat": 22.5, "lng": 88.3   # Kolkata port
        },
        # ... add 46 more (3 risk_flag=True, rest False)
    ]
    
    with open("data/supplier_graph_data.json", "w") as f:
        json.dump({"suppliers": suppliers, "shipments": shipments}, f, indent=2)

def generate_schedule_csv():
    """100-task schedule with 3 artificially delayed tasks."""
    tasks = []
    base_date = datetime(2026, 3, 1)
    
    for i in range(1, 101):
        tasks.append({
            "task_id": f"T{i:03d}",
            "task_name": f"Task {i} - {['Civil', 'MEP', 'IT', 'Commissioning'][i % 4]}",
            "start_date": (base_date + timedelta(days=i*2)).strftime("%Y-%m-%d"),
            "end_date": (base_date + timedelta(days=i*2+5)).strftime("%Y-%m-%d"),
            "predecessors": f"T{(i-1):03d}" if i > 1 else "",
            "discipline": ["Civil", "MEP", "IT", "Cx"][i % 4],
            "status": "delayed" if i in [23, 47, 78] else "on_track",
            "progress_pct": 85 if i in [23, 47, 78] else min(100, i * 1.5),
            "equipment_tag": f"EQ-{i:03d}"
        })
    
    pd.DataFrame(tasks).to_csv("data/project_schedule_100tasks.csv", index=False)

def generate_commissioning_checklist():
    """23-step IST checklist for 1500kVA generator."""
    checklist = {
        "equipment_tag": "GEN-01",
        "equipment_name": "1500kVA Diesel Generator",
        "test_type": "Integrated System Test (IST)",
        "standard": "TIA-942-B",
        "steps": [
            {
                "step_id": "IST-001",
                "sequence": 1,
                "description": "Verify fuel level at minimum 90% capacity",
                "acceptance_criteria": ">= 900 litres",
                "parameter_name": "fuel_level_litres",
                "expected_value": 900,
                "unit": "litres",
                "tia942_clause": "§8.3.1"
            },
            {
                "step_id": "IST-002",
                "sequence": 2,
                "description": "Measure fuel consumption at full load",
                "acceptance_criteria": "<= 260 litres/hour at rated load",
                "parameter_name": "fuel_consumption_lph",
                "expected_value": 260,
                "unit": "l/hr",
                "tia942_clause": "§8.3.4"
            },
            # ... 21 more steps
        ]
    }
    
    with open("data/commissioning_checklist_generator.json", "w") as f:
        json.dump(checklist, f, indent=2)

if __name__ == "__main__":
    generate_supplier_graph()
    generate_schedule_csv()
    generate_commissioning_checklist()
    print("Synthetic dataset generated in /data/")
    print("Now run: python scripts/seed_db.py")
```

### Database Seeder
```python
# scripts/seed_db.py

"""
Seeds Neo4j PKG + Chroma vector store from /data/ directory.
Run once after generate_synthetic_data.py
"""

from backend.graph.client import get_neo4j_session
from backend.vector.store import get_chroma_collection
from backend.ingestion.pipeline import ingest_document
from backend.ingestion.spec_dna.fingerprint import generate_spec_dna_id
import json, os

def seed_neo4j():
    with get_neo4j_session() as session:
        # Load supplier graph
        with open("data/supplier_graph_data.json") as f:
            data = json.load(f)
        
        for supplier in data["suppliers"]:
            session.run("""
                MERGE (s:Supplier {supplier_id: $id})
                SET s += $props
            """, id=supplier["supplier_id"], props=supplier)
        
        for shipment in data["shipments"]:
            session.run("""
                MERGE (sh:Shipment {shipment_id: $id})
                SET sh += $props
                WITH sh
                MATCH (s:Supplier {supplier_id: $supplier_id})
                MERGE (sh)-[:SUPPLIED_BY]->(s)
            """, id=shipment["shipment_id"], 
                 supplier_id=shipment["supplier_id"],
                 props=shipment)
        
        # Seed spec clauses (15 parametric requirements)
        spec_clauses = [
            {
                "parameter_name": "ambient_temperature_max",
                "parameter_value": 50.0, "unit": "°C",
                "section": "6.7.1", "document_source": "spec_tia942_synthetic.pdf"
            },
            {
                "parameter_name": "fuel_consumption_lph",
                "parameter_value": 260.0, "unit": "l/hr",
                "section": "8.3.4", "document_source": "spec_tia942_synthetic.pdf"
            },
            # ... 13 more parameters
        ]
        
        for clause in spec_clauses:
            clause["spec_dna_id"] = generate_spec_dna_id(
                clause["parameter_name"], clause["parameter_value"]
            )
            session.run("""
                MERGE (c:ContractClause {spec_dna_id: $spec_dna_id})
                SET c += $props
            """, spec_dna_id=clause["spec_dna_id"], props=clause)
        
        print("Neo4j seeded.")

def seed_chroma():
    """Ingest all PDFs in /data/ into Chroma vector store."""
    collection = get_chroma_collection()
    
    pdf_files = [f for f in os.listdir("data") if f.endswith(".pdf")]
    for pdf_file in pdf_files:
        ingest_document(f"data/{pdf_file}", collection)
        print(f"Ingested: {pdf_file}")
    
    print(f"Chroma seeded with {collection.count()} chunks.")

if __name__ == "__main__":
    seed_neo4j()
    seed_chroma()
    print("Database seeding complete. Run: python scripts/precompute_demo.py")
```

---

## 15. Build Order & Week-by-Week Plan

### Week 1 — Foundation
```
Day 1-2:
  [ ] Repo setup, .env, Docker Compose
  [ ] FastAPI skeleton with /health endpoint
  [ ] Neo4j Aura free account + schema setup
  [ ] Chroma local setup
  [ ] Run generate_synthetic_data.py
  [ ] Run seed_db.py — verify data in Neo4j Browser

Day 3-4:
  [ ] Document ingestion pipeline (pdf_parser.py)
  [ ] Embedding pipeline + Chroma ingestion
  [ ] Agent 5 (Brain) — basic RAG with citations
  [ ] /api/v1/brain/query endpoint
  [ ] Test Brain with 5 manual questions

Day 5-7:
  [ ] Next.js frontend scaffold
  [ ] Brain chat UI (ChatWindow + MessageBubble + CitationBadge)
  [ ] Connect frontend to Brain API
  [ ] Week 1 milestone: Working chatbot with source citations
```

### Week 2 — Guardian (Core Demo Value)
```
Day 1-2:
  [ ] NER parameter extraction pipeline
  [ ] Spec-DNA fingerprint.py + chain.py
  [ ] Guardian agent Steps 1-3 (extract, check, spec-dna)
  [ ] Test against vendor_submittal_cooling_tower.pdf

Day 3-4:
  [ ] R0 engine core logic (engine.py)
  [ ] Guardian Step 4 (R0 scoring)
  [ ] RFI auto-drafter (Step 5)
  [ ] /api/v1/guardian/analyze endpoint

Day 5-7:
  [ ] Guardian UI: UploadZone + ViolationCard
  [ ] SpecDnaChain visual component
  [ ] RfiPreview component
  [ ] Week 2 milestone: Upload cooling tower PDF → see violation + RFI
```

### Week 3 — Scheduler + Oracle
```
Day 1-3:
  [ ] Schedule CSV parser
  [ ] NetworkX CPM graph builder
  [ ] Delay probability heuristic model
  [ ] R0 task scoring
  [ ] /api/v1/scheduler/risks endpoint
  [ ] Scheduler UI: R0Gauge + CriticalPathTimeline

Day 4-5:
  [ ] Oracle: load supplier graph from Neo4j
  [ ] Oracle: shipments GeoJSON endpoint
  [ ] Leaflet map component (SupplyMap)
  [ ] ShipmentPopup with Tier chain

Day 6-7:
  [ ] Inter-agent PKG communication
  [ ] Risk Cockpit dashboard page
  [ ] ImmunityScore component
  [ ] Week 3 milestone: Full dashboard + map working
```

### Week 4 — Inspector + Polish + Demo
```
Day 1-2:
  [ ] Inspector API: checklist + NCR endpoints
  [ ] Mobile App: QrScanScreen + ChecklistScreen
  [ ] Voice-to-NCR pipeline (Native Speech SDK / Whisper API backend)

Day 3-4:
  [ ] End-to-end demo flow rehearsal (7-beat script)
  [ ] Fix all blocking bugs
  [ ] Pre-run precompute_demo.py
  [ ] Record demo video (backup)

Day 5-6:
  [ ] Architecture diagram (draw.io / Excalidraw)
  [ ] Presentation deck (12-15 slides)
  [ ] GitHub README with setup in 5 commands
  [ ] Deploy to Railway

Day 7:
  [ ] Dry run presentation × 3
  [ ] Verify pre-loaded demo data
  [ ] Offline backup video ready
  [ ] Week 4 milestone: Everything submitted
```

---

## 16. Deployment

### Railway Deployment (Free Tier)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
# (copy from .env, never commit .env)
```

### docker-compose.yml (Local Dev)
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - ./chroma_db:/app/chroma_db
      - ./data:/app/data
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

### Quick Start (5 commands for README)
```bash
git clone https://github.com/YOUR_USERNAME/strand && cd strand
cp .env.example .env               # Fill in API keys
pip install -r requirements.txt && cd frontend && npm install && cd ..
python scripts/seed_db.py          # Seeds Neo4j + Chroma
uvicorn backend.main:app --reload & cd frontend && npm run dev
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

---

## 17. Demo Day Checklist

```
THE NIGHT BEFORE:
[ ] Run precompute_demo.py — caches all 20 demo queries
[ ] Test full 7-beat demo script end-to-end × 2
[ ] Charge phone for Inspector Mobile App demo
[ ] Load vendor_submittal_cooling_tower.pdf in upload zone (ready to go)
[ ] Demo video backed up locally as MP4
[ ] Architecture diagram exported as high-res PNG
[ ] Deck reviewed for typos, all ₹ symbols rendering correctly

DEMO DAY:
[ ] Open Risk Cockpit dashboard on presenter laptop
[ ] Open Inspector App on phone
[ ] Open Brain chat with pre-typed question ready (UPS room fire suppression)
[ ] Have cooling tower datasheet ready to drag-drop
[ ] Know these numbers cold: ₹25.2 Crore, 47 days → 4 hours, 67%, ₹15B, R0: 4.2

THE 7 BEATS (rehearse until muscle memory):
[ ] Beat 1: Vendor uploads shop drawing (0:00–0:30) — "Just a normal day on site."
[ ] Beat 2: Spec-DNA fires on cooling tower (0:30–1:15) — "STRAND catches it in 8 seconds."
[ ] Beat 3: R0 climbs to 4.2, ₹5.2 Crore at risk (1:15–1:45) — "This is what it costs."
[ ] Beat 4: RFI auto-drafted, transmitted (1:45–2:15) — "The loop closes."
[ ] Beat 5: Schedule simulation shows +72hr slip (2:15–2:50) — "We see the future."
[ ] Beat 6: Mobile IST, voice NCR fires (2:50–3:30) — "This is the field."
[ ] Beat 7: Immunity score climbs back to green (3:30–4:00) — "STRAND. Always watching."

IF INTERNET FAILS:
[ ] Switch to pre-recorded MP4 immediately — do not troubleshoot live
[ ] Continue narrating over video — same 7 beats, same energy
```

---

*STRAND — The DNA of Every Great Build*  
*ET AI Hackathon 2026 · Problem Statement 4*  
*Build guide version 1.0 · June 2026*
