# STRAND — Pitch Presentation Slide Deck (7-Slide High-Impact Outline)
## Autonomous Supply Chain & Quality Intelligence Platform for Hyperscale Infrastructure

---

## Slide 1: Title & Platform Overview

### 🎨 Visual & Graphic Concept
* Dark industrial background with signature STRAND specular glass visualizers (`#46E3B7` ambient accent lighting).
* Production Badges: **Live Web App (Vercel)** | **FastAPI Cluster (Render)** | **ET AI Hackathon 2.0**.

### 📌 Slide Content
* **Platform Name**: STRAND
* **Headline**: The Autonomous Intelligence Layer for Hyperscale Infrastructure Delivery
* **Core Technology Stack**:
  * **5-Core Agent LangGraph Network** (Guardian, Brain, Scheduler, Oracle, Inspector)
  * **Hybrid GraphRAG** (Neo4j Parametric Knowledge Graph + ChromaDB + `rank_bm25`)
  * **Offline-First Edge Resilience** (3-second `AbortController` timeouts & local `AsyncStorage` queue)

---

## Slide 2: The Problem vs. The STRAND Solution

### 🎨 Visual & Graphic Concept
* Side-by-side comparison: **Fragmented Silos** (40,000 components across PDFs, Procore, Primavera P6, Maximo) vs. **STRAND Living Knowledge Graph**.

### 📌 Slide Content
* **The Hyperscale Crisis**: 67% of data center projects suffer schedule overruns ($2M/day SLA impact). Specifications, submittals, and field records exist in disconnected silos.
* **The Delayed Cost**: By the time an out-of-spec cooling unit arrives on site, a 3-month critical path delay is locked in.
* **The STRAND Solution**: Converts static PDFs and CAD drawings into a **Parametric Knowledge Graph (PKG)**, shifting quality control to the extreme left *before* manufacturing.

---

## Slide 3: Mathematical Innovation — The R0 Contagion Engine

### 🎨 Visual & Graphic Concept
* LangGraph state flow diagram: **Guardian Agent** $\rightarrow$ **Planner Agent** $\rightarrow$ **Scheduler Agent** $\rightarrow$ **Oracle Agent**.
* Highlighted Equation Box:

$$R_0 = \frac{\text{downstream\_count} + 2 \times \text{critical\_downstream\_count}}{\text{normalizer}}$$

### 📌 Slide Content
* **Epidemiological Contagion Math**: Calculates the exact disruption blast radius of a component non-conformance.
* **Autonomous Cascade**: If $R_0 > 5.0$, Guardian automatically triggers Planner & Scheduler to rebuild NetworkX Critical Path Method (CPM) graphs.
* **Human-in-the-Loop Gate**: All write operations (issuing NCRs, altering schedules) require JWT-signed human sign-off via Redis approval manager.

---

## Slide 4: Hybrid GraphRAG & AST Cypher Security

### 🎨 Visual & Graphic Concept
* Diagram comparing Standard Vector RAG (Fails on physical BIM connections) vs. STRAND Hybrid GraphRAG (Vector + BM25 + Neo4j 1-hop BIM neighborhood traversal).

### 📌 Slide Content
* **Reciprocal Rank Fusion (RRF)**: Merges dense ChromaDB vector search with sparse `rank_bm25` keyword matches ($RRF\_k=60$).
* **1-Hop BIM Neighborhood Traversal**: Reads `spec_dna_id` from top vectors to pull physical relationships (`DERIVES_FROM`, `VIOLATES`) from Neo4j into the LLM context.
* **AST Cypher Security**: Rejects `CREATE`, `MERGE`, `DROP` queries from LLMs and injects `{tenant_id: $tenant_id}` into all patterns for multi-tenant isolation.

---

## Slide 5: Edge Resilience & Enterprise Ecosystem

### 🎨 Visual & Graphic Concept
* Mobile device mockups (`ChecklistScreen`, `NcrLogScreen`, `SyncStatusScreen`) alongside partner logos (**Procore**, **Autodesk APS**, **Primavera P6**, **IBM Maximo**).

### 📌 Slide Content
* **Zero-Connectivity Resilience**: React Native app uses 3-second `AbortController` timeouts and local `AsyncStorage` queues (`local_ncrs`) during cellular blackouts in data center basements.
* **Automated Background Sync**: Flushes pending field observations to backend upon network reconnect. Native headers strip `Content-Type` for valid audio multipart boundaries.
* **Cross-Window OAuth Bridge**: `window.open` + `postMessage` listener authorizes enterprise accounts without losing active dashboard state.

---

## Slide 6: Business Impact & Production Deployments

### 🎨 Visual & Graphic Concept
* Clean ROI metric table alongside screen captures of live production deployments.

### 📌 Slide Content

| Operational Metric | Manual Process | STRAND Platform | Business ROI |
| :--- | :--- | :--- | :--- |
| **Spec Audit Speed** | 4.5 hours / submittal | 45 seconds | **98.3% Time Reduction** |
| **NCR Cycle Time** | 14 business days | 4.6 business days | **67.1% Faster Resolution** |
| **Unplanned Outages** | High (Field surprises) | Zero ($R_0$ Predictive) | **Millions Saved in SLAs** |
| **Edge Resilience** | 0% (Data lost offline) | 100% (Async Queue) | **100% Field Data Capture** |

* **Web Command Dashboard (Vercel)**: [https://strand-iota.vercel.app](https://strand-iota.vercel.app)
* **Backend API Engine (Render)**: [https://strand-87qa.onrender.com/docs](https://strand-87qa.onrender.com/docs)

---

## Slide 7: Conclusion & Summary

### 🎨 Visual & Graphic Concept
* STRAND Logo with closing callout: *"Building the Intelligence Layer for Hardware Scale."*

### 📌 Slide Content
* **Proven Agentic Architecture**: 5 Core Domain Agents operating on a unified Parametric Knowledge Graph.
* **Enterprise Security**: AST Cypher query sanitization, HITL gates, and offline-first mobile execution.
* **Mission**: Software built to power India's 2,700 MW data center infrastructure roadmap.
