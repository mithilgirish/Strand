# STRAND — Full Project Context & Understanding

> **Created:** 2026-07-19  
> **Purpose:** Context handoff document so any new AI model can pick up where we left off.  
> **Location:** Outside the Strand folder intentionally, for model-switching.

---

## 1. What Is Strand?

Strand is a **construction project management platform** for **hyperscale data centre builds**. It uses **AI agents** to monitor schedules, supply chains, spec compliance, and quality. Think of it as an "immune system" for construction — it detects risks and auto-generates responses.

**Domain:** Data centre construction (TIA-942 standard)  
**Project being tracked:** `PRJ-942-HYPERSCALE` — Hyperscale Data Centre Build in Mumbai, India  

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js (TypeScript/React), lives in `Strand/frontend/` |
| **Backend** | FastAPI (Python), lives in `Strand/backend/` |
| **Mobile** | Expo (React Native), lives in `Strand/mobile/` |
| **Database** | Neo4j (knowledge graph) + Supabase (Postgres for auth/CRUD) |
| **Cache** | Redis (falls back to in-memory dict) |
| **LLM** | Groq (llama3-8b-8192), swappable to Anthropic |
| **Auth** | Supabase Auth with JWT |
| **External Integrations** | Procore (sandbox), Autodesk APS (Forge) |

---

## 3. The 6 AI Agents

The core architecture is built around **6 specialized agents** — each is a FastAPI router + an agent module:

### 3.1 Guardian Agent (`/guardian/*`)
- **Purpose:** Spec compliance checking for vendor submittals (PDFs)
- **Flow:** Upload PDF → extract params → compare against TIA-942 contract clauses → flag violations → auto-draft RFIs
- **Key concept:** "Spec DNA" — each contract clause gets a deterministic fingerprint ID
- **Files:** `backend/routers/guardian.py`, `backend/agents/guardian.py`
- **Data:** `data/vendor_submittal_*.pdf`, `data/spec_tia942_synthetic.pdf`
- **Demo data:** `backend/demo_data.py` contains 9 contract clauses (ambient temp, UPS redundancy, fire suppression, fuel consumption, cable derating, cooling capacity, floor loading, chilled water temp, PDU efficiency)

### 3.2 Scheduler Agent (`/scheduler/*`)
- **Purpose:** Schedule risk analysis, critical path, R0 scoring
- **Key concept:** "R0 Score" — borrowed from epidemiology. Measures how many downstream tasks a delay "infects"
- **Endpoints:** `/scheduler/risks`, `/scheduler/critical-path`, `/scheduler/r0`, `/scheduler/timeline`, `/scheduler/milestones`, `/scheduler/apply-mitigation`
- **Files:** `backend/routers/scheduler.py`, `backend/agents/scheduler.py`
- **Data:** `data/project_schedule_100tasks.csv` (100 tasks, columns: task_id, task_name, start_date, end_date, status, progress_pct, predecessors, discipline, equipment_tag)
- **Parser:** `backend/ingestion/parsers/csv_parser.py` — uses `csv.DictReader`, skips rows with empty task_id

### 3.3 Oracle Agent (`/oracle/*`)
- **Purpose:** Supply chain monitoring — tracks shipments, supplier risk, finds alternatives
- **Endpoints:** `/oracle/shipments`, `/oracle/shipments/at-risk`, `/oracle/supply-chain/{id}`, `/oracle/alternatives/{tag}`, `/oracle/initiate-switch`
- **Files:** `backend/routers/oracle.py`, `backend/agents/oracle.py`
- **Data:** `data/supplier_graph_data.json` — contains `suppliers[]` (40 items) and `shipments[]` (47 items)
- **Supplier fields:** id, name, tier (1-3), risk_score (0-1), country, city, state, lat, lng, on_time_rate
- **Shipment fields:** id, origin_supplier, destination, eta, risk_flag, lat, lng, supplier_name, equipment_tag, origin_port, destination_port, expected_delivery, delay_days, current_status

### 3.4 Inspector Agent (`/inspector/*`)
- **Purpose:** QA/commissioning checklists, NCR (Non-Conformance Report) logging, as-built records
- **Endpoints:** `/inspector/checklist/{tag}`, `/inspector/ncr`, `/inspector/ncrs`, `/inspector/checklist/{tag}/close`, `/inspector/as-built/{tag}`
- **Files:** `backend/routers/inspector.py`, `backend/agents/inspector.py`
- **Data:** `data/commissioning_checklist_generator.json`

