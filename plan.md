# STRAND — Build Plan
> **Deadline:** July 22, 2026 (submission) · **Feature Freeze:** July 19, 2026  
> **Team:** 4 people · **Phases:** 4 (Setup → Core → Ops → Field → Demo)  
> **This file is the single source of truth for all humans and AI coding agents.**  
> Reference `STRAND_AGENT.md` for architecture, schemas, and code skeletons.

---

## Quick Reference

| Person | Role | Primary Ownership |
|--------|------|-------------------|
| **P1** | Lead / AI Backend | LangGraph orchestration, Guardian, Brain, PKG schema |
| **P2** | Backend / Data | Ingestion pipeline, NER, Scheduler, Oracle, FastAPI routes |
| **P3** | Frontend | Next.js dashboard, all web components, UI/UX |
| **P4** | Mobile / DevOps | Inspector App, deployment, Docker, synthetic data, demo ops |

| Phase | Dates | Duration | Goal |
|-------|-------|----------|------|
| **Phase 0** | Jun 25–26 | 2 days | Repo, env, skeletons, data seeded |
| **Phase 1** | Jun 27–Jul 6 | 10 days | Brain + Guardian working end-to-end |
| **Phase 2** | Jul 7–Jul 14 | 8 days | Scheduler + Oracle + dashboards live |
| **Phase 3** | Jul 15–Jul 19 | 5 days | Inspector + full integration + deploy |
| **Phase 4** | Jul 20–Jul 22 | 3 days | Testing, bugs, demo video, submission |

---

## Branch Strategy

```
main                    ← protected, only merge via PR
├── dev                 ← integration branch, all PRs target this
│   ├── feature/p1-brain
│   ├── feature/p1-guardian
│   ├── feature/p2-ingestion
│   ├── feature/p2-scheduler
│   ├── feature/p2-oracle
│   ├── feature/p3-dashboard
│   ├── feature/p3-guardian-ui
│   ├── feature/p3-scheduler-ui
│   ├── feature/p4-inspector-mobile
│   └── feature/p4-deployment
```

**Rules:**
- Never push directly to `main` or `dev`
- PR must pass smoke test before merge
- PR description must reference the task ID from this plan (e.g. `P1-W1-T3`)
- Commit message format: `[P1] feat: add spec-dna fingerprint chain builder`

---

## Definition of Done (Per Task)

A task is **done** when:
1. Code is committed on the feature branch
2. The specific test case listed under the task passes
3. No import errors or startup crashes
4. PR opened against `dev` with a 1-line description

A phase is **done** when:
1. All tasks in the phase are merged to `dev`
2. `python scripts/smoke_test.py` passes for that phase
3. The phase milestone demo works as described

---

---

# PHASE 0 — Setup & Scaffolding
**Dates:** June 25–26 (2 days)  
**All 4 people work together on this phase.**  
**Goal:** Every person can run the project locally by end of Day 2.

---

## Day 1 — June 25 (All Together)

### P1-P0-T1 · Repo Initialisation
**Owner:** P1  
**Duration:** 1 hour  
**Files to create:**
```
strand/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
└── requirements.txt       (copy from STRAND_AGENT.md §3.4)
```
**Task:**
- Create GitHub repo, set `main` and `dev` branches
- Add `.gitignore` (Python, Node, `.env`, `chroma_db/`, `__pycache__/`)
- Write README with 5-command quick start
- Push initial commit

**Done when:** Everyone can `git clone` and see the folder structure.

---

### P2-P0-T1 · Database Accounts & Credentials
**Owner:** P2  
**Duration:** 1 hour  
**Task:**
- Create Neo4j Aura Free account → copy `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- Create Groq API account (free) → copy `GROQ_API_KEY`
- Create Anthropic account (for demo day) → copy `ANTHROPIC_API_KEY`
- Fill in `.env` (not committed), share credentials securely with team
- Run Neo4j constraints from `STRAND_AGENT.md §4.1`

**Done when:** `python -c "from neo4j import GraphDatabase; print('OK')"` succeeds.

---

### P3-P0-T1 · Frontend Scaffold
**Owner:** P3  
**Duration:** 2 hours  
**Commands:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install lucide-react recharts leaflet @types/leaflet
```
**Files to create:**
```
frontend/
├── app/
│   ├── layout.tsx          ← root layout with dark nav sidebar
│   ├── page.tsx            ← placeholder "Risk Cockpit — Coming Phase 2"
│   ├── guardian/page.tsx   ← placeholder
│   ├── scheduler/page.tsx  ← placeholder
│   ├── oracle/page.tsx     ← placeholder
│   ├── inspector/page.tsx  ← placeholder
│   └── brain/page.tsx      ← placeholder
└── components/
    └── layout/
        ├── Sidebar.tsx     ← nav links to all 5 agent pages
        └── TopBar.tsx      ← "STRAND" logo + project name
```
**Done when:** `npm run dev` shows a sidebar with 5 nav links, no errors.

---

### P4-P0-T1 · FastAPI Backend Skeleton
**Owner:** P4  
**Duration:** 2 hours  
**Files to create:**
```
backend/
├── main.py           ← FastAPI app with CORS + all routers included
├── config.py         ← pydantic-settings loading .env
├── deps.py           ← Neo4j + Chroma client singletons
└── routers/
    ├── health.py     ← GET /health → {status: ok, agents: {}}
    ├── guardian.py   ← stub: POST /api/v1/guardian/analyze → {msg: "coming soon"}
    ├── scheduler.py  ← stub
    ├── oracle.py     ← stub
    ├── inspector.py  ← stub
    └── brain.py      ← stub
```
**Done when:** `uvicorn backend.main:app --reload` starts, `GET /health` returns 200.

---

## Day 2 — June 26 (All Together)

### P2-P0-T2 · Synthetic Data Generation
**Owner:** P2  
**Duration:** 3 hours  
**Files to create:** `scripts/generate_synthetic_data.py`  
**Reference:** `STRAND_AGENT.md §14`  

**Must generate these exact files in `/data/`:**
```
data/
├── spec_tia942_synthetic.pdf           ← 50-page spec (use reportlab)
├── vendor_submittal_cooling_tower.pdf  ← 45°C deviation (CRITICAL violation)
├── vendor_submittal_ups_compliant.pdf  ← Clean submittal (true negative)
├── vendor_submittal_generator_minor.pdf ← Minor deviation only
├── project_schedule_100tasks.csv       ← Tasks T001–T100, 3 delayed
├── supplier_graph_data.json            ← 40 suppliers, 47 shipments, 3 at-risk
├── commissioning_checklist_generator.json ← 23-step IST
└── rfi_corpus/
    └── rfi_001.pdf … rfi_050.pdf      ← loop generate with reportlab
```

