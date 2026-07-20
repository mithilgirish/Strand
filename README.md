<p align="center">
  <img src="https://github.com/user-attachments/assets/81d90464-9e74-42a3-a17f-eeff905360e8" width="150" alt="STRAND Logo" style="border-radius: 20px;" />
</p>

<h1 align="center">STRAND</h1>
<p align="center"><em>The Autonomous Intelligence Layer for Data Centre EPC Delivery</em></p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#core-architecture">Core Architecture</a> •
  <a href="#the-agent-ecosystem">The Agent Ecosystem</a> •
  <a href="#enterprise-integrations">Integrations</a> •
  <a href="#quick-start">Quick Start</a>
</p>

---

## 🏗️ Overview: The Information Fragmentation Crisis

India's data centre capacity is projecting extreme growth, targeting over 2,700 MW by 2027. However, **67% of data centre EPC projects experience schedule overruns exceeding 10%**. 

The root cause of these delays is **information fragmentation**. A single hyperscale facility involves up to 40,000 equipment line items and 200 concurrent trade contractors. Specifications, vendor submittals, test records, RFIs, and schedules exist in completely disconnected silos. By the time a specification deviation is caught on-site, it has already caused a critical path delay.

**STRAND** solves this by unifying project documents, supply chain data, and quality records into a living intelligence ecosystem. STRAND shifts quality control to the extreme left—catching specification deviations *before* they are manufactured, and predicting schedule risks weeks in advance through probabilistic modeling.

---

## 🧬 Core Architecture & Technical Innovations

STRAND is not a standard conversational wrapper; it is an enterprise-grade **Multi-Agent Orchestration System** built to handle immense industrial complexity.

### 1. Autonomous Agentic Cascades (LangGraph)
STRAND employs a dynamic state machine for multi-agent workflows. We engineered a proprietary **R0 Contagion Engine**. If our `Guardian` agent flags a specification deviation with an R0 contagion score > `5.0`, it autonomously triggers the `Planner`, which dynamically spawns the `Scheduler` agent. The `Scheduler` then maps the delay probability across a NetworkX critical path schedule, generating cross-disciplinary mitigation options automatically.

### 2. Hybrid RRF GraphRAG (ChromaDB + Neo4j)
Standard RAG fails on relational construction data (e.g., "Pump A connects to Valve B"). We combine **ChromaDB** (Semantic Vector search) with **Neo4j** (Parametric Knowledge Graph) using **Reciprocal Rank Fusion (RRF)**. The `Brain` agent extracts vector chunk IDs to execute a 1-hop Neo4j graph traversal, injecting actual physical BIM constraints into the LLM context for unparalleled accuracy.

### 3. Edge-Synchronized Auth & AST Cypher Sanitization
* **Enterprise Multi-Tenancy**: Built on **Next.js 16**, STRAND utilizes Edge-synchronized cookies (via `proxy.ts`) and Supabase Row-Level Security (RLS). 
* **Database Security**: Natural language graph queries are parsed through an Abstract Syntax Tree (AST) sanitizer. It strips destructive mutators (like `DELETE`) and statically injects parameterized `$tenant_id` clauses, making cross-tenant data leaks structurally impossible.

### 4. True Offline-First Mobile Execution
Our **React Native** mobile app is built for underground data centre basements. It uses strict `AbortController` network wrappers. If offline, it queues Voice-to-Text field notes into `AsyncStorage` and relies on a robust background sync engine to push multipart audio payloads to the backend once connectivity is restored.

---

## 🤖 The Agent Ecosystem

STRAND is powered by five deeply specialized AI agents, guarded by a strict Human-In-The-Loop (HITL) approval manager to ensure construction data integrity.

1. 🛡️ **The Guardian (Quality Compliance)**
   Ingests thousands of pages of equipment specifications and automatically cross-checks vendor submittals using Vision models. It creates a cryptographic **Spec-DNA Chain**, flagging non-conformances immediately and drafting formal RFIs with exact evidentiary citations.

2. ⏱️ **The Planner (Predictive Schedule)**
   The core orchestration layer interfacing with the Critical Path Method (CPM). It analyzes real-time procurement statuses against the NetworkX schedule graph to probabilistically cascade downstream delays.

3. 🌍 **The Oracle (Supply Chain Visibility)**
   Geospatial AI that tracks multi-tier supplier shipments (UPS, switchgears, cooling towers). Uses deterministic hashing to build stable supply chain trees and queries Neo4j for healthy alternative suppliers if disruptions occur.

4. 📱 **The Inspector (Commissioning QA Copilot)**
   An offline-first mobile agent. Field engineers use **Voice-to-Text** to log observations. The backend parses this unstructured speech into formal Non-Conformance Reports (NCRs) verified against TIA-942 and Uptime Institute standards.

5. 🧠 **The Brain (Project Knowledge & RFI)**
   The omniscient conversational layer over all project documents. It answers complex contractual queries in seconds utilizing Hybrid GraphRAG, proactively identifying when similar RFIs have been resolved previously.

---

## 🔗 Enterprise Integrations

STRAND does not replace existing construction software; it supercharges them. Our dedicated **Integrations Hub** handles secure 2-Legged and 3-Legged OAuth connections via a seamless cross-window popup bridge:

*   **Autodesk Construction Cloud (ACC)**: Syncs 3D models and CAD sheets directly into our Vision AI pipeline.
*   **Procore**: Two-way sync for Requests for Information (RFIs) and Field NCRs.
*   **Oracle Primavera P6**: Ingests critical path schedules via EPPM REST API for the R0 Contagion Risk Engine.
*   **IBM Maximo**: Syncs work orders and asset histories to create a digital thread of maintenance operations.

---

## ⚡ Quick Start Guide

We have provided synthetic demo data (`data/vendor_submittal_cooling_tower.pdf`, `project_schedule_100tasks.csv`) to evaluate the platform locally.

### 1. Database Setup (Supabase)
1. Create a free project at [supabase.com](https://supabase.com/).
2. Navigate to the SQL Editor in your dashboard.
3. Execute the script found at `supabase/supabase_schema.sql` to provision the RLS profiles and dashboards.

### 2. Backend API (FastAPI)
```bash
# Navigate to the backend folder
cd backend

# Setup Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Open .env and add your GROQ_API_KEY, NEO4J_URI, NEO4J_PASSWORD, and SUPABASE credentials

# Seed the Project Knowledge Graph
python scripts/seed_db.py

# Run the Server
uvicorn main:app --reload --port 8000
```

### 3. Next.js Web Dashboard
```bash
# Navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
*Note: Due to strict enterprise tenant isolation, self-registration is disabled. You must provision a tenant via the Supabase admin panel, or use the provided backend seed script.*

### 4. React Native Mobile App
```bash
# Navigate to the mobile folder
cd mobile

# Install dependencies
npm install

# Start Expo bundler
npx expo start
```

---
<p align="center">
  <em>Developed for the ET AI Hackathon 2.0</em>
  <br>
  <em>By team TokenSpark</em>
</p>
