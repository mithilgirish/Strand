<p align="center">
  <img src="https://github.com/user-attachments/assets/81d90464-9e74-42a3-a17f-eeff905360e8" width="120" alt="STRAND Logo" style="border-radius: 20px;" />
</p>

<h1 align="center">STRAND</h1>
<p align="center"><em>The DNA of Every Great Build</em></p>

<p align="center">
  <strong>An AI-Powered Project Intelligence Platform for Hyperscale Data Centre EPC Delivery</strong><br>
  Built for <strong>ET AI Hackathon 2.0 (Theme: Industrial Intelligence / Infrastructure Construction)</strong>
</p>

---

## 🏗️ The Problem: The 67% Schedule Overrun Crisis

India's data centre capacity is projected to triple by 2027, requiring over $15 billion in capital deployment. A single hyperscale facility involves up to 40,000 equipment line items, 200 concurrent trade contractors, and zero tolerance for commissioning errors.

According to a 2024 Turner & Townsend survey, **67% of data centre EPC projects experience schedule overruns exceeding 10%**. The root cause? **Information fragmentation**. 

Specifications, vendor submittals, test records, RFIs, and schedules exist in siloed, disconnected systems. By the time a spec deviation is caught on-site or a supply chain delay is manually noticed, it has already caused a critical path delay.

## 🚀 The Solution: STRAND

**STRAND** is an autonomous AI ecosystem that unifies fragmented project data into a living intelligence layer. It catches specification deviations before they reach the site, predicts schedule risks weeks in advance, and ensures the as-built facility meets rigorous Tier III/IV certification standards.

Unlike standard conversational chatbots, STRAND is a **Multi-Platform Agentic System**:
1. **Next.js Web Client**: The "Risk Cockpit" featuring a **Custom BI Dashboard Builder**.
2. **React Native Mobile App**: The "QA Copilot" for field engineers to scan equipment and log issues on the ground.
3. **Multi-Agent Python Backend**: A LangGraph-orchestrated brain that continuously processes documents, models schedules, and automates compliance.

---

## 🤖 Deep Dive: The 5 AI Agents of STRAND

STRAND is powered by a multi-agent orchestration pattern, allowing specialized AI models to handle specific engineering domains while strictly adhering to **Human-In-The-Loop (HITL)** safety policies.

### 1. 🛡️ The Guardian (Specification & Quality Compliance)
* **The AI Solution**: The Guardian agent ingests equipment specifications and automatically cross-checks vendor submittals and shop drawings. It utilizes a **Spec-DNA Chain**, creating a cryptographic lineage from a single contract clause down to a field test record, instantly flagging non-conformances before equipment is even manufactured.

### 2. ⏱️ The Planner (Predictive Schedule Risk Engine)
* **The AI Solution**: Uses a proprietary **R0 Contagion Engine** mapped over a NetworkX critical path. The Planner analyzes real-time procurement statuses from our integrations. If a localized hardware failure occurs, it probabilistically cascades that delay across the entire MEP schedule, generating actionable mitigation options.

### 3. 🌍 The Oracle (Supply Chain Visibility)
* **The AI Solution**: Geospatial AI that tracks multi-tier supplier shipments (e.g., UPS systems, generators, switchgear). It models procurement alternatives and predicts exactly when a localized logistics bottleneck will morph into a critical path issue on-site.

### 4. 📱 The Inspector (Commissioning QA Copilot)
* **The AI Solution**: An offline-first React Native mobile app. Field workers scan an equipment QR code and use **Voice-to-Text** to log an observation. The Inspector agent automatically parses this unstructured speech into a formal Non-Conformance Report (NCR) and verifies it against TIA-942 and Uptime Institute acceptance criteria.

### 5. 🧠 The Brain (Project Knowledge & RFI Intelligence)
* **The Challenge**: Resolving an RFI (Request for Information) requires searching through thousands of disconnected PDFs, contracts, and emails.
* **The AI Solution**: A **Hybrid-GraphRAG** layer combining ChromaDB (vector search) with Neo4j (Knowledge Graph). It answers complex contractual queries with exact citations and proactively flags when similar RFIs have been resolved in the past. **This agent is fully accessible via the Mobile App** through a multi-threaded conversational UI, allowing field engineers to start new chats, switch between ongoing context threads, and resolve RFI queries directly from the construction site.