**Minimum viable spec PDF structure (reportlab):**
```python
# spec_tia942_synthetic.pdf must contain these exact parameter lines
# (Guardian agent will parse these):
# "Maximum ambient temperature: 50°C (TIA-942-B §6.7.1)"
# "UPS redundancy level: N+1 minimum (§5.2.3)"
# "Fire suppression: FM-200 or Novec 1230 for UPS rooms >500kVA (§7.4.2)"
# "Generator fuel consumption: ≤260 l/hr at rated load (§8.3.4)"
# "Cable derating factor: 0.75 minimum for bunched cables (§9.1.2)"
# ... 10 more parameters
```

**Done when:** `ls data/` shows all 8 files/directories, PDFs open correctly.

---

### P1-P0-T2 · PKG Schema + Seeder
**Owner:** P1  
**Duration:** 3 hours  
**Files to create:**
```
backend/
├── graph/
│   ├── __init__.py
│   ├── client.py     ← Neo4j driver singleton
│   ├── schema.py     ← NODE_SCHEMAS dict (from STRAND_AGENT.md §4.2)
│   └── queries.py    ← All Cypher queries (from STRAND_AGENT.md §4.4)
└── scripts/
    └── seed_db.py    ← Seeds Neo4j from /data/ JSON + CSV
```
**Reference:** `STRAND_AGENT.md §4`

**Seed these nodes minimum:**
- 15 ContractClause nodes (one per spec parameter)
- 40 Supplier nodes (10 T1, 18 T2, 12 T3)
- 47 Shipment nodes (3 with `risk_flag: true`)

**Done when:** Neo4j Browser shows nodes. Query:
```cypher
MATCH (n) RETURN labels(n), count(n) 
// Expected: ContractClause:15, Supplier:40, Shipment:47
```

---

### P3-P0-T2 + P4-P0-T2 · Docker Compose + Local Test
**Owner:** P3 (docker-compose.yml) + P4 (verify all 4 setups)  
**Duration:** 2 hours  

**P3 creates `docker-compose.yml`:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    volumes: ["./chroma_db:/app/chroma_db", "./data:/app/data"]
    command: uvicorn backend.main:app --host 0.0.0.0 --reload

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on: [backend]
```

**P4 verifies on all 4 machines:**
```bash
python scripts/generate_synthetic_data.py
python scripts/seed_db.py
uvicorn backend.main:app --reload    # terminal 1
cd frontend && npm run dev           # terminal 2
# Visit http://localhost:3000 — sidebar visible
# Visit http://localhost:8000/health — 200 OK
```

**Phase 0 Done when:** All 4 people confirm both URLs work locally. ✓

---

---

# PHASE 1 — Core Intelligence Layer
**Dates:** June 27 – July 6 (10 days)  
**Goal:** Brain answers questions with citations. Guardian catches the cooling tower violation.  
**Phase 1 Milestone Demo:** Upload `vendor_submittal_cooling_tower.pdf` → see Critical violation flagged with Spec-DNA chain + auto-drafted RFI. Ask Brain "fire suppression for UPS room" → get cited answer.

---

## Week 1 · June 27–30 (Days 1–4)

---

### P2-P1-T1 · Document Ingestion Pipeline
**Owner:** P2  
**Branch:** `feature/p2-ingestion`  
**Duration:** 3 days  
**Files to create:**
```
backend/ingestion/
├── __init__.py
├── pipeline.py           ← Main orchestrator: receive file → chunk → embed → PKG
├── parsers/
│   ├── pdf_parser.py     ← PyMuPDF layout + text extraction
│   ├── csv_parser.py     ← Schedule CSV → list of dicts
│   └── json_parser.py    ← Supplier graph + checklist JSON loader
└── chunker.py            ← Split docs into 512-token chunks with overlap 50
```

**`pdf_parser.py` must:**
- Extract text page by page with page number tracking
- Identify tables via PyMuPDF `page.get_text("dict")`
- Return: `List[{text: str, page: int, section: str, source: str}]`
- Fallback to pytesseract for scanned pages

**`pipeline.py` must:**
- Accept file path + document type
- Call correct parser
- Chunk output via `chunker.py`
- Write chunks to Chroma with metadata: `{source, page, section, doc_type}`
- Return: `{chunk_count: int, doc_id: str}`

**Done when:**
```bash
python -c "
from backend.ingestion.pipeline import ingest_document
result = ingest_document('data/spec_tia942_synthetic.pdf', 'spec')
assert result['chunk_count'] > 20
print('PASS', result)
"
```

---

### P2-P1-T2 · NER Parameter Extraction
**Owner:** P2  
**Branch:** `feature/p2-ingestion` (same branch)  
**Duration:** 2 days (parallel with T1)  
**Files to create:**
```
backend/ingestion/ner/
├── __init__.py
├── parameter_extractor.py    ← Extract {param_name, value, unit, page}
└── patterns.py               ← Regex + spaCy patterns for construction params
```

**Target parameters to extract reliably:**
```python
PARAMETER_PATTERNS = {
    "ambient_temperature_max": r"(?:ambient|operating)\s+temp(?:erature)?\s*[:<≤≥]\s*([\d.]+)\s*°?C",
    "fuel_consumption_lph": r"fuel\s+consumption\s*[:<≤]\s*([\d.]+)\s*l(?:itre)?s?/?h",
    "cooling_capacity_kw": r"cooling\s+capacity\s*[:<]\s*([\d.]+)\s*kW",
    "ups_redundancy": r"redundancy\s*[:<]\s*(N\+\d)",
    "cable_derating_factor": r"derating\s+factor\s*[:<≥]\s*([\d.]+)",
}
# Start with regex patterns. Add spaCy NER model if time allows in Phase 2.
```

**Done when:**
```bash
python -c "
from backend.ingestion.ner.parameter_extractor import extract_parameters
params = extract_parameters('data/vendor_submittal_cooling_tower.pdf')
assert 'ambient_temperature_max' in params
assert params['ambient_temperature_max']['value'] == 45.0
print('PASS — cooling tower deviation detected:', params)
"
```

---

### P1-P1-T1 · Chroma Vector Store + Hybrid Retrieval
**Owner:** P1  
**Branch:** `feature/p1-brain`  
**Duration:** 2 days  
**Files to create:**
```
backend/vector/
├── __init__.py
├── store.py        ← Chroma client, get_or_create_collection()
├── embedder.py     ← Sentence transformer wrapper (all-MiniLM-L6-v2)
└── retriever.py    ← BM25 + dense hybrid retrieval (RRF fusion)
```

**`retriever.py` key function:**
```python
def hybrid_retrieve(query: str, k: int = 8) -> List[Dict]:
    """
    1. Dense: Chroma similarity search → top-k chunks with metadata
    2. BM25: keyword retrieval from in-memory BM25Retriever
    3. RRF fusion: merge and re-rank
    Returns: List[{text, source, page, section, score}]
    """
