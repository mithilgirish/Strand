# STRAND Backend — Project History & Progress

## Overview
This document tracks the history of the STRAND Backend & Agentic AI architecture implementation. It provides a high-level summary of the phases completed, architectural decisions made, and the current state of the codebase.

**Project:** STRAND Backend (FastAPI, LangGraph, Neo4j, ChromaDB, Groq Llama-3.1)
**Ground Truth:** `STRAND_Backend_Agentic_AI_Engineering_PRD_v1.2.md`
**Last Updated:** July 2026

---

## Phase 1: Shared Infrastructure (Completed)
**Goal:** Establish the foundational databases, connections, and extraction pipelines.
**Status:** ✅ Completed

### Key Components Built:
- **Configuration & Error Handling (`backend/config.py`, `backend/errors.py`):** Configured application settings, rate limits, and standardized error envelopes.
- **Database Clients (`backend/graph/client.py`, `backend/vector/store.py`, `backend/redis_client.py`):** Implemented Neo4j driver with NetworkX fallback, ChromaDB vector store, and Redis client with in-memory fallback.
- **Graph Schema & Queries (`backend/graph/schema.py`, `backend/graph/queries.py`):** Defined constraint logic (`passes_constraint`) and all Cypher queries using idempotent `MERGE` statements.
- **R0 Contagion Engine (`backend/r0/`):** Built the core physics engine that calculates cascading supply chain risk and maps it to severity levels. (Note: Resolved mathematical discrepancy by adding a critical-path weight multiplier `2 * critical_path_downstream` normalized to a 0-10 scale).
- **Spec-DNA Ingestion (`backend/ingestion/`):** Created the deterministic SHA-256 fingerprinting system for document lineage. Built parsers for PDFs (PyMuPDF) and CSVs, along with NER parameter extractors.
- **LLM Wrappers (`backend/llm/client.py`):** Established robust Pydantic structured output extraction using `langchain-groq`.
- **Prompt Registry (`backend/prompts/`):** Externalized all LLM prompts into YAML files for easier editing and versioning.

---

## Phase 2: Agent Architecture (Completed)
**Goal:** Implement the 6 core AI agents defined in the PRD.
**Status:** ✅ Completed

### Key Components Built:
- **Pydantic Models (`backend/models/`):** Created robust data schemas for violations, risks, shipments, NCRs, queries, and planner intents.
- **The Guardian (`backend/agents/guardian.py`):** Automated spec compliance auditor. Extracts parameters from submittals, checks them against the Neo4j PKG, and drafts RFIs for violations.
- **The Scheduler (`backend/agents/scheduler.py`):** Predictive risk engine. Builds CPM dependency graphs from CSVs and forecasts delays.
- **The Oracle (`backend/agents/oracle.py`):** Supply chain intelligence. Traverses the Neo4j graph to find at-risk shipments and outputs map-ready GeoJSON.
- **The Inspector (`backend/agents/inspector.py`):** Commissioning QA. Converts raw field engineer voice transcripts into structured Non-Conformance Reports (NCRs) and links them to Spec-DNA.
- **The Brain (`backend/agents/brain.py`):** Project knowledge copilot. Uses Reciprocal Rank Fusion (RRF) for hybrid search (BM25 + Dense) and enriches answers with 1-hop Neo4j graph context.
- **The Judge (`backend/agents/judge.py`):** Independent verification agent. Checks LLM-authored content (e.g., Guardian's RFIs) against hard PKG facts before a human sees them.

---

## Phase 3: Orchestration & APIs (In Progress)
**Goal:** Build the central Planner, tool registry, and FastAPI endpoints.
**Status:** 🔄 In Progress

### Key Components Built So Far:
- **Tool Registry (`backend/tools/`):** Established Tier-1 (Agents) and Tier-2 (Primitives) tool registry with RBAC policy controls.
- **The Planner (`backend/agents/planner.py`):** Central orchestrator that classifies user intent, decomposes subtasks, and executes agents in parallel.
- **HITL Approval Manager (`backend/approvals/manager.py`):** Enforces a Human-in-the-Loop gate for all write operations, ensuring no agent can commit changes without explicit approval (auto-approves in DEMO_MODE).

### Next Steps:
- Build FastAPI routers (`backend/routers/`) to expose the agents and Planner to the frontend.
- Implement WebSocket endpoints for real-time agent logging.
- Wire up `main.py` and finalize the REST API.

---

## Phase 4: Testing & Handoff (Pending)
**Goal:** Seed the database, run end-to-end tests, and prepare for presentation.
**Status:** ⏳ Pending

### Next Steps:
- Execute `scripts/seed_db.py` to populate Neo4j and Chroma with synthetic TIA-942 spec data and project schedules.
- Run `scripts/test_agents.py` to verify functionality.

---
*This file will be updated as the project progresses towards completion.*
