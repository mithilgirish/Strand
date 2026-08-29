# STRAND — System Architecture

STRAND is a multi-agent causal AI platform for hyperscale infrastructure construction compliance. This document explains the core technical components.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SURFACES                            │
│       Next.js 16 Web Dashboard    │  React Native Expo App      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / JWT
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FASTAPI GATEWAY (:8000)                      │
│    Rate Limiting (SlowAPI) · CORS · JWKS Auth · RLS Scoping     │
└────────────────┬─────────────────────────────┬──────────────────┘
                 │                             │
┌────────────────┴──────────┐    ┌─────────────┴────────────────┐
│  LANGGRAPH AGENT ENSEMBLE │    │    PERSISTENCE LAYER          │
│  Guardian  · Brain        │    │  Neo4j AuraDB (Graph)         │
│  Scheduler · Oracle       │    │  ChromaDB  (Vectors)          │
│  Inspector · Planner      │    │  Redis     (Cache/Queue)      │
│  Judge     · Dashboard    │    │  Supabase  (Auth/Users)       │
└───────────────────────────┘    └──────────────────────────────┘
```

---

## 1. Spec-DNA Fingerprinting

Every specification clause is given a deterministic SHA-256 fingerprint called a **Spec-DNA ID**. This ID is computed from the clause's section number, parameter name, required value, unit, and operator — creating an immutable cryptographic identity for each engineering requirement.

```
Spec-DNA Chain:
  Clause §6.7.1 ──► BOQ Line Item ──► Purchase Order ──► Vendor Submittal
       │                  │                  │                   │
   SHA-256            SHA-256            SHA-256             SHA-256
```

When a vendor submittal is analyzed, the Guardian agent recomputes the Spec-DNA ID for each declared parameter and compares it against the chain. Any break in the hash chain is a **confirmed violation** — zero ambiguity, zero hallucination.

---

## 2. R₀ Contagion Risk Engine

STRAND adapts the epidemiological Basic Reproduction Number ($R_0$) to model how a single component non-conformance propagates schedule risk downstream.

$$R_0 = \frac{\text{downstream\_count} + 2 \times \text{critical\_downstream\_count}}{\text{normalizer}}$$

| Score | Severity | Action |
| :--- | :--- | :--- |
| $R_0 < 2.0$ | Low | Log violation, no automatic escalation |
| $2.0 \leq R_0 < 5.0$ | Medium | Alert project manager, queue RFI draft |
| $R_0 \geq 5.0$ | Critical | Trigger Planner + Scheduler agents, pause IST milestone |

---

## 3. Hybrid GraphRAG Engine (Brain Agent)

The Brain agent uses **Reciprocal Rank Fusion** (RRF, $k=60$) to merge two complementary retrieval signals:

1. **Dense Retrieval**: ChromaDB with `all-MiniLM-L6-v2` ONNX embeddings (cosine HNSW index).
2. **Sparse Retrieval**: `rank_bm25` BM25 keyword matching over spec clause text.

After retrieval, a 1-hop Neo4j graph traversal (`GET_SPEC_DNA_NEIGHBORHOOD`) injects BIM-traceable physical constraints directly into the LLM context, grounding every answer to a citable document source.

---

## 4. AST Cypher Security Sandbox

All AI-generated Neo4j Cypher queries pass through a regex + AST sanitizer before execution:

- **Blocks mutating keywords**: `CREATE`, `MERGE`, `SET`, `DELETE`, `DETACH`, `DROP`, `CALL`.
- **Blocks comment injection**: `//`, `/* */`.
- **Blocks `OR` clauses** that could bypass tenant isolation.
- **Injects tenant scope** automatically: `MATCH (n:Node)` → `MATCH (n:Node {tenant_id: $tenant_id})`.

This ensures zero cross-tenant data leakage and zero destructive query execution, even if the LLM generates malicious Cypher.

---

## 5. The 8-Agent Ensemble

| # | Agent | Responsibility |
| :--- | :--- | :--- |
| 01 | **Guardian** | PDF OCR ingestion, Spec-DNA audit, $R_0$ calculation, RFI draft generation |
| 02 | **Scheduler** | Critical Path Method (CPM) simulation, delay probability modeling |
| 03 | **Oracle** | Supply chain resiliency, fallback vendor ranking, GeoJSON risk mapping |
| 04 | **Brain** | Conversational Hybrid GraphRAG: BM25 + Dense + Neo4j 1-hop traversal |
| 05 | **Inspector** | Multimodal field voice note intake, offline NCR processing, Whisper transcription |
| 06 | **Planner** | Strategic mitigation synthesis, HITL approval trigger |
| 07 | **Judge** | Independent plan verification, compliance validation |
| 08 | **Dashboard** | Natural language to Neo4j Cypher widget translator |

---

## 6. Multi-Tenancy & Security Model

- **JWT verification**: Supabase JWKS public key handshake on every request.
- **Tenant claims**: `app_metadata.tenant_id` and `app_metadata.role` extracted from the verified JWT payload.
- **Row-Level Security**: All Neo4j queries parameterized with `$tenant_id`; all Supabase queries scoped by RLS policies.
- **HITL Gate**: High-risk agent actions (RFI dispatch, mitigation plan approval) require explicit human approval via a Redis-backed outbox queue before execution.

---

## 7. Technology Stack

| Layer | Technology |
| :--- | :--- |
| Web Frontend | Next.js 16, TypeScript, Tailwind CSS, Recharts, React Grid Layout |
| Mobile App | React Native, Expo, AsyncStorage (offline-first) |
| API Gateway | FastAPI, Uvicorn, Pydantic v2, SlowAPI rate limiter |
| Agent Framework | LangGraph, LangChain, Groq Llama-3.3-70B |
| Graph Database | Neo4j AuraDB (Community self-host compatible) |
| Vector Database | ChromaDB + rank_bm25 + RRF fusion |
| Auth & Security | Supabase Auth, JWKS, multi-tenant RLS |
| Cache & Queues | Redis / fakeredis (in-memory fallback) |
| Document Parsing | PyMuPDF, pytesseract, OpenAI Whisper |