```

**Done when:**
```bash
python -c "
from backend.vector.retriever import hybrid_retrieve
# Must work AFTER seed_db.py has ingested spec PDF
results = hybrid_retrieve('fire suppression UPS room requirements', k=5)
assert len(results) >= 3
assert any('7.4.2' in r.get('section','') or 'FM-200' in r['text'] for r in results)
print('PASS — hybrid retrieval working:', len(results), 'chunks')
"
```

---

### P1-P1-T2 · Agent 5 — The Brain (Core RAG)
**Owner:** P1  
**Branch:** `feature/p1-brain`  
**Duration:** 2 days (starts Day 3)  
**File:** `backend/agents/brain.py`  
**Reference:** `STRAND_AGENT.md §9`

**Must implement:**
```python
class BrainAgent:
    async def query(self, question: str) -> dict:
        # Returns:
        # {
        #   answer: str,
        #   citations: [{document, page, section, excerpt}],
        #   related_rfis: [str],
        #   confidence: "High|Medium|Low",
        #   response_time_ms: int
        # }
```

**LLM prompt must instruct Claude/Groq to:**
- Answer ONLY from provided context (no hallucination)
- Always include `[Doc: X, Page: N, §X.X]` citations inline
- Return valid JSON (strip markdown code fences before parsing)
- Mention related resolved RFIs if found

**Done when:**
```bash
python -c "
import asyncio
from backend.agents.brain import brain_agent
result = asyncio.run(brain_agent.query(
    'What are the fire suppression requirements for UPS rooms?'
))
assert result['answer'] != ''
assert len(result['citations']) >= 1
assert 'FM-200' in result['answer'] or 'Novec' in result['answer']
print('PASS — Brain query:', result['answer'][:100])
"
```

---

### P4-P1-T1 · Brain API Route + Frontend Route
**Owner:** P4  
**Branch:** `feature/p4-routes-phase1`  
**Duration:** 1 day  
**Files:**
- `backend/routers/brain.py` — implement `POST /api/v1/brain/query`
- `backend/models/query.py` — `QueryRequest(question: str)`, `QueryResponse`

**API contract:**
```
POST /api/v1/brain/query
Body: {"question": "string"}
Response: {
  "answer": "string",
  "citations": [{"document": "str", "page": 1, "section": "str"}],
  "related_rfis": [],
  "confidence": "High",
  "response_time_ms": 3200
}
```

**Done when:** `curl -X POST localhost:8000/api/v1/brain/query -d '{"question":"fire suppression?"}'` returns 200 with citations.

---

### P3-P1-T1 · Brain Chat UI
**Owner:** P3  
**Branch:** `feature/p3-brain-ui`  
**Duration:** 3 days  
**Files:**
```
frontend/
├── app/brain/page.tsx
└── components/brain/
    ├── ChatWindow.tsx        ← scrollable message thread
    ├── MessageBubble.tsx     ← user (right, dark) / brain (left, light)
    ├── CitationBadge.tsx     ← green pill: "Spec Rev-3 §7.4.2 p.47"
    ├── InputBar.tsx          ← text input + send button + loading state
    └── ConfidenceBadge.tsx   ← High/Medium/Low indicator
```

**UX requirements:**
- Typing indicator (3 dots animation) while waiting for API
- Citations render as clickable green pills below the answer
- Timestamps on each message
- Pre-loaded example question on page load: "What are the fire suppression requirements for the UPS room?"
- Mobile responsive (stacks correctly on phone screen)

**Done when:** Manual test — type question, see cited answer render in <5s with clickable citation pills. No console errors.

---

## Week 2 · July 1–6 (Days 5–10)

---

### P1-P1-T3 · Spec-DNA Fingerprint Engine
**Owner:** P1  
**Branch:** `feature/p1-guardian`  
**Duration:** 2 days  
**Files:**
```
backend/ingestion/spec_dna/
├── __init__.py
├── fingerprint.py    ← SHA-256 ID generator for requirement lineage
└── chain.py          ← Build + query Spec-DNA chain from PKG
```

**`fingerprint.py` core function:**
```python
import hashlib, json

