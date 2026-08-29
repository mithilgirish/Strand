import { Activity, AlertTriangle, CheckCircle } from "lucide-react";
import R0Simulator from "@/components/R0Simulator";

export default function R0EnginePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#ffb3ad]">Core Technology</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">R₀ Schedule Contagion Engine</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          Adapting epidemiological basic reproduction number ($R_0$) to quantify schedule infection risk across the critical path.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">The Contagion Formula</h2>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          When a vendor delivers equipment with non-compliant specs or late shipments, how many downstream milestone tasks are infected?
        </p>

        <div className="code-box p-4 rounded-lg text-xs font-mono text-white leading-relaxed">
          <span className="text-[#a3a3a3]">// Canonical Contagion Formula</span><br />
          <span className="text-[#4edea3]">R0_contagion</span> = (downstream_tasks + 2 * critical_path_tasks) / 10.0<br /><br />
          <span className="text-[#a3a3a3]">// Engineering Variance Magnitude</span><br />
          <span className="text-[#4edea3]">R0_engineering</span> = min(10.0, deviation_ratio * 28.0 * parameter_criticality)<br /><br />
          <span className="text-[#a3a3a3]">// Combined Composite Score</span><br />
          <span className="text-[#ffb3ad]">R0_final</span> = (0.40 * R0_contagion) + (0.60 * R0_engineering)
        </div>
      </div>

      {/* Severity Thresholds */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Severity Thresholds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="glass-panel p-4 rounded-lg space-y-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#4edea3] font-bold">R₀ &lt; 1.0</span>
            <div className="font-bold text-white mt-1">Contained (Low Risk)</div>
            <p className="text-[#a3a3a3]">Failure does not propagate to critical milestones.</p>
          </div>
          <div className="glass-panel p-4 rounded-lg space-y-1">
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">1.0 &le; R₀ &lt; 2.0</span>
            <div className="font-bold text-white mt-1">Moderate Risk</div>
            <p className="text-[#a3a3a3]">Infects immediate successor tasks; buffer is consumed.</p>
          </div>
          <div className="glass-panel p-4 rounded-lg space-y-1">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">R₀ &ge; 2.0</span>
            <div className="font-bold text-white mt-1">Systemic Critical Alert</div>
            <p className="text-[#a3a3a3]">Super-spreader event; delays Energization / Commissioning.</p>
          </div>
        </div>
      </div>

      {/* Live Simulator */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-white">Try the Contagion Simulator</h2>
        <R0Simulator />
      </div>
    </div>
  );
}
