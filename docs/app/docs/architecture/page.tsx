import { Layers, ShieldCheck, Database, Cpu, Check } from "lucide-react";

export default function ArchitecturePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Technical Deep Dive</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">System Architecture</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          How the 8-agent LangGraph state machine, Neo4j Project Knowledge Graph (PKG), and Hybrid GraphRAG coordinate.
        </p>
      </div>

      {/* Layer Diagram */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#4edea3]" />
          <span>High-Level Infrastructure Architecture</span>
        </h3>

        <div className="code-box p-4 rounded-lg text-xs text-[#4edea3] leading-relaxed font-mono overflow-x-auto">
          <pre>{`┌─────────────────────────────────────────────────────────────────┐
│       Next.js 16 Web Dashboard    │  React Native Expo App      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / JWT (Supabase JWKS)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│      FastAPI Gateway · AST Cypher Sanitizer · Rate Limiter      │
└────────────────┬─────────────────────────────┬──────────────────┘
                 │                             │
┌────────────────┴──────────┐    ┌─────────────┴────────────────┐
│  LangGraph Agent Ensemble  │    │    Persistence Layer         │
│  8 Agents · HITL Gate     │    │  Neo4j · ChromaDB · Redis    │
└───────────────────────────┘    └──────────────────────────────┘`}</pre>
        </div>
      </div>

      {/* AST Cypher Sanitizer */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#4edea3]" />
          <span>AST Cypher Security Sandbox</span>
        </h2>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          Because STRAND allows natural language queries to generate dynamic Neo4j Cypher statements, standard regex filtering is insufficient. STRAND parses all LLM-generated Cypher into an Abstract Syntax Tree (AST).
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="glass-panel p-4 rounded-lg space-y-1">
            <div className="font-bold text-white">Mutation Blocking</div>
            <p className="text-[#a3a3a3]">Blocks <code className="text-red-400">CREATE</code>, <code className="text-red-400">MERGE</code>, <code className="text-red-400">DELETE</code>, <code className="text-red-400">SET</code> on read routes.</p>
          </div>
          <div className="glass-panel p-4 rounded-lg space-y-1">
            <div className="font-bold text-white">Tenant Injection</div>
            <p className="text-[#a3a3a3]">Automatically injects <code className="text-[#4edea3]">tenant_id</code> into MATCH clauses for isolation.</p>
          </div>
          <div className="glass-panel p-4 rounded-lg space-y-1">
            <div className="font-bold text-white">APOC / System Sandboxing</div>
            <p className="text-[#a3a3a3]">Blocks system procedures, file loads, and arbitrary code execution.</p>
          </div>
        </div>
      </div>

      {/* Hybrid GraphRAG */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-[#4edea3]" />
          <span>Hybrid GraphRAG (BM25 + Dense + Neo4j)</span>
        </h2>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          Brain Agent fuses lexical keyword matching (BM25) with semantic dense vector search (Chroma all-MiniLM-L6-v2) using Reciprocal Rank Fusion (RRF, k=60).
        </p>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          When retrieved chunks correspond to PKG entities with <code className="text-[#4edea3]">DERIVES_FROM</code> lineage, STRAND traverses the 1-hop BIM graph neighborhood to answer questions about downstream equipment that pure vector RAG cannot find.
        </p>
      </div>
    </div>
  );
}
