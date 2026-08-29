import Link from "next/link";
import { ArrowRight, Terminal, Layers, Fingerprint, Activity, ShieldCheck } from "lucide-react";

export default function DocsOverviewPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Documentation</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">STRAND Overview</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          STRAND is an open-source multi-agent AI platform built specifically for hyperscale infrastructure engineering (data centers, semiconductor fabs, mission-critical energy plants).
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">The Core Industry Problem</h2>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          In large-scale infrastructure projects, engineering specifications change continuously. Vendor submittals arrive weeks later with subtle non-compliant deviations (e.g. ambient operating temperatures, UPS redundancy configurations, floor loading capacities).
        </p>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          Human engineers miss these variances until equipment lands on-site, triggering cascading critical-path delays that cost millions per day.
        </p>
      </div>

      {/* Core Innovation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/docs/spec-dna" className="glass-panel p-5 rounded-lg space-y-2.5 hover:bg-white/5 transition block group">
          <div className="flex items-center justify-between">
            <Fingerprint className="w-5 h-5 text-[#4edea3]" />
            <ArrowRight className="w-4 h-4 text-[#a3a3a3] group-hover:text-white transition" />
          </div>
          <h3 className="font-bold text-white text-sm">Spec-DNA Fingerprinting</h3>
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            Deterministic cryptographic SHA-256 hash chains linking engineering clauses to submittal data for zero hallucination.
          </p>
        </Link>

        <Link href="/docs/r0-engine" className="glass-panel p-5 rounded-lg space-y-2.5 hover:bg-white/5 transition block group">
          <div className="flex items-center justify-between">
            <Activity className="w-5 h-5 text-[#ffb3ad]" />
            <ArrowRight className="w-4 h-4 text-[#a3a3a3] group-hover:text-white transition" />
          </div>
          <h3 className="font-bold text-white text-sm">R₀ Contagion Engine</h3>
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            Mathematical model adapting epidemiological $R_0$ to predict how single component failures cascade across construction schedules.
          </p>
        </Link>

        <Link href="/docs/architecture" className="glass-panel p-5 rounded-lg space-y-2.5 hover:bg-white/5 transition block group">
          <div className="flex items-center justify-between">
            <Layers className="w-5 h-5 text-[#4edea3]" />
            <ArrowRight className="w-4 h-4 text-[#a3a3a3] group-hover:text-white transition" />
          </div>
          <h3 className="font-bold text-white text-sm">AST Cypher Sandbox</h3>
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            AST parser that enforces read-only query safety and tenant isolation on all LLM-generated graph operations.
          </p>
        </Link>

        <Link href="/docs/agents" className="glass-panel p-5 rounded-lg space-y-2.5 hover:bg-white/5 transition block group">
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-[#4edea3]" />
            <ArrowRight className="w-4 h-4 text-[#a3a3a3] group-hover:text-white transition" />
          </div>
          <h3 className="font-bold text-white text-sm">8 AI Agent Ensemble</h3>
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            Specialized agents coordinated by LangGraph with human-in-the-loop (HITL) approval gates for database mutations.
          </p>
        </Link>
      </div>

      <div className="glass-panel p-6 rounded-xl space-y-4">
        <h3 className="font-bold text-white">Next Steps</h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/docs/quickstart"
            className="px-4 py-2 rounded bg-white text-black font-bold text-xs hover:bg-neutral-200 transition"
          >
            Follow the Quickstart
          </Link>
          <Link
            href="/docs/architecture"
            className="px-4 py-2 rounded glass-panel text-white font-bold text-xs hover:bg-white/10 transition"
          >
            Read Technical Architecture
          </Link>
        </div>
      </div>
    </div>
  );
}
