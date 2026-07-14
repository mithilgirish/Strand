<p align="center">
  <img src="https://github.com/user-attachments/assets/81d90464-9e74-42a3-a17f-eeff905360e8" width="120" alt="STRAND Logo" style="border-radius: 20px;" />
</p>

<h1 align="center">STRAND</h1>
<p align="center"><em>The DNA of Every Great Build</em></p>

<p align="center">
  <strong>AI-Powered Construction Intelligence Platform for Hyperscale Data Centre EPC Delivery</strong><br>
  Built for <strong>ET AI Hackathon 2.0 (Problem Statement 4)</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#the-five-ai-agents">The 5 AI Agents</a> •
  <a href="#security--architecture">Architecture</a>
</p>

---

## 🏗️ What is STRAND?

STRAND is a multi-platform autonomous AI ecosystem designed to solve the massive complexity of hyperscale data centre construction. 

By unifying disjointed documents (specifications, vendor submittals, schedules, and NCRs) into a single causal model known as the **Parametric Knowledge Graph (PKG)**, STRAND catches compliance violations before they reach the site and cascades delay probabilities across the project schedule.

STRAND consists of:
1. **Python / FastAPI Backend:** Core Agent Orchestration & Graph Logic
2. **Next.js Web Client:** The Project Risk Cockpit & Custom BI Dashboard Builder
3. **React Native Expo Mobile App:** The Field QA Inspector Tool (Voice & Offline Support)

---

## 🤖 The Five AI Agents

STRAND utilizes a multi-agent orchestration pattern (`Planner` agent routing) with strict **Human-In-The-Loop (HITL)** safety policies.

| Agent | Role | Capabilities |
|-------|------|--------------|
| 🛡️ **The Guardian** | **Spec Compliance** | Automatically parses Vendor Submittal PDFs, checks them against Neo4j Spec-DNA constraints, and triggers violations. |
| ⏱️ **The Scheduler** | **Predictive Risk** | Uses a proprietary **R0 Contagion Engine** over a NetworkX critical path to model how a localized hardware failure delays the whole project. |
| 🌍 **The Oracle** | **Supply Chain** | Geospatial AI that tracks multi-tier supplier nodes and shipment risks, auto-recommending fallback supply routes. |
| 📱 **The Inspector** | **Commissioning QA** | Voice-powered mobile app agent that processes field engineer speech into Non-Conformance Reports (NCR) and builds TIA-942 As-Built records. |
| 🧠 **The Brain** | **RFI Copilot** | A Hybrid-GraphRAG (ChromaDB + Neo4j) intelligence layer that answers complex project queries with "Clinical Confidence." |

---

## 🚀 Key Innovations

- **Spec-DNA Chain:** Cryptographic lineage tracking from a single TIA-942 contract clause down to a field commissioning test record.
- **R0 Contagion Score:** An epidemiological risk propagation model applied to construction. If a generator's cooling fan is delayed, the R0 score probabilistically cascades that delay across the MEP schedule.
- **Unified Authentication & Multi-Tenancy:** Uses Supabase Auth & JWT decoding with an injected `$tenant_id` AST-sanitizer for secure, isolated Cypher graph queries.
- **Enterprise Safe (HITL):** AI Agents can read data freely, but all write/mutation operations (like sending an RFI or altering a schedule) require strict Human-in-the-Loop manager approval via our custom Approval Manager.

---

## 🛠️ Tech Stack

- **AI & Graph:** LangGraph, Groq / OpenRouter, Neo4j Aura, ChromaDB, NetworkX, Unstructured.io
- **Backend:** Python , FastAPI, Supabase (Postgres & Auth), Loguru, Redis
- **Web Frontend:** Next.js , Tailwind CSS, Lucide Icons, Glassmorphism UI
- **Mobile Frontend:** React Native, Expo, Expo-AV (Voice), AsyncStorage (Offline-first)

---

## ⚡ Quick Start

### 1. Backend API (FastAPI & Agents)
```bash
# 1. Clone the repository and navigate to the backend
cd backend

# 2. Setup your virtual environment and install dependencies
pip install -r requirements.txt

# 3. Configure your Environment Variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY, NEO4J_URI, NEO4J_PASSWORD, and SUPABASE credentials.

# 4. Seed the Graph Database with Demo Data
python ../scripts/seed_db.py

# 5. Start the API Server
uvicorn main:app --reload --port 8000
```
> The API will be running at `http://localhost:8000`. View docs at `http://localhost:8000/docs`.

### 2. Next.js Web App (Risk Cockpit)
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```
> The web app will be running at `http://localhost:3000`.

### 3. React Native Mobile App (Inspector QA)
```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Start the Expo bundler
npx expo start
```
> Scan the QR code with the Expo Go app on your phone, or press `a` to run on Android / `i` for iOS simulator.

---

## 🔒 Security & Architecture

STRAND implements an enterprise-grade security architecture:
*   **Stateless JWT Validation:** Supabase tokens are verified against JWKS keys directly in the FastAPI middleware.
*   **AST Cypher Sanitization:** All AI-generated database queries are run through an AST sanitizer that blocks mutators (`CREATE`, `DELETE`) and forcibly injects `tenant_id` scoping to prevent cross-tenant data leaks.
*   **Offline Mode:** The mobile app stores field NCRs locally via `AsyncStorage` and syncs them to the AI agents once network connectivity is restored.


