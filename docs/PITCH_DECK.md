# STRAND - ET AI Hackathon 2.0 Pitch Deck Outline

**Theme:** Industrial Intelligence / Infrastructure Construction / Quality Management
**Target Time:** 5 Minutes (Strict)

---

## Slide 1: STRAND - The Intelligence Layer (0:00 - 0:30)
- **Visual**: STRAND Logo on a dark industrial background with our signature Specular Edge UI glow.
- **Headline**: STRAND: The Intelligence Layer for Data Centre EPC Delivery.
- **Sub-headline**: GraphRAG, Autonomous Multi-Agent Workflows, and Offline-First Field Execution.
- **Key Takeaway**: STRAND is the ultimate AI solution to India's data centre scale-up challenges.
- **Speaker Notes**: *“Good morning judges. India is racing to build 2,700 Megawatts of data centre capacity. But we have a massive bottleneck: 67% of these projects will suffer major schedule overruns. Today, we present STRAND, the autonomous AI layer that solves this.”*

## Slide 2: The Information Fragmentation Crisis (0:30 - 1:00)
- **Visual**: A chaotic graphic showing PDFs, Procore logos, and Primavera schedules disconnected from each other.
- **The Core Issue**: A single hyperscale facility has 40,000 equipment items and 200 contractors. Specifications, vendor submittals, and schedules live in completely disconnected silos.
- **The Result**: By the time a specification deviation is caught on the physical site, it’s already caused a critical path delay.
- **Key Takeaway**: Delays are caused by fragmented data, not a lack of tools.
- **Speaker Notes**: *“The root cause isn't a lack of software; it's information fragmentation. By the time a faulty cooling tower arrives on site, the delay is locked in. We need an intelligence layer that connects the dots before the concrete is poured.”*

## Slide 3: The Solution - STRAND (1:00 - 1:30)
- **Visual**: High-level Architecture diagram showing Next.js (Web), React Native (Mobile), and FastAPI (Brain) routing to Autodesk and Primavera.
- **What it is**: An AI-powered EPC Project Intelligence platform that unifies fragmented project data.
- **Key Takeaway**: STRAND connects the dots and acts proactively.
- **Speaker Notes**: *“STRAND is a multi-agent orchestration platform. It shifts quality control to the extreme left. It catches spec deviations before manufacturing, and predicts schedule risks weeks in advance.”*

## Slide 4: The Autonomous R0 Contagion Cascade (1:30 - 2:15)
- **Visual**: LangGraph workflow diagram showing Guardian -> Planner -> Scheduler.
- **The Tech**: We utilize LangGraph to model a state machine. If our `Guardian` agent flags a spec deviation with a high R0 contagion score (>5.0), it autonomously triggers the `Planner`, which dynamically spawns the `Scheduler` to map the delay probability across a NetworkX critical path.
- **Key Takeaway**: Our multi-agent AI doesn't just alert; it cascades and mitigates risks autonomously.
- **Speaker Notes**: *“This is where we innovate beyond standard AI. If our Guardian agent finds a fault in a submittal, it calculates an R0 Contagion score. If that score is critical, it autonomously spawns our Scheduler agent to map the exact delay across a NetworkX graph, giving project managers mitigation options, not just alerts.”*

## Slide 5: Enterprise Knowledge Intelligence (2:15 - 3:00)
- **Visual**: A split screen showing ChromaDB (Vector) + Neo4j (Graph) feeding into an LLM.
- **The Tech**: Standard vector RAG fails on relational construction data. We combined ChromaDB with Neo4j using Reciprocal Rank Fusion (RRF). Our `Brain` agent extracts vector IDs and does a 1-hop Neo4j query to inject physical BIM relationships (e.g., "Pump A connects to Valve B") into the LLM.
- **Security**: All AI-to-Graph queries pass through an AST sanitizer that injects parameterized `$tenant_id` boundaries, making cross-tenant data leaks structurally impossible.
- **Key Takeaway**: Unparalleled accuracy in construction queries with guaranteed enterprise-grade security.
- **Speaker Notes**: *“Technically, standard RAG fails in construction. A vector database doesn't know that Pump A physically connects to Valve B. We built a Hybrid GraphRAG system. We use Reciprocal Rank Fusion to merge semantic search with exact keyword matching, and then we inject 1-hop physical relationships from a Neo4j Knowledge Graph into the LLM. Furthermore, every AI query is run through an AST sanitizer to enforce strict multi-tenant Row Level Security.”*

## Slide 6: Shifting Quality Control Left (3:00 - 3:45)
- **Visual**: A side-by-side of a 1000-page PDF spec and a concise JSON output from STRAND.
- **Impact**: It flags non-conformances *before* equipment is manufactured, saving weeks of rework and protecting Tier III/IV commissioning SLAs.
- **Key Takeaway**: Catching errors early translates directly to millions of dollars in saved costs.
- **Speaker Notes**: *“The business impact is massive. We automate the cross-referencing of 1,000-page specs against vendor submittals. Catching a non-conformance here, before the equipment is even manufactured, saves hundreds of thousands of dollars in rework and protects the final Uptime SLA.”*

## Slide 7: Built for the Real World (3:45 - 4:30)
- **UX Innovation**: **Cross-Window OAuth**. We eliminated jarring page redirects for Procore integrations using `window.open` message passing to preserve dashboard state.
- **Offline-First Mobile**: Data centres lack Wi-Fi. Our React Native `Inspector` app uses a strict `AbortController` queue. Voice-to-Text field notes are saved in `AsyncStorage` and rely on a background sync engine to push multipart audio to the backend once connectivity is restored.
- **Key Takeaway**: Flawless UX that works precisely where and how field engineers work.
- **Speaker Notes**: *“We built for scale and real-world UX. We engineered cross-window OAuth bridging for integrations so users never lose their dashboard state. And because data centre basements don't have Wi-Fi, our mobile app is entirely offline-first, queuing voice-to-text inspections locally and syncing them gracefully when connectivity is restored.”*

## Slide 8: The Vision for India’s AI Infrastructure Hub (4:30 - 5:00)
- **Visual**: Team STRAND Photo / QR Code to the GitHub Repo.
- **Closing Thought**: For India to reach 2,700 MW by 2027, we need EPC delivery capability that matches the complexity of what we are building. STRAND is that capability.
- **Key Takeaway**: STRAND is the software backbone needed for hardware scale.
- **Call to Action**: Team STRAND - Ready for Deployment. Thank you.
- **Speaker Notes**: *“For India to become the global AI infrastructure hub, we need software that matches the complexity of the hardware we are building. STRAND is that intelligence layer. Thank you.”*

---

## Visual Assets Checklist
- [ ] **Slide 1**: STRAND Logo in high-resolution, dark theme with Specular Edge UI glow.
- [ ] **Slide 2**: Information Fragmentation graphic (PDFs, Procore, Primavera disjointed).
- [ ] **Slide 3**: High-level Architecture block diagram (Next.js, React Native, FastAPI, Integrations).
- [ ] **Slide 4**: LangGraph Multi-Agent Workflow diagram (Guardian -> Planner -> Scheduler).
- [ ] **Slide 5**: Hybrid GraphRAG split screen (ChromaDB + Neo4j) with AST Cypher lock icon.
- [ ] **Slide 6**: Side-by-side comparison (Messy 1000-page PDF vs. Clean STRAND JSON output).
- [ ] **Slide 7**: Dual device mockup (Web Dashboard and Mobile Offline UI).
- [ ] **Slide 8**: Team photo and high-contrast QR code pointing to GitHub repository.