def generate_spec_dna_id(
    parameter_name: str,
    parameter_value: float | str,
    document_source: str,
    section: str
) -> str:
    """
    Deterministic SHA-256 fingerprint.
    Same inputs always produce same ID — enables lineage tracing.
    """
    payload = json.dumps({
        "param": parameter_name,
        "value": str(parameter_value),
        "source": document_source,
        "section": section
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]
```

**`chain.py` must:**
- `build_chain(submittal_id)` → write `DERIVES_FROM` edges in Neo4j
- `get_chain(submittal_id)` → return ordered list of nodes from ContractClause to VendorSubmittal
- `find_mutation_point(chain)` → return the node where value diverged from original

**Done when:**
```bash
python -c "
from backend.ingestion.spec_dna.fingerprint import generate_spec_dna_id
id1 = generate_spec_dna_id('ambient_temperature_max', 50.0, 'spec.pdf', '6.7.1')
id2 = generate_spec_dna_id('ambient_temperature_max', 50.0, 'spec.pdf', '6.7.1')
assert id1 == id2, 'Must be deterministic'
print('PASS — Spec-DNA ID:', id1)
"
```

---

### P1-P1-T4 · R0 Contagion Engine
**Owner:** P1  
**Branch:** `feature/p1-guardian` (same branch)  
**Duration:** 2 days  
**Files:**
```
backend/r0/
├── __init__.py
├── engine.py           ← Core R0 computation
├── graph_traversal.py  ← NetworkX downstream traversal
└── classifier.py       ← R0 float → severity label
```

**`engine.py` core function:**
```python
def compute_r0_score(
    spec_dna_id: str,
    submittal_id: str,
    task_graph: nx.DiGraph | None = None
) -> float:
    """
    R0 = (downstream_nodes_count + 2 * critical_path_nodes) / normaliser
    
    Steps:
    1. Query PKG for all nodes with DERIVES_FROM path to this spec_dna_id
    2. Build downstream dependency subgraph
    3. Count total downstream nodes (raw dependency spread)
    4. Weight critical path nodes × 2
    5. Normalise to 0-10 scale
    6. Return float rounded to 1dp
    
    Typical ranges:
    - Isolated submittal deviation: R0 = 0.8–1.5
    - Multi-trade impact: R0 = 2.5–4.0
    - Critical path violation: R0 = 4.2–7.0
    - Systemic failure: R0 = 7.0+
    """
```

**`classifier.py`:**
```python
def r0_to_severity(r0: float) -> str:
    if r0 < 1.0: return "Minor"
    if r0 < 2.5: return "Major"
    if r0 < 5.0: return "Critical"
    return "Systemic"

def r0_to_action(r0: float) -> str:
    if r0 < 1.0: return "Monitor — resolve within standard cycle"
    if r0 < 2.5: return "Escalate to discipline lead within 48h"
    if r0 < 5.0: return "PM escalation — same day action required"
    return "EMERGENCY — senior team, 24h resolution window"
```

**Done when:**
```bash
python -c "
from backend.r0.engine import compute_r0_score
# With seeded PKG data:
r0 = compute_r0_score('ambient_temp_spec_dna_id', 'SUB-COOLING-01')
assert 2.0 <= r0 <= 6.0, f'Unexpected R0: {r0}'
print('PASS — R0 score:', r0)
"
```

---

### P1-P1-T5 · Agent 1 — The Guardian
**Owner:** P1  
**Branch:** `feature/p1-guardian`  
**Duration:** 3 days  
**File:** `backend/agents/guardian.py`  
**Reference:** `STRAND_AGENT.md §5`

**LangGraph steps to implement:**
1. `extract_parameters` → calls `backend/ingestion/ner/parameter_extractor.py`
2. `check_against_spec` → Cypher query for each param vs PKG ContractClause nodes
3. `compute_spec_dna` → calls `backend/ingestion/spec_dna/chain.py`
4. `score_r0` → calls `backend/r0/engine.py` per violation
5. `draft_rfi` → LLM prompt (Claude or Groq) → structured RFI text

**RFI draft must include:**
- Formal header (Project, Date, Submittal ID, From/To)
- Table: Parameter | Required | Actual | Deviation %
- Regulatory clause citation (TIA-942-B §X.X)
- Tier III certification impact statement
- Requested action with 5-day deadline
- Spec-DNA mutation point reference

**Done when (primary demo test):**
```bash
python -c "
import asyncio
from backend.agents.guardian import guardian_graph

result = asyncio.run(guardian_graph.ainvoke({
    'submittal_id': 'DEMO-CT-01',
    'document_path': 'data/vendor_submittal_cooling_tower.pdf',
    'extracted_parameters': {},
    'violations': [],
    'spec_dna_chain': {},
    'rfi_draft': '',
    'r0_max': 0.0,
    'messages': []
}))

assert len(result['violations']) >= 1
assert result['r0_max'] >= 2.0
assert 'ambient' in result['rfi_draft'].lower() or '45' in result['rfi_draft']
print('PASS — Guardian found', len(result['violations']), 'violations')
print('R0 max:', result['r0_max'])
print('RFI preview:', result['rfi_draft'][:200])
"
```

---

### P4-P1-T2 · Guardian API Routes
**Owner:** P4  
**Branch:** `feature/p4-routes-phase1`  
**Duration:** 1 day  
**Files:** `backend/routers/guardian.py`, `backend/models/violations.py`

**Implement these routes:**
```
POST /api/v1/guardian/analyze          ← multipart file upload → runs Guardian agent
GET  /api/v1/guardian/violations        ← list all violations from PKG
GET  /api/v1/guardian/violations/{id}   ← single violation + full Spec-DNA chain
GET  /api/v1/guardian/rfi/{violation_id} ← pre-drafted RFI text
```

**Done when:** Postman/curl test — upload cooling tower PDF, get violations JSON with R0 scores.

---

### P3-P1-T2 · Guardian Upload + Violations UI
**Owner:** P3  
**Branch:** `feature/p3-guardian-ui`  
**Duration:** 3 days  
**Files:**
```
frontend/
├── app/guardian/page.tsx
└── components/guardian/
    ├── UploadZone.tsx          ← drag-drop zone, progress bar, file type validation
    ├── ViolationList.tsx       ← sortable table: severity, param, expected, actual, R0
    ├── ViolationCard.tsx       ← expanded view of single violation
    ├── SpecDnaChain.tsx        ← visual node chain: ContractClause→BOQ→PO→Submittal
    │                              mutation point highlighted in red
    └── RfiPreview.tsx          ← side panel: formatted RFI with Approve button
```

**SpecDnaChain visual spec:**
- Horizontal chain of rounded nodes connected by arrows
- Node colors: ContractClause (dark navy), BOQ (blue), PO (teal), Submittal (green)
- Mutation node: red border + warning icon
- Clicking a node shows the raw parameter value at that stage

**Done when:** Manual test — drag cooling tower PDF onto UploadZone, within 15s see violation card appear with R0 badge and Spec-DNA chain rendered. Click violation → RFI preview opens on right.

---

### Phase 1 Integration Test (July 6)
**Owner:** All 4 (30 min together)  
```bash
# Backend running, frontend running
# Test 1: Guardian end-to-end
# Upload vendor_submittal_cooling_tower.pdf via UI
# Expected: 1 Critical violation (ambient_temp 45 vs 50°C), R0 >= 2.0, RFI drafted

# Test 2: Guardian true negative
# Upload vendor_submittal_ups_compliant.pdf via UI
# Expected: 0 violations, "No deviations detected" message

# Test 3: Brain chat
# Ask: "What are the fire suppression requirements for UPS rooms?"
# Expected: Answer mentions FM-200 or Novec 1230, has at least 1 citation
```
**Phase 1 is DONE when all 3 tests pass.** ✓

---

---

# PHASE 2 — Operational Intelligence
**Dates:** July 7–14 (8 days)  
**Goal:** Scheduler shows R0 risk dashboard. Oracle shows geospatial shipment map.  
**Phase 2 Milestone Demo:** Scheduler flags generator delay with R0: 4.2. Oracle map shows 3 at-risk shipments. Risk Cockpit dashboard shows overall project immunity score.

---

## Week 3 · July 7–10 (Days 1–4)

---

### P2-P2-T1 · Schedule Parser + CPM Graph
**Owner:** P2  
**Branch:** `feature/p2-scheduler`  
**Duration:** 2 days  
**Files:**
```
backend/ingestion/parsers/csv_parser.py    ← Schedule CSV → list of task dicts
backend/agents/scheduler.py               ← Full Scheduler agent
```
**Reference:** `STRAND_AGENT.md §6`

**CPM graph must:**
- Build `nx.DiGraph` from CSV predecessor column
- Handle multiple predecessors (semicolon-separated: `"T001;T003"`)
- Compute longest path (critical path) via `nx.dag_longest_path(G)`
- Handle cycles gracefully (try/except NetworkXUnfeasible)

**Delay probability heuristic (MVP, no ML needed):**
```python
def estimate_delay_probability(task_data: dict, G: nx.DiGraph) -> float:
    status = task_data.get("status", "").lower()
    progress = float(task_data.get("progress_pct", 0)) / 100
    predecessors_delayed = sum(
        1 for pred in G.predecessors(task_data["task_id"])
        if G.nodes[pred].get("status") == "delayed"
    )
    
    base = {"delayed": 0.9, "at_risk": 0.75, "on_track": 0.25}.get(status, 0.3)
    predecessor_penalty = min(0.3, predecessors_delayed * 0.15)
    progress_penalty = max(0, 0.3 - progress * 0.4)
    
    return min(0.99, base + predecessor_penalty + progress_penalty)
```

**Done when:**
```bash
python -c "
import asyncio
from backend.agents.scheduler import scheduler_graph
import pandas as pd

df = pd.read_csv('data/project_schedule_100tasks.csv')
result = asyncio.run(scheduler_graph.ainvoke({
    'schedule_data': df.to_dict('records'),
    'task_graph': None,
    'at_risk_tasks': [],
    'r0_scores': {},
    'critical_path': [],
    'mitigation_suggestions': []
}))

assert len(result['at_risk_tasks']) >= 3
assert result['at_risk_tasks'][0].get('r0_score', 0) > 0
print('PASS — At-risk tasks:', len(result['at_risk_tasks']))
print('Top R0:', result['at_risk_tasks'][0])
"
```

---

### P2-P2-T2 · Agent 3 — The Oracle
**Owner:** P2  
**Branch:** `feature/p2-oracle`  
**Duration:** 3 days (parallel with T1)  
**File:** `backend/agents/oracle.py`  
**Reference:** `STRAND_AGENT.md §7`

**Must implement:**
```python
def get_geospatial_shipments(project_id: str) -> dict:
    """Returns GeoJSON FeatureCollection for Leaflet"""

def get_supply_chain_tree(shipment_id: str) -> dict:
    """Returns Tier-1/2/3 tree for a specific shipment"""

def find_alternative_suppliers(equipment_tag: str, failing_supplier_id: str) -> list:
    """Graph traversal for qualified alternative suppliers"""
```

**GeoJSON output shape (strictly required for P3 Leaflet component):**
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [77.2, 28.6]},
    "properties": {
      "shipment_id": "SHP-001",
      "equipment_tag": "CT-01",
      "delay_days": 12,
      "risk_flag": true,
      "status": "Port Congestion - Kolkata",
      "supplier_name": "Schneider Electric India",
      "tier": 1
    }
  }]
}
```

**Done when:**
```bash
curl localhost:8000/api/v1/oracle/shipments | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert data['type'] == 'FeatureCollection'
assert len(data['features']) >= 10
at_risk = [f for f in data['features'] if f['properties']['risk_flag']]
assert len(at_risk) >= 3
print('PASS — Shipments:', len(data['features']), '| At-risk:', len(at_risk))
"
```

---

### P4-P2-T1 · Scheduler + Oracle API Routes
**Owner:** P4  
**Branch:** `feature/p4-routes-phase2`  
**Duration:** 2 days  

**Implement:**
```
GET  /api/v1/scheduler/risks           → at_risk_tasks list with R0 scores
GET  /api/v1/scheduler/critical-path   → ordered task list
GET  /api/v1/scheduler/r0/{task_id}    → single task R0 + downstream count
GET  /api/v1/oracle/shipments          → GeoJSON FeatureCollection
GET  /api/v1/oracle/shipments/at-risk  → filtered: risk_flag=true only
GET  /api/v1/oracle/supply-chain/{id}  → Tier-1/2/3 tree for shipment
GET  /api/v1/oracle/alternatives/{tag} → alternative supplier list
GET  /api/v1/project/immunity-score    → 0-100 float (see formula below)
```

**Immunity score formula:**
```python
def compute_immunity_score() -> float:
    """
    100 - (critical_violations * 15) - (systemic_r0_count * 10)
      - (at_risk_shipments * 3) - (open_ncrs_critical * 5)
    Clamp to [0, 100].
    """
```

**Done when:** All 7 routes return 200 with correct shape. Verify immunity score is between 0-100.

---

### P3-P2-T1 · Scheduler Dashboard UI
**Owner:** P3  
**Branch:** `feature/p3-scheduler-ui`  
**Duration:** 4 days  
**Files:**
```
frontend/
├── app/scheduler/page.tsx
└── components/scheduler/
    ├── R0Gauge.tsx             ← Large circular gauge 0-10, animates on load
    │                              Green (<1) → Amber (1-2.5) → Red (2.5+) gradient
    ├── CriticalPathTimeline.tsx ← Horizontal Gantt-style bars (recharts)
    │                              At-risk tasks highlighted amber/red
    ├── MilestoneCard.tsx        ← Single task: name, delay%, R0, severity badge, action
    ├── R0ContagionTree.tsx      ← D3 or recharts tree: show downstream infected tasks
    └── MitigationPanel.tsx      ← Right panel: LLM suggestion per top-3 risk
```

**R0Gauge spec (important for demo):**
- Size: 200×200px
- Animated arc that fills on data load
- Current R0 value displayed large in center
- Color: green 0-1, amber 1-2.5, orange 2.5-5, red 5+
- Sub-label: "Contagion Risk" + severity word

**Done when:** Manual test — page loads, R0Gauge animates to 4.2, timeline shows T023/T047/T078 highlighted red, mitigation panel shows 3 suggestions.

---

## Week 4 · July 11–14 (Days 5–8)

---

### P3-P2-T2 · Oracle Map + Risk Cockpit
**Owner:** P3  
**Branch:** `feature/p3-oracle-ui` then `feature/p3-dashboard`  
**Duration:** 4 days  

**Oracle Map (`app/oracle/page.tsx`):**
```
components/oracle/
├── SupplyMap.tsx         ← Leaflet map, India centered (lat:20, lng:80, zoom:5)
│                            Green markers = safe, Amber = delay, Red = at-risk+flagged
├── ShipmentPopup.tsx     ← On marker click: equipment tag, delay days, risk reason
├── SupplierTree.tsx      ← Collapsible tree: Tier-1 → Tier-2 → Tier-3 nodes
└── AlternativesPanel.tsx ← On at-risk shipment select: show 2-3 alternatives
```

**Risk Cockpit (`app/page.tsx`):**
```
components/shared/
├── ImmunityScore.tsx     ← Big number 0-100 with "Project Immune Health" label
│                            Green >80, Amber 60-80, Red <60. Animate on load.
├── StatCard.tsx          ← KPI card: value, label, trend icon
└── AgentStatusBadge.tsx  ← Dot: green=active, amber=processing, grey=idle
```
```
Dashboard layout:
Row 1: ImmunityScore | Violations Today | Open NCRs | At-Risk Shipments
Row 2: ViolationFeed (Guardian outputs) | AgentStatus bar
Row 3: R0 summary mini + latest Scheduler alert
```

**Done when:** Manual test — Risk Cockpit shows 4 stat cards + immunity score. Oracle page shows Leaflet map with at least 10 shipment markers, 3 red. Click red marker → popup shows delay reason. Select → alternatives panel appears.

---

### P4-P2-T2 · Project Summary API + Immunity Score
**Owner:** P4  
**Branch:** `feature/p4-routes-phase2`  
**Duration:** 1 day  

**`GET /api/v1/project/summary` response:**
```json
{
  "immunity_score": 67.5,
  "violations_today": 2,
  "open_ncrs": 5,
  "at_risk_shipments": 3,
  "critical_r0_max": 4.2,
  "agents": {
    "guardian": "active",
    "scheduler": "active",
    "oracle": "active",
    "inspector": "idle",
    "brain": "active"
  }
}
```

**Done when:** GET /project/summary returns correct shape and immunity score matches formula.

---

### Phase 2 Integration Test (July 14)
**Owner:** All 4 (1 hour together)  
```bash
# Test 1: Scheduler
# GET /api/v1/scheduler/risks
# Expected: T023, T047, T078 appear with delay_probability > 0.8 and R0 > 2.0

# Test 2: Oracle map
# Open http://localhost:3000/oracle
# Expected: Map renders with shipment markers, 3 red at-risk markers visible

# Test 3: Risk Cockpit
# Open http://localhost:3000
# Expected: Immunity score between 50-80, stat cards populated, no 0s

# Test 4: Full chain (critical path)
# Upload cooling tower PDF → violations appear in Risk Cockpit feed → R0 drops immunity score
```
**Phase 2 is DONE when all 4 tests pass.** ✓

---

---

# PHASE 3 — Field Intelligence + Integration
**Dates:** July 15–19 (5 days)  
**Goal:** Inspector React Native App working. All 5 agents integrated. Deployed on Railway.  
**Phase 3 Milestone Demo:** Full 7-beat demo script runs end-to-end without errors.

---

### P1-P3-T1 · Agent 4 — The Inspector (Voice NCR)
**Owner:** P1  
**Branch:** `feature/p1-inspector`  
**Duration:** 2 days  
**File:** `backend/agents/inspector.py`  
**Reference:** `STRAND_AGENT.md §8`

**Must implement:**
```python
async def process_voice_ncr(
    voice_transcript: str,
    equipment_tag: str,
    step_id: str,
    raised_by: str
) -> dict:
    # LLM: transcript → structured NCR JSON
    # Spec-DNA lookup: find governing clause for violated parameter
    # R0 computation
    # Write NCR node to Neo4j
    # Return: {ncr_id, ncr_data, spec_dna_ref, r0_score, severity}

async def get_checklist(equipment_tag: str) -> dict:
    # Load from commissioning_checklist_generator.json
    # Return all 23 steps with acceptance criteria

async def close_checklist_session(
    equipment_tag: str,
    step_results: list
) -> dict:
    # Generate as-built test record (PDF via reportlab or markdown)
    # Return: {record_id, pdf_path, ncr_count, pass_count, fail_count}
```

**Done when:**
```bash
python -c "
import asyncio
from backend.agents.inspector import process_voice_ncr

result = asyncio.run(process_voice_ncr(
    voice_transcript='Fuel consumption reads 285 litres per hour against spec 260',
    equipment_tag='GEN-01',
    step_id='IST-002',
    raised_by='field_engineer_test'
))
assert result['ncr_id'].startswith('NCR-')
assert result['ncr_data']['severity_suggestion'] in ['Critical','Major','Minor']
assert result['r0_score'] > 0
print('PASS — NCR created:', result['ncr_id'], 'Severity:', result['ncr_data']['severity_suggestion'])
"
```

---

### P4-P3-T1 · Inspector React Native App (Mobile)
**Owner:** P4  
**Branch:** `feature/p4-inspector-mobile`  
**Duration:** 3 days  
**Framework:** React Native (Expo) configured for iOS/Android native deployment  
**Reference:** `STRAND_AGENT.md §13`

**Screens to build:**

**`QrScanScreen.tsx`:**
- Use `expo-barcode-scanner`
- On scan: fetch equipment tag → navigate to ChecklistScreen
- Fallback: manual equipment tag entry field

**`ChecklistScreen.tsx`:**
- Show 23 IST steps as vertical stepper
- Each step: checkbox, description, acceptance criteria, pass/fail toggle, notes field
- Step completion saves to AsyncStorage (offline-first)
- Camera button on each step (expo-image-picker)
- "Log Observation" button → navigate to NcrLogScreen

**`NcrLogScreen.tsx`:**
- Record button (expo-av for audio recording)
- Native Speech recognition via `@react-native-voice/voice` or transcribing recorded audio using backend Whisper API
- Show transcript text in real time
- Submit button → POST /api/v1/inspector/ncr with transcript
- On success: show NCR ID + severity badge + R0 score

**`SyncStatusScreen.tsx`:**
- Shows offline queue count
- Sync button
- Last sync timestamp

**Done when:** App runs via Expo client (`npx expo start`) on a physical device or simulator. Can navigate all 4 screens. Voice NCR transcription & submission sends to API and shows NCR ID response.

---

### P2-P3-T1 · Inspector API Routes
**Owner:** P2  
**Branch:** `feature/p2-inspector-routes`  
**Duration:** 2 days  

```
GET  /api/v1/inspector/checklist/{tag}    ← Returns 23-step checklist JSON
POST /api/v1/inspector/ncr               ← Body: {transcript, equipment_tag, step_id, raised_by}
GET  /api/v1/inspector/ncrs              ← All open NCRs from Neo4j
GET  /api/v1/inspector/as-built/{tag}    ← Generated test record for equipment
POST /api/v1/inspector/checklist/{tag}/close ← Closes session, generates as-built
```

**Done when:** POST /inspector/ncr with fuel consumption transcript returns NCR object with R0 score.

---

### P3-P3-T1 · Inspector Web View + Final Polish
**Owner:** P3  
**Branch:** `feature/p3-inspector-web`  
**Duration:** 2 days  

**`app/inspector/page.tsx`:**
- Table of all open NCRs (from GET /inspector/ncrs)
- Each NCR: ID, equipment tag, severity badge, R0 score, Spec-DNA reference
- Click NCR → side panel with full detail + governing clause
- "Commissioning Progress" summary: pass rate per equipment

**Final UI polish (all pages):**
- STRAND logo in sidebar top
- Consistent dark navy `#1A1A2E` + white + green `#2D6A4F` accent
- Loading skeletons on all data fetches (no blank screens)
- Error states on all API calls (not just console.error)
- Responsive layout verified at 375px (iPhone SE) and 1440px (desktop)

**Done when:** All 5 agent pages load without errors. Mobile responsive layout works at 375px.

---

### P1-P3-T2 · LangGraph Master Orchestrator
**Owner:** P1  
**Branch:** `feature/p1-orchestrator`  
**Duration:** 1 day  
**File:** `backend/agents/orchestrator.py`  
**Reference:** `STRAND_AGENT.md §10`

**Routes events to correct agent:**
```python
EVENT_ROUTING = {
    "submittal_upload": "guardian",
    "schedule_update": "scheduler",
    "shipment_update": "oracle",
    "voice_ncr": "inspector",
    "query": "brain"
}
```

**After each agent completes:**
- Write result summary to Neo4j (agent_run node)
- Update project immunity score
- Trigger any downstream agents if needed
  - Guardian finding R0 > 5.0 → auto-trigger Scheduler to re-check critical path

**Done when:**
```bash
python -c "
import asyncio
from backend.agents.orchestrator import orchestrator

result = asyncio.run(orchestrator.ainvoke({
    'event_type': 'submittal_upload',
    'payload': {'submittal_id': 'TEST-001', 
                'document_path': 'data/vendor_submittal_cooling_tower.pdf'},
    'results': {},
    'active_agents': []
}))
assert 'guardian' in result['results']
assert len(result['results']['guardian']['violations']) >= 1
print('PASS — Orchestrator routed to Guardian correctly')
"
```

---

### P4-P3-T2 · Deployment to Railway
**Owner:** P4  
**Branch:** `feature/p4-deployment`  
**Duration:** 2 days  

**Steps:**
```bash
# 1. Create Railway project
railway login && railway init

# 2. Add services
# - Python service (backend/)
# - Node service (frontend/)

# 3. Set environment variables in Railway dashboard
# Copy from .env — NEO4J_URI, NEO4J_PASSWORD, ANTHROPIC_API_KEY, GROQ_API_KEY

# 4. Deploy
railway up

# 5. Seed remote Neo4j
NEO4J_URI=<remote_uri> python scripts/seed_db.py

# 6. Precompute demo queries
python scripts/precompute_demo.py
```

**`scripts/precompute_demo.py` must pre-cache:**
- Guardian analysis of cooling tower PDF (full result stored in Redis/memory)
- Brain query: "fire suppression requirements for UPS rooms"
- Brain query: "TIA-942 ambient temperature requirements"
- Scheduler risks list
- Oracle GeoJSON shipments
- Project immunity score

**Done when:** Public Railway URL loads Risk Cockpit dashboard. Test Guardian upload on deployed URL.

---

### Phase 3 Integration Test — Full 7-Beat Demo (July 19)
**Owner:** All 4 (2 hours together)  
```
Run the complete 7-beat demo script from STRAND_AGENT.md §17:

Beat 1 (0:00–0:30): Open /guardian, drag cooling tower PDF into UploadZone
Beat 2 (0:30–1:15): See Critical violation card appear, Spec-DNA chain renders
Beat 3 (1:15–1:45): R0 badge shows 4.2, "₹5.2 Crore rework risk" appears
Beat 4 (1:45–2:15): Click "Approve RFI" → success confirmation
Beat 5 (2:15–2:50): Open /scheduler → R0Gauge animates to 4.2, timeline shows T047 red
Beat 6 (2:50–3:30): Open Inspector App on phone → scan QR → record "285 l/hr" voice → NCR appears
Beat 7 (3:30–4:00): Open / (Risk Cockpit) → immunity score visible, violations feed populated

Target: All 7 beats complete in under 5 minutes with zero crashes.
```
**Phase 3 is DONE when full demo runs clean × 2 in a row.** ✓

---

---

# PHASE 4 — Testing, Bugs & Demo Prep
**Dates:** July 20–22 (3 days)  
**Goal:** Zero blocking bugs. Demo video recorded. Everything submitted.

---

## July 20 — Bug Fixing Day

### All 4 — Structured Bug Hunt (Morning)
Each person tests one specific path:
- **P1:** Upload all 4 synthetic PDFs. Verify violation counts (Critical: 1, Minor: 1, Clean: 1).
- **P2:** Hit every API endpoint with Postman. Confirm response shapes match specs. Log any 500s.
- **P3:** Test all 5 pages on Chrome, Safari, and phone. Log any render breaks or layout overflows.
- **P4:** Test Railway deployed URL end-to-end. Network failures, slow loads, CORS issues.

**Create GitHub Issues for everything found. Prefix: `[BUG]`.**

### Afternoon — Parallel Bug Fixes
Each person fixes their own reported bugs. Priority order:
1. Demo-blocking (breaks the 7-beat script) → fix immediately
2. Visual/UX (ugly but functional) → fix if <30min
3. Edge case (doesn't affect demo) → create issue, leave for post-hackathon

---

## July 21 — Assets + Rehearsal Day

### P1-P4-T1 · Architecture Diagram
**Owner:** P1  
**Tool:** Excalidraw (free, export PNG) or draw.io  
**Output:** `docs/architecture.png` (min 2400×1600px)

**Must show:**
- 5-layer platform stack (Acquisition → Understanding → Memory → Reasoning → Surface)
- All 5 named agents in Layer 4 with their icons
- PKG (Neo4j) in Layer 3 with Chroma beside it
- Data flow arrows: Upload → PKG → Agent → Dashboard
- Spec-DNA chain shown as a callout
- R0 symbol shown beside Scheduler agent

---

### P3-P4-T2 · Presentation Deck
**Owner:** P3 (design) + P4 (content)  
**Tool:** Canva (export PDF) or Google Slides  
**Output:** `docs/STRAND_Deck.pdf`  
**Slide count:** 13 slides

```
Slide 1:  Cover — STRAND logo, tagline, ET AI Hackathon 2026, PS4
Slide 2:  The Problem — 67% overruns, ₹15B sector, information black hole
Slide 3:  The Cascade — cooling tower 45°C vs 50°C story (visual timeline)
Slide 4:  The Innovation — Spec-DNA + R0 Contagion (the two breakthroughs)
Slide 5:  System Architecture — the diagram from docs/architecture.png
Slide 6:  The Five Agents — one line + icon per agent
Slide 7:  The Guardian — live demo screenshot (violation card + RFI)
Slide 8:  The Scheduler — R0 gauge screenshot + "4.2 → 4 trades infected"
Slide 9:  The Brain — chat screenshot with citation pills
Slide 10: Business Impact — ROI table (₹25.2 Crore per project)
Slide 11: Judging Criteria — Innovation/Impact/Tech table with STRAND evidence
Slide 12: Roadmap — Phase 1 (EPC), Phase 2 (Pharma/Fabs), Phase 3 (Platform)
Slide 13: Closing — "STRAND. Always watching." + GitHub link + deployed URL
```

**Design rules:**
- Background: `#1A1A2E` (dark navy) for slide 1 + 13, white for rest
- Accent color: `#2D6A4F` (STRAND green) for headers and callouts
- Font: Inter or Montserrat (available in Canva)
- No more than 40 words on any single slide

---

### P4-P4-T1 · Demo Video Recording
**Owner:** P4  
**Tool:** OBS Studio (free, screen recording)  
**Output:** `docs/STRAND_Demo.mp4` + YouTube unlisted upload  
**Duration:** 3:30–4:00 minutes  

**Recording checklist:**
- [ ] Resolution: 1920×1080 minimum
- [ ] Microphone audio: test levels before recording
- [ ] Browser zoom: 110% (better visibility for judges)
- [ ] Close all other browser tabs
- [ ] Disable notifications (Do Not Disturb on)
- [ ] Pre-load all pages (no blank loading states at start of recording)
- [ ] Phone visible in frame for Inspector native App demo (Beat 6)

**Post-recording:**
- Add subtitles (auto-generate in YouTube then download `.srt`)
- Trim any awkward pauses >3 seconds
- Keep as single continuous take if possible — edits reduce credibility

---

### P2-P4-T2 · GitHub Repository Final Polish
**Owner:** P2  
**Duration:** 2 hours  

**README.md must contain:**
```markdown
# STRAND — The DNA of Every Great Build
[Demo URL] [Demo Video] [Architecture Diagram]

## Quick Start (5 commands)
git clone ...
cp .env.example .env  # Fill in API keys
pip install -r requirements.txt && cd frontend && npm install && cd ..
python scripts/seed_db.py
uvicorn backend.main:app --reload & cd frontend && npm run dev

## What It Does (3 sentences max)
## Architecture
## Team
## ET AI Hackathon 2026 — Problem Statement 4
```

**Final repo checklist:**
- [ ] `.env` is NOT committed (verify `git log --all -- .env`)
- [ ] `.env.example` has all keys with placeholder values
- [ ] `data/` folder has all 8 synthetic files
- [ ] All 5 agent tests pass (`python scripts/test_agents.py`)
- [ ] `requirements.txt` is up to date (`pip freeze > requirements.txt`)
- [ ] Railway deployed URL is live and in README

---

### Demo Rehearsal × 3 (July 21, Evening — All 4 Together)
**Owner:** All 4  
**Duration:** 2 hours  

**Round 1:** P1 presents, others are judges. Time it. Note every hesitation.  
**Round 2:** Fix any blocking issues found in Round 1. P1 presents again.  
**Round 3:** Final clean run. Record this as a backup video.

**Rehearsal passes when:**
- Full 7-beat demo completes in 3:30–4:30 minutes
- No browser crashes or API timeouts
- P1 knows these numbers without looking at slides:
  - `₹25.2 Crore` (savings per project)
  - `47 days → 4 hours` (coordination time reduction)
  - `67%` (EPC projects with overruns)
  - `R0: 4.2` (demo generator delay score)
  - `₹5.2 Crore` (cooling tower rework cost if undetected)

---

## July 22 — Submission Day

### Morning (9am–12pm) — Final Verification

**P4 runs final deployment check:**
```bash
# Verify Railway URL is live
curl https://strand-app.up.railway.app/health

# Run full smoke test suite
python scripts/smoke_test.py

# Verify demo data is preloaded
python scripts/precompute_demo.py --verify-only
```

**P1 does final agent tests:**
```bash
python scripts/test_agents.py
# Expected: 5/5 agents PASS
```

**P3 does final UI check:**
- Open all 5 pages on Railway URL
- Verify no blank states, all data loading
- Verify mobile App runs on physical device or simulator connecting to Railway backend

**P2 finalises GitHub:**
- Merge `dev` → `main` (final submission state)
- Tag release: `git tag v1.0.0-hackathon && git push --tags`
- Verify public repo is accessible

---

### Submission Checklist (Complete before 5pm July 22)

```
DELIVERABLES:
[ ] Working Prototype URL (Railway)    → https://strand-app.up.railway.app
[ ] GitHub Repository (public)         → https://github.com/TEAM/strand
[ ] Figma Design System & Mockups      → https://www.figma.com/design/bRWTvsFv3QeDJi8yLTk0uA/Strand?node-id=0-1&t=8FUIFPH4moS5VU8m-1
[ ] Architecture Diagram               → docs/architecture.png
[ ] Presentation Deck (PDF)            → docs/STRAND_Deck.pdf
[ ] Demo Video (YouTube unlisted)      → https://youtu.be/...

VERIFY EACH ONE:
[ ] Demo URL loads Risk Cockpit without login
[ ] GitHub repo has README with quick start
[ ] Architecture PNG is high-res (>2400px wide)
[ ] Deck PDF is <20MB, all slides render correctly
[ ] YouTube video is public/unlisted (not private)

BACKUP:
[ ] Demo video downloaded as MP4 locally
[ ] Final repo zip downloaded locally
[ ] Deck saved as .pptx or .key (source file)
[ ] All .env values saved in password manager
```

---

---

## Dependency Map

```
P2-P0-T2 (synthetic data)
    └──► P1-P0-T2 (seed PKG)
             └──► P2-P1-T1 (ingestion pipeline)
             │       └──► P2-P1-T2 (NER extractor)
             │                └──► P1-P1-T3 (Spec-DNA engine)
             │                         └──► P1-P1-T4 (R0 engine)
             │                                  └──► P1-P1-T5 (Guardian agent) ──► P4-P1-T2 (Guardian routes) ──► P3-P1-T2 (Guardian UI)
             └──► P1-P1-T1 (Chroma + retrieval)
                      └──► P1-P1-T2 (Brain agent) ──► P4-P1-T1 (Brain routes) ──► P3-P1-T1 (Brain UI)

Guardian + Brain done
    └──► P2-P2-T1 (Scheduler + CPM)
    │       └──► P4-P2-T1 (Scheduler routes) ──► P3-P2-T1 (Scheduler UI)
    └──► P2-P2-T2 (Oracle)
             └──► P4-P2-T1 (Oracle routes) ──► P3-P2-T2 (Oracle map + cockpit)

All 4 agents done
    └──► P1-P3-T1 (Inspector backend)
    │       └──► P2-P3-T1 (Inspector routes) ──► P4-P3-T1 (Inspector App)
    └──► P1-P3-T2 (Master orchestrator)
    └──► P4-P3-T2 (Railway deploy)
```

---

## Risk Register

| Risk | Likelihood | Impact | Owner | Mitigation |
|------|-----------|--------|-------|------------|
| NER extraction misses parameters on synthetic PDF | High | Demo-blocking | P2 | Hardcode parameter extraction for the 5 demo parameters as fallback regex patterns |
| Neo4j Aura free tier connection timeout | Medium | Demo-blocking | P1 | Cache all demo query results in Python dict at startup. Never make live Neo4j calls during demo. |
| Railway free tier cold start (>30s) | Medium | Demo latency | P4 | Pre-warm by hitting the URL once before demo. Add `/health` ping to keep alive. |
| LLM API timeout during demo | Medium | Demo-blocking | P1 | Pre-compute and cache ALL 7 demo responses in `precompute_demo.py`. Live mode for fallback only. |
| Mobile app doesn't load/connect on venue WiFi | Low | Beat 6 miss | P4 | Use phone hotspot as backup. Preload Expo app on phone, offline mode should work for the checklist flow. |
| 4-week scope overrun | High | Incomplete demo | All | Priority cutoff: Agents 5→1→2→3→4. Demo live Agents 5+1+2. Show slides for 3+4 if needed. |
| Voice transcription fails on venue noise | Medium | NCR demo miss | P4 | Build text fallback: type the transcript directly in NcrLogScreen if voice fails. |

---

## Communication Protocol

**Daily Standups (15 min, async in team chat):**
```
Format:
✅ Done yesterday: [task IDs]
🔨 Working on today: [task IDs]  
🚧 Blocked by: [what/who]
```

**PR Review SLA:** Review within 4 hours of opening. Block only for test failures. Approve for minor issues + leave comment.

**Bug Priority Labels:**
- `P0-demo-blocker` — fix before anything else
- `P1-should-fix` — fix this phase
- `P2-post-hackathon` — document and move on

---

*STRAND · Build Plan v1.0 · June 25, 2026*  
*Reference: `STRAND_AGENT.md` for code · `STRAND_Project_Document.pdf` for full PRD*