### 3.5 Dashboard Agent (`/dashboards/*`, `/dashboard/*`)
- **Purpose:** AI-generated BI dashboards from natural language prompts
- **Key feature:** Generates Cypher queries for Neo4j, with tenant isolation injection
- **Security:** Strict Cypher sanitization — no writes, no comments, auto-injects `tenant_id` 
- **Endpoints:** `/dashboards/generate`, `/dashboards/query`, `/dashboards/save`, `/dashboards/list`, `/dashboard/build` (demo compat)
- **Files:** `backend/routers/dashboards.py`, `backend/agents/dashboard.py`

### 3.6 Other Agents
- **Brain** (`/brain/*`) — Orchestration/meta-agent
- **Judge** (`/judge/*`) — Decision validation
- **Planner** (`/planner/*`) — Project planning

---

## 4. Project Structure

```
Strand/
├── backend/
│   ├── agents/           # Agent logic (scheduler.py, oracle.py, guardian.py, inspector.py, dashboard.py)
│   ├── approvals/        # HITL approval flows
│   ├── config.py         # Settings from .env
│   ├── demo_data.py      # Fallback contract clauses (9 TIA-942 specs)
│   ├── deps.py           # Auth deps (get_current_user, rate limiter)
│   ├── errors.py         # Error handling
│   ├── graph/            # Neo4j client
│   ├── ingestion/
│   │   ├── parsers/      # csv_parser.py, json_parser.py, pdf_parser.py, vision_parser.py
│   │   ├── ner/          # Named entity recognition
│   │   ├── spec_dna/     # Spec DNA fingerprinting (generate_spec_dna_id)
│   │   └── pipeline.py   # Ingestion pipeline
│   ├── llm/              # LLM client abstraction
│   ├── main.py           # FastAPI app entry
│   ├── models/           # Pydantic models
│   ├── procore_client.py # Procore API client
│   ├── autodesk_client.py # Autodesk APS client
│   ├── primavera_client.py # Primavera P6 client
│   ├── maximo_client.py  # IBM Maximo client
│   ├── redis_client.py   # Redis wrapper (falls back to in-memory dict)
│   ├── routers/          # All API routes (17 files)
│   │   ├── scheduler.py, oracle.py, guardian.py, inspector.py
│   │   ├── dashboards.py, admin.py, chat.py, project.py
│   │   ├── integrations.py, approvals.py, planner.py
│   │   ├── brain.py, judge.py, metrics.py, health.py, documents.py
│   │   └── __init__.py
│   ├── tests/            # test_phase2.py, test_phase3_custom_plan.py
│   └── requirements.txt
├── frontend/             # Next.js app
│   └── components/
│       └── oracle/       # AlternativesPanel.tsx, SupplierTree.tsx, SupplyMap.tsx
├── mobile/               # Expo React Native app
├── data/
│   ├── project_schedule_100tasks.csv  # 100 construction tasks
│   ├── supplier_graph_data.json       # 40 suppliers + 47 shipments
│   ├── commissioning_checklist_generator.json  # 23 generic steps
│   ├── rfi_corpus/                    # 50 RFI PDFs
│   ├── spec_tia942_synthetic.pdf      # TIA-942 spec reference
│   └── vendor_submittal_*.pdf         # 3 vendor submittals (UPS, generator, cooling tower)
├── db/                   # Database schemas
├── supabase/             # Supabase migrations
├── scripts/
│   └── generate_test_data.py  # ← JUST CREATED: synthetic test data generator
├── docs/
├── .env                  # All secrets (updated this session)
├── STRAND_AGENT.md       # 66KB master spec doc
├── DESIGN.md             # Design doc
├── plan.md               # Implementation plan
└── custom_plan.md        # Custom plan
```

---

## 5. Key Data Models

### Schedule CSV Columns
`task_id, task_name, start_date, end_date, status, progress_pct, predecessors, discipline, equipment_tag`

- **status:** `on_track`, `delayed`, `at_risk`
- **predecessors:** Semicolon-separated task IDs (e.g., `T001;T002`)
- **discipline:** Civil, Electrical, Mechanical, Structural, HVAC, Fire Safety, Controls, IT Infrastructure, Security, Commissioning, Architectural, Documentation, Training, Project Management, Logistics

### Supplier Graph JSON
```json
{
  "suppliers": [{ "id", "name", "tier", "risk_score", "country", "city", "state", "lat", "lng", "on_time_rate" }],
  "shipments": [{ "id", "origin_supplier", "destination", "eta", "risk_flag", "lat", "lng", "supplier_name", "equipment_tag", "origin_port", "destination_port", "expected_delivery", "delay_days", "current_status" }]
}
```

### Contract Clauses (demo_data.py)
9 clauses with: `section, parameter_name, required_value, unit, operator (gte/lte/eq), document_source, page, text`

