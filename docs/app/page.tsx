import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, 
  Terminal, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight,
  Bot,
  Scale,
  Calendar,
  Globe,
  Mic,
  Workflow,
  LayoutGrid,
  FileCode2,
  Lock
} from "lucide-react";
import SpecDnaSimulator from "@/components/SpecDnaSimulator";
import R0Simulator from "@/components/R0Simulator";

export default function LandingPage() {
  const agents = [
    { name: "Guardian", role: "Spec Compliance", icon: ShieldCheck, desc: "PDF OCR ingestion, Spec-DNA audit, R₀ calculation, and automatic RFI drafting." },
    { name: "Scheduler", role: "CPM & Contagion", icon: Calendar, desc: "Critical Path Method simulation, delay probability forecasting, and schedule risk alerts." },
    { name: "Oracle", role: "Supply Chain AI", icon: Globe, desc: "Monitors equipment transit, geopolitical risk, and benchmarks pre-qualified alternative vendors." },
    { name: "Brain", role: "Hybrid GraphRAG", icon: Sparkles, desc: "BM25 + Dense vector retrieval (RRF fusion) combined with 1-hop Neo4j BIM graph traversal." },
    { name: "Inspector", role: "Field Voice QA", icon: Mic, desc: "Voice-driven field commissioning checklists, offline-first sync, and automatic NCR generation." },
    { name: "Planner", role: "HITL Orchestrator", icon: Workflow, desc: "Synthesizes multi-agent mitigation plans with strict human-in-the-loop approval gates." },
    { name: "Judge", role: "Grounding Grader", icon: Scale, desc: "Grades LLM outputs against raw ingested PDF chunks to eliminate hallucinations." },
    { name: "Dashboard", role: "Natural Cypher", icon: LayoutGrid, desc: "Translates natural language to sandboxed read-only AST Cypher queries for custom UI widgets." },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10 pb-24 space-y-24">
      
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto">
        <div className="relative group max-w-3xl mx-auto">
          <img
            src="/images/strand-banner.png"
            alt="STRAND Banner"
            className="w-full rounded-2xl shadow-2xl border border-white/10 mx-auto"
          />
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#a3a3a3] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
            Open-Source Autonomous Construction Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Autonomous Intelligence for Hyperscale Infrastructure
          </h1>
          <p className="text-base md:text-lg text-[#a3a3a3] max-w-2xl mx-auto leading-relaxed">
            Multi-agent engineering platform that automates specification compliance verification, schedule risk contagion modeling, and critical-path delay prevention.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/docs/quickstart"
            className="px-6 py-3 rounded-md bg-white text-black font-bold text-sm hover:bg-neutral-200 transition shadow-lg flex items-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            <span>Get Started with Docker</span>
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 rounded-md glass-panel text-white font-bold text-sm hover:bg-white/5 transition flex items-center gap-2"
          >
            <span>Explore Documentation</span>
            <ArrowRight className="w-4 h-4 text-[#4edea3]" />
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 text-left">
          <div className="glass-panel p-4 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">Lineage Tracing</span>
            <div className="text-lg font-bold font-mono text-white mt-1">Spec-DNA</div>
            <span className="text-xs text-[#4edea3] mt-1 block">SHA-256 Hash Chains</span>
          </div>
          <div className="glass-panel p-4 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">Schedule Contagion</span>
            <div className="text-lg font-bold font-mono text-white mt-1">R₀ Engine</div>
            <span className="text-xs text-[#a3a3a3] mt-1 block">Schedule Delay Physics</span>
          </div>
          <div className="glass-panel p-4 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">Multi-Agent Graph</span>
            <div className="text-lg font-bold font-mono text-white mt-1">8 Agents</div>
            <span className="text-xs text-[#4edea3] mt-1 block">LangGraph State Machine</span>
          </div>
          <div className="glass-panel p-4 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">Knowledge Layer</span>
            <div className="text-lg font-bold font-mono text-white mt-1">Neo4j + Chroma</div>
            <span className="text-xs text-[#a3a3a3] mt-1 block">Hybrid GraphRAG</span>
          </div>
        </div>
      </section>

      {/* Interactive Simulators Section */}
      <section className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <span className="label-caps text-[#4edea3]">Interactive Engines</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">Live Technical Playgrounds</h2>
          <p className="text-sm text-[#a3a3a3] mt-1">Test the deterministic algorithms powering STRAND directly in your browser.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SpecDnaSimulator />
          <R0Simulator />
        </div>
      </section>

      {/* 8 AI Agents Grid */}
      <section className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <span className="label-caps text-[#4edea3]">Multi-Agent Architecture</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">The 8-Agent Ensemble</h2>
          <p className="text-sm text-[#a3a3a3] mt-1">Specialized autonomous agents operating with deterministic tool policies and Human-in-the-Loop (HITL) approval gates.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div key={agent.name} className="glass-panel p-5 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-white/5 border border-white/10 text-[#4edea3]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{agent.name}</h3>
                    <span className="label-caps text-[#a3a3a3] text-[10px]">{agent.role}</span>
                  </div>
                </div>
                <p className="text-xs text-[#a3a3a3] leading-relaxed">{agent.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quickstart Callout */}
      <section className="glass-panel p-8 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="label-caps text-[#4edea3]">Ready to deploy?</span>
            <h2 className="text-2xl font-bold text-white mt-1">Spin up the complete 4-service stack</h2>
            <p className="text-sm text-[#a3a3a3] mt-1">Includes FastAPI backend, Next.js frontend, Neo4j Graph DB, and Redis caching.</p>
          </div>
          <Link
            href="/docs/quickstart"
            className="px-5 py-2.5 rounded-md bg-[#4edea3] text-black font-bold text-xs hover:bg-[#4edea3]/90 transition shrink-0"
          >
            View Quickstart Guide
          </Link>
        </div>

        <div className="code-box p-4 rounded-lg text-xs text-white overflow-x-auto">
          <code>
            <span className="text-[#a3a3a3]"># Clone & spin up with Docker Compose</span><br />
            <span className="text-[#4edea3]">git clone</span> https://github.com/mithilgirish/Strand.git<br />
            <span className="text-[#4edea3]">cd</span> Strand &amp;&amp; <span className="text-[#4edea3]">cp</span> backend/.env.example backend/.env<br />
            <span className="text-[#4edea3]">docker compose up</span>
          </code>
        </div>
      </section>

    </div>
  );
}
