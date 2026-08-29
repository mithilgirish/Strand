import { 
  ShieldCheck, 
  Calendar, 
  Globe, 
  Mic, 
  Sparkles, 
  Workflow, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Upload, 
  Check, 
  AlertTriangle 
} from "lucide-react";

export default function HowToUsePage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">User Guide & Workflows</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">How to Use STRAND</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          Step-by-step practical guides for engineers, commissioning agents, and project managers using STRAND on hyperscale construction projects.
        </p>
      </div>

      {/* Workflow 1: Guardian Spec Audit */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-white/5 border border-white/10 text-[#4edea3]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">1. Auditing Vendor Submittals (Guardian Agent)</h2>
            <span className="label-caps text-[#a3a3a3] text-[10px]">Zero-Hallucination Spec Compliance</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl space-y-4">
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            When a contractor or vendor submits equipment cut-sheets (e.g. chillers, generators, UPS systems), Guardian reads the PDF, extracts operating parameters, and checks them against ingested project specifications.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="bg-black/50 p-4 rounded-lg border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-sans font-bold">
                <span className="w-5 h-5 rounded-full bg-[#4edea3]/20 text-[#4edea3] flex items-center justify-center text-xs">A</span>
                <span>Upload Vendor Cut-Sheet PDF</span>
              </div>
              <p className="text-xs text-[#a3a3a3] font-sans">
                Navigate to the <strong>Guardian</strong> tab in the web console. Drag and drop the vendor PDF submittal.
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-lg border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-sans font-bold">
                <span className="w-5 h-5 rounded-full bg-[#4edea3]/20 text-[#4edea3] flex items-center justify-center text-xs">B</span>
                <span>Automated Parameter Audit & Spec-DNA Hashing</span>
              </div>
              <p className="text-xs text-[#a3a3a3] font-sans">
                Guardian extracts key specs (e.g. ambient temperature = 45&deg;C) and compares against the project basis (TIA-942-B requirement = 50&deg;C).
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-lg border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-sans font-bold">
                <span className="w-5 h-5 rounded-full bg-[#4edea3]/20 text-[#4edea3] flex items-center justify-center text-xs">C</span>
                <span>Instant RFI Generation & R₀ Impact</span>
              </div>
              <p className="text-xs text-[#a3a3a3] font-sans">
                If a deviation is found, Guardian flags the violation, computes the R₀ contagion score, and prepares a formal RFI draft for human sign-off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow 2: Scheduler Contagion */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-white/5 border border-white/10 text-[#4edea3]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">2. Monitoring Critical Path Risk (Scheduler Agent)</h2>
            <span className="label-caps text-[#a3a3a3] text-[10px]">Dynamic Delay Containment</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl space-y-4">
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            The Scheduler Agent continuously monitors the 100+ task master schedule graph, identifying which milestones are at risk of cascading delay.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-black/50 p-3.5 rounded border border-white/5 space-y-1">
              <div className="text-[#ffb3ad] font-bold">High R₀ Alerts (R₀ &ge; 2.0)</div>
              <p className="text-xs text-[#a3a3a3] font-sans">
                Indicates super-spreader delay risks that will infect critical milestone dates (e.g. Energization, Ready for Service).
              </p>
            </div>
            <div className="bg-black/50 p-3.5 rounded border border-white/5 space-y-1">
              <div className="text-[#4edea3] font-bold">Recommended Mitigations</div>
              <p className="text-xs text-[#a3a3a3] font-sans">
                Provides actionable schedule compressions: fast-tracking pre-commissioning, parallel cable pulls, or dual-sourcing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow 3: Field Voice Commissioning */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-white/5 border border-white/10 text-[#4edea3]">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">3. Field Voice Commissioning (Inspector Agent)</h2>
            <span className="label-caps text-[#a3a3a3] text-[10px]">Offline-First Mobile QA</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl space-y-4">
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            Field commissioning engineers on-site use the React Native mobile app or web console to execute Level 1 through Level 5 commissioning checklists.
          </p>

          <div className="space-y-2 text-xs text-[#a3a3a3]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4edea3] shrink-0 mt-0.5" />
              <span><strong>Voice NCR Ingestion:</strong> Speak observations directly (e.g. <em>"Generator fuel day tank valve failed pressure test at 3.5 bar"</em>).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4edea3] shrink-0 mt-0.5" />
              <span><strong>Offline Edge Resilience:</strong> If connectivity drops in the data hall, observations are cached locally and synchronized when reconnecting.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4edea3] shrink-0 mt-0.5" />
              <span><strong>As-Built Generation:</strong> Upon checklist completion, STRAND automatically compiles a formal As-Built markdown and PDF record.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow 4: Brain GraphRAG */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-white/5 border border-white/10 text-[#4edea3]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">4. Project Intelligence Queries (Brain Agent)</h2>
            <span className="label-caps text-[#a3a3a3] text-[10px]">Grounded Multi-Modal QA</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl space-y-4">
          <p className="text-xs text-[#a3a3a3] leading-relaxed">
            Ask complex engineering questions across all ingested tender documents, submittals, RFIs, and NCRs:
          </p>

          <div className="code-box p-3.5 rounded text-xs font-mono text-white space-y-1.5">
            <span className="text-[#a3a3a3]">// Sample Brain Questions</span><br />
            <span className="text-[#4edea3]">&gt;</span> "What fire suppression system is required for UPS rooms exceeding 500 kVA?"<br />
            <span className="text-[#4edea3]">&gt;</span> "Which open NCRs currently threaten the Substation Energization milestone?"<br />
            <span className="text-[#4edea3]">&gt;</span> "Show me the Spec-DNA lineage for Chiller Unit CH-01."
          </div>
        </div>
      </section>

    </div>
  );
}
