import { ShieldCheck, Calendar, Globe, Sparkles, Mic, Workflow, Scale, LayoutGrid } from "lucide-react";

export default function AgentsPage() {
  const agents = [
    {
      name: "Guardian Agent",
      role: "Specification Compliance & OCR Ingestion",
      icon: ShieldCheck,
      inputs: "PDF cut-sheets, engineering submittals, vendor drawings",
      outputs: "Spec-DNA nodes, violation alerts, automated RFI drafts",
      desc: "Performs OCR on engineering submittals, matches parameters against tender requirements using regex & NER, computes R0 contagion impact, and drafts formal RFIs.",
    },
    {
      name: "Scheduler Agent",
      role: "CPM Network & Delay Propagation",
      icon: Calendar,
      inputs: "Primavera P6 schedule CSV, active submittal deviations",
      outputs: "Critical path analysis, task delay probabilities, R0 risk ranking",
      desc: "Builds a directed acyclic task graph (DAG), simulates Critical Path Method (CPM), calculates R0 infection scores, and recommends schedule compression buffers.",
    },
    {
      name: "Oracle Agent",
      role: "Supply Chain Risk & Vendor Benchmarking",
      icon: Globe,
      inputs: "Active equipment shipments, GPS coordinates, weather/geopolitical feeds",
      outputs: "GeoJSON transit maps, supplier risk scores, fallback vendor rankings",
      desc: "Monitors global logistics lanes, predicts port delays, and evaluates alternative suppliers across lead time, cost variance, and historical defect rates.",
    },
    {
      name: "Brain Agent",
      role: "Hybrid GraphRAG Intelligence",
      icon: Sparkles,
      inputs: "Natural language questions from engineers and project managers",
      outputs: "Grounded answers with exact document citations and 1-hop BIM relationships",
      desc: "Fuses BM25 keyword matching with dense vector retrieval using Reciprocal Rank Fusion (RRF), enriched by 1-hop Neo4j BIM graph traversal.",
    },
    {
      name: "Inspector Agent",
      role: "Multimodal Voice Commissioning",
      icon: Mic,
      inputs: "Field audio voice notes, photo evidence, checklist verifications",
      outputs: "Structured Commissioning NCRs, offline sync queue, As-Built Markdown",
      desc: "Enables field engineers to speak checklist verifications on-site, transcribe voice notes into structured Non-Conformance Reports (NCRs), and sync offline.",
    },
    {
      name: "Planner Agent",
      role: "Strategic Mitigation & HITL Gate",
      icon: Workflow,
      inputs: "Multi-agent findings, open NCRs, schedule delay alerts",
      outputs: "Executive mitigation plans, pending HITL approval items",
      desc: "Synthesizes multi-agent findings into comprehensive recovery action plans. Enforces Human-in-the-Loop (HITL) approval gates before executing write operations.",
    },
    {
      name: "Judge Agent",
      role: "Grounding Grader & Anti-Hallucination",
      icon: Scale,
      inputs: "Generated LLM answers, raw source document chunks",
      outputs: "Grounding confidence scores, compliance sign-offs",
      desc: "Acts as an independent verifier that checks whether all claims made by other agents are factually grounded in raw ingested PDF chunks.",
    },
    {
      name: "Dashboard Agent",
      role: "Natural Cypher Widget Generator",
      icon: LayoutGrid,
      inputs: "User natural language requests ('Show me all open NCRs by vendor')",
      outputs: "AST-sanitized read-only Cypher queries, interactive dashboard widgets",
      desc: "Generates custom visual widgets on the fly by converting user prompts into safe read-only Cypher queries.",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Multi-Agent Architecture</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">The 8-Agent Ensemble</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          Detailed breakdown of every specialized AI agent in the STRAND LangGraph ensemble.
        </p>
      </div>

      <div className="space-y-6">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.name} className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-white/5 border border-white/10 text-[#4edea3]">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{agent.name}</h3>
                  <span className="label-caps text-[#a3a3a3] text-[10px]">{agent.role}</span>
                </div>
              </div>

              <p className="text-xs text-[#a3a3a3] leading-relaxed">{agent.desc}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2">
                <div className="bg-black/50 p-3 rounded border border-white/5 space-y-1">
                  <span className="label-caps text-[#a3a3a3] text-[9px]">Inputs</span>
                  <p className="text-white/80">{agent.inputs}</p>
                </div>
                <div className="bg-black/50 p-3 rounded border border-white/5 space-y-1">
                  <span className="label-caps text-[#4edea3] text-[9px]">Outputs</span>
                  <p className="text-white/80">{agent.outputs}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