### Key Equipment Tags
`EQ-HV-01, EQ-LV-01, EQ-UPS-01/02, EQ-GEN-01/02, EQ-CH-01/02, EQ-CRAH-01/02, EQ-PDU-01-04, EQ-BAT-01/02, EQ-ATS-01, EQ-FD-01, EQ-FS-01, EQ-FA-01, EQ-BMS-01, EQ-SCADA-01, EQ-NET-01, EQ-ACS-01, EQ-TX-01/02, CT-01/02`

---

## 6. Key Concepts

- **R0 Score:** Epidemiology-inspired risk metric. Higher R0 = more downstream tasks infected by a delay. Used by scheduler agent.
- **Spec DNA:** Deterministic fingerprint for contract clauses. Generated from `parameter_name + value + source + section`. Enables traceability from spec → BOQ → PO → submittal.
- **Immunity Score:** `100 - (critical_violations × 15) - (systemic_r0 × 10) - (at_risk_shipments × 3) - (critical_NCRs × 5)`. Clamped [0, 100]. Shown on project dashboard.
- **HITL (Human in the Loop):** Approval gates for critical actions. `DEMO_MODE=True` auto-approves.
- **Tenant Isolation:** Multi-tenant via `tenant_id` on Neo4j nodes. Cypher queries auto-injected.

---

## 7. Environment Variables (.env)

Updated this session with:
- **LLM:** Groq API key (placeholder), llama3-8b-8192
- **Neo4j:** AuraDB cloud instance (`neo4j+s://0cb698ec.databases.neo4j.io`)
- **Supabase:** Full config (URL, anon key, service role key, JWT secret)
- **Procore:** Sandbox credentials (client ID, secret, sandbox URLs)
- **Autodesk APS:** Client ID & secret
- **Redis:** localhost:6379
- **DEMO_MODE:** Set to `False`

---

## 8. What Was Done This Session

1. **Updated `.env`** with all the credentials the user's friend provided (Supabase, Procore, Autodesk APS, Neo4j extended config, frontend URLs, Expo mobile config)

2. **Created `scripts/generate_test_data.py`** — A comprehensive synthetic data generator that produces 3 tiers:
   - **Clean:** Golden-path data, all valid
   - **Messy:** Real-world imperfections (mixed casing, inconsistent date formats, extra whitespace, string numbers, etc.)
   - **Edge cases:** Circular dependencies, self-references, duplicate IDs, negative values, XSS payloads, null fields, absurd ranges, etc.
   
   Generates data for all 4 subsystems: schedule CSV, supplier graph JSON, commissioning checklists, vendor submittals, and RFIs.

   **⚠️ NOT YET RUN** — The script was created but hasn't been executed yet. Run it with:
   ```bash
   cd Strand
   python scripts/generate_test_data.py
   ```
   Output goes to `data/test_scenarios/{clean,messy,edge_cases}/`

---

## 9. What Still Needs To Be Done

- [ ] **Run the test data generator script** and verify output
- [ ] **Frontend oracle components** — user has `AlternativesPanel.tsx`, `SupplierTree.tsx`, `SupplyMap.tsx` open (these are oracle agent UI components)
- [ ] **Test the backend** with the new test data against all agent endpoints
- [ ] **Verify Supabase connection** with the new credentials
- [ ] **Verify Neo4j connection** with the AuraDB instance
- [ ] **Check Procore/Autodesk integrations** with sandbox credentials
- [ ] Any frontend work the user's hackathon team needs

---

## 10. Important Files to Read First (for new model)

1. `STRAND_AGENT.md` (66KB) — The master specification document
2. `DESIGN.md` — Architecture and design decisions  
3. `plan.md` / `custom_plan.md` — Implementation plans
4. `backend/demo_data.py` — The 9 contract clauses that drive spec compliance
5. `backend/routers/` — All API endpoints
6. `data/` — All the source data files

---

## 11. Gotchas & Notes

- The CSV parser (`csv_parser.py`) silently skips rows with empty `task_id` — this is intentional
- The `_safe_float` function in the parser returns `0.0` for any non-numeric value — messy data tests should verify this
- Redis client has a full in-memory fallback — if Redis isn't running, everything still works
- `DEMO_MODE` was `True` in the old `.env`, now set to `False` — this affects HITL gates and NCR baseline data
- The `project.py` router has hardcoded fallback values if Neo4j/Redis are down (immunity score always returns something)
- Cypher sanitization in `dashboards.py` blocks `OR` clauses entirely to prevent tenant bypass — this is aggressive but intentional
- All suppliers are Indian companies, all shipments go to "Site A" (Mumbai)
- The existing commissioning checklist has generic steps ("Verify generator test 1-23") — the test data generator creates realistic domain-specific steps
