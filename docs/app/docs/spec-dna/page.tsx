import { Fingerprint, CheckCircle2, Shield } from "lucide-react";
import SpecDnaSimulator from "@/components/SpecDnaSimulator";

export default function SpecDnaPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Core Technology</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">Spec-DNA Cryptographic Lineage</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          How deterministic SHA-256 fingerprinting creates an unforgeable chain of custody from tender contract clauses to vendor submittals.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">The Spec-DNA Formula</h2>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          Every requirement in STRAND receives a 16-character deterministic SHA-256 hash upon ingestion. It serves as the primary key across the entire Project Knowledge Graph (PKG).
        </p>

        <div className="code-box p-4 rounded-lg text-xs font-mono text-[#4edea3] leading-relaxed">
          Spec_DNA = SHA256(JSON.stringify(&#123; param, section, source, value &#125;)).substring(0, 16)
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">The 4-Hop Cryptographic Chain</h2>
        <div className="space-y-3 font-mono text-xs">
          <div className="glass-panel p-3.5 rounded-lg flex items-center justify-between">
            <span className="text-white font-bold">1. Contract Clause (Doc &sect;)</span>
            <span className="text-[#a3a3a3]">spec_tia942.pdf &sect;6.7.1</span>
          </div>
          <div className="text-center text-[#4edea3]">&darr; DERIVES_FROM</div>
          <div className="glass-panel p-3.5 rounded-lg flex items-center justify-between">
            <span className="text-white font-bold">2. Bill of Quantities (BOQ)</span>
            <span className="text-[#a3a3a3]">Line Item #402: Cooling Tower</span>
          </div>
          <div className="text-center text-[#4edea3]">&darr; DERIVES_FROM</div>
          <div className="glass-panel p-3.5 rounded-lg flex items-center justify-between">
            <span className="text-white font-bold">3. Purchase Order (PO)</span>
            <span className="text-[#a3a3a3]">PO-88301 Carrier Enterprise</span>
          </div>
          <div className="text-center text-[#4edea3]">&darr; AUDITED_AGAINST</div>
          <div className="glass-panel p-3.5 rounded-lg flex items-center justify-between border border-[#4edea3]/30">
            <span className="text-white font-bold">4. Vendor Submittal Cut-Sheet</span>
            <span className="text-[#4edea3] font-bold">45&deg;C (Spec: 50&deg;C &rarr; VIOLATION)</span>
          </div>
        </div>
      </div>

      {/* Live Simulator */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-white">Try It in Real-Time</h2>
        <SpecDnaSimulator />
      </div>
    </div>
  );
}
