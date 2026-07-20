# STRAND - Technical Architecture Deep Dive
**ET AI Hackathon 2.0 (Technical Excellence)**

This document details the engineering feats and architectural decisions that make STRAND a secure, highly intelligent, and scalable platform built specifically to address the extreme complexity of hyperscale data centre EPC delivery.

---

## 1. Multi-Agent Orchestration (LangGraph)
STRAND moves beyond simple LLM wrappers by utilizing a dynamic, autonomous **LangGraph** state machine capable of cross-agent triggering and complex contextual reasoning.

*   **The R0 Contagion Engine Cascade**: The `Guardian` agent parses PDFs using vision models (`extract_parameters_from_pdf`) to extract parameters and compares them against the Neo4j Project Knowledge Graph (PKG). It calculates an **R0 Contagion Score** representing downstream impact severity. If `Guardian` flags a deviation with `r0_max > 5.0`, it autonomously triggers the `Planner`, which dynamically spawns the `Scheduler` agent. The Scheduler recalculates the critical path delay probabilities across a NetworkX graph—generating mitigation options rather than just reactive alerts.
*   **Deterministic Supply Chain Expansions**: The `Oracle` agent tracks multi-tier supplier shipments (e.g., UPS, switchgears). It uses a `_stable_offset` hashing algorithm for shipment IDs to generate stable UI tree visualizations. When searching for alternative suppliers, it queries Neo4j for healthy suppliers, sorting by risk score and on-time delivery rates, and formats outputs into strict Leaflet GeoJSON specs for the frontend map.
*   **Human-In-The-Loop (HITL) Gate**: All write operations (like creating an RFI in Procore or altering a Primavera schedule baseline) are intercepted and forcibly routed to an `approval_manager` gate, preventing AI hallucinations from mutating production construction data.

---

## 2. Hybrid RRF GraphRAG (Neo4j + ChromaDB)
Construction data is inherently relational and highly specific. Standard semantic RAG fails to understand that "Chiller 1 connects to Valve B." We engineered a sophisticated Hybrid GraphRAG pipeline:
*   **Reciprocal Rank Fusion (RRF)**: Our `retriever.py` uses ChromaDB for dense semantic retrieval and `rank_bm25` for exact keyword matching. Both result lists are mathematically merged using the RRF formula `1 / (rrf_k + rank)` to perfectly balance semantic intent with precise engineering terminology.
*   **1-Hop Topological Injection**: Vectors alone are insufficient. Our `Brain` agent extracts `spec_dna_id`s from the retrieved vector chunks and executes a `GET_SPEC_DNA_NEIGHBORHOOD` query against **Neo4j**. This fetches 1-hop topological relationships (e.g., `DERIVES_FROM`, `VIOLATES`), appending the actual physical BIM context directly into the LLM prompt.

---

## 3. Enterprise Edge Auth & AST Cypher Tenant Isolation
STRAND is built for multi-tenant B2B SaaS scalability, deploying strict security boundaries across both the Edge and the Graph database.
*   **Edge-Synchronized Cookies**: Inside our Next.js 16 `proxy.ts`, when `@supabase/ssr` refreshes the JWT, we intercept and write the new token to *both* the incoming request and outgoing `NextResponse` cookies simultaneously. This completely eliminates stale sessions on Edge functions.
*   **JWKS Local Caching**: The Python backend locally decodes and verifies Supabase JWTs by fetching and caching the Supabase JWKS from `.well-known/jwks.json`, preventing slow database lookups on every API call.
*   **AST Cypher Sanitization**: Enterprise AI must be secure against injection. Our natural-language-to-graph queries are parsed through an Abstract Syntax Tree (AST) sanitizer. The `Neo4jClient` explicitly rejects string interpolation. It strips destructive mutators (`DELETE`, `DROP`) and statically injects parameterized `$tenant_id` WHERE clauses (`ON CREATE` and `ON MATCH`) before sending queries to Neo4j. Cross-tenant data leakage is structurally impossible.
*   **Redis Partitioning**: API route handlers partition all AI conversational memory using strict key spaces (`chat:{tenant_id}:{session_id}`).

---

## 4. True Offline-First Mobile AI (React Native)
Data centre construction sites often have zero connectivity (e.g., underground MEP levels). The STRAND mobile app is built to survive network partitions gracefully.
*   **AbortController & AsyncStorage Queuing**: Every backend API fetch is wrapped in a strict 3-second `AbortController`. If a request times out, the app intelligently catches the error, generates a mocked payload with a `"QUEUED"` ID and a `"pending"` R0 score, and pushes the payload into a local `AsyncStorage` array.
*   **Manual Sync Engine**: A dedicated `SyncStatusScreen.tsx` monitors this offline cache. When the engineer returns to Wi-Fi, a background worker iterates through the cache, fires individual network payloads with strict timeouts, counts successes, updates the `last_sync_time`, and flushes the queue sequentially.
*   **Native Multipart Audio Hijacking**: Our Voice-to-Text Inspector Agent utilizes `expo-av` for high-quality iOS background audio capture. When uploading, we intentionally delete the `Content-Type` header from our standard fetch wrapper, forcing the native OS to dynamically set the multipart boundary when streaming the `audio/m4a` file to FastAPI for transcription.

---

## 5. Next.js 16 UI: Edge Proxies & Dynamic BI Engines
*   **Popup-Based OAuth Bridge**: For 3-legged enterprise integrations (Autodesk, Procore), we eliminated jarring OAuth page redirects that destroy application state. We utilize a `window.open` popup listener. The parent dashboard uses `window.addEventListener('message', handleMessage)` to listen for an `OAUTH_COMPLETE` message event across the window boundary, instantly triggering a cache-busted (`_t=${Date.now()}`) synchronization.
*   **Dynamic ResizeObserver Canvas**: The BI UI utilizes `ResponsiveGridLayout` backed by a custom `ResizeObserver` implementation to bypass standard hook delays. This ensures complex Recharts and R0 Severity Gauges scale fluidly across `lg`, `md`, `sm`, and `xs` breakpoints.
*   **Specular Edge Aesthetics**: We styled the components with a Specular Edge UI (`bg-gradient-to-r from-transparent via-white/30`) and implemented rich real-time state synthesizers (e.g., overlays rendering "Compiling Cypher AST...") to deliver a high-end, premium command center aesthetic.