---


## 🔗 Enterprise Integrations & The Integrations Hub

STRAND does not replace existing construction software; it acts as the intelligence layer built on top of them. Our Next.js frontend features a dedicated **Integrations Hub** (`/integrations`) that handles secure 2-Legged and 3-Legged OAuth connections, webhook configurations, and on-demand data syncing for the industry's most relied-upon tools:

* **Autodesk Construction Cloud (ACC)**: Syncs shop drawings and design models directly into our GraphRAG layer. Includes webhook listeners for live design changes.
* **Procore**: Two-way sync for Requests for Information (RFIs) and vendor submittals.
* **Oracle Primavera P6**: Ingests critical path schedules via EPPM REST API for real-time risk modeling.
* **IBM Maximo**: Syncs work orders and asset histories to create a comprehensive digital thread of maintenance operations.

---

## 🧬 Technical Architecture & Innovations

STRAND is built on a modern, scalable, enterprise-grade technology stack designed to handle the complexity of massive infrastructure projects.

### 1. Custom BI Dashboarding Engine
Project Managers aren't limited to static views. STRAND features a fully customizable **Dashboard Engine** where users can drag, drop, and configure widgets to monitor specific schedule risks, open NCRs, and supply chain health—all fueled by real-time agent data.

### 2. Multi-Tenant Architecture & Security (Tenant-Wise Auth)
STRAND is built for B2B SaaS scalability. It employs a strict **multi-tenant architecture**:
* **Supabase Row-Level Security (RLS)**: Every database query is cryptographically scoped to the authenticated user's `tenant_id`.
* **AST Cypher Sanitization**: Enterprise AI must be secure. All AI-generated database queries are run through an AST sanitizer that blocks destructive mutators (`DELETE`, `DROP`) and forcibly injects `$tenant_id` scoping directly into the Neo4j Graph to prevent cross-project data leaks.

### 3. Hybrid GraphRAG
Standard vector RAG fails on highly relational construction data. We combined vector embeddings (Chroma) with a Parametric Knowledge Graph (Neo4j) so the AI understands physical *relationships* (e.g., "Pump A is connected to Valve B").

### 4. Human-In-The-Loop (HITL) Orchestration
Agents can freely read and analyze data, but any system-altering action (such as generating an RFI in Procore or altering a Primavera schedule baseline) routes to a centralized "Approval Manager" requiring explicit human sign-off.

### 5. Offline-First Edge AI
Data centers under construction often lack Wi-Fi. The Inspector mobile app caches voice logs and NCRs locally, seamlessly syncing them to the AI agents the moment a connection is re-established.

---

## 🧪 Demo Data & Evaluation

To evaluate the capabilities of STRAND, we have provided synthetic demo data representing a real-world Data Centre EPC project:
* **Location**: Check the `data/` directory in this repository.
* **Contents**: Includes `project_schedule_100tasks.csv`, synthetic vendor submittal PDFs (e.g., `vendor_submittal_cooling_tower.pdf`), and detailed commissioning checklists.
* **Usage**: You can use the Web Dashboard's ingestion portal to upload these documents and watch the **Guardian** agent flag non-conformances in real-time, or use the mobile app to scan a mock QR code and log an NCR against this data.

---

## ⚡ Quick Start Guide

### 1. Database Setup (Supabase)
To run STRAND locally, you will need a Supabase backend for Authentication and PostgreSQL.
1. Create a free project at [supabase.com](https://supabase.com/).
2. Navigate to the SQL Editor in your dashboard.
3. Execute the scripts found in the `supabase/` folder of this repository (`supabase_schema.sql` and `seed_dashboards.sql`).

### 2. Backend API (FastAPI)
```bash
# Navigate to the backend folder
cd backend

# Setup Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Open .env and add your GROQ_API_KEY, NEO4J_URI, NEO4J_PASSWORD, and SUPABASE credentials

# Seed the Database
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

### 4. React Native Mobile App
```bash
# Navigate to the mobile folder
cd mobile

# Install dependencies
npm install

# Start Expo bundler
npx expo start
```
