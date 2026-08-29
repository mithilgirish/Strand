"use client";

import { useState } from "react";
import { Activity } from "lucide-react";

export default function R0Simulator() {
  const [downstream, setDownstream] = useState(12);
  const [critical, setCritical] = useState(4);
  const [gap, setGap] = useState(15);

  const contagion = Math.min(10.0, (downstream + 2 * critical) / 10.0);
  const engineering = Math.min(10.0, (gap / 100.0) * 28.0 * 0.85);
  const combined = Math.min(10.0, 0.4 * contagion + 0.6 * engineering);
  const finalR0 = combined.toFixed(1);

  const isCritical = combined >= 2.0;
  const isModerate = combined >= 1.0 && combined < 2.0;

  return (
    <div className="glass-panel p-6 rounded-xl space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#ffb3ad]" />
          <h3 className="font-bold text-white text-sm">R₀ Schedule Contagion Simulator</h3>
        </div>
        <span className="label-caps px-2 py-0.5 rounded bg-[#ffb3ad]/10 text-[#ffb3ad] border border-[#ffb3ad]/20 text-[10px]">
          Schedule Risk Physics
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-semibold text-[#a3a3a3] mb-1">
            <span>Downstream Tasks Blocked</span>
            <span className="font-mono text-white">{downstream} tasks</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={downstream}
            onChange={(e) => setDownstream(parseInt(e.target.value))}
            className="w-full accent-[#4edea3]"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-[#a3a3a3] mb-1">
            <span>Critical Path Blockers (2x Weight)</span>
            <span className="font-mono text-white">{critical} tasks</span>
          </div>
          <input
            type="range"
            min="0"
            max="15"
            value={critical}
            onChange={(e) => setCritical(parseInt(e.target.value))}
            className="w-full accent-[#ffb3ad]"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-[#a3a3a3] mb-1">
            <span>Submittal Deviation Gap</span>
            <span className="font-mono text-white">{gap}% miss</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={gap}
            onChange={(e) => setGap(parseInt(e.target.value))}
            className="w-full accent-white"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-black/80 border border-white/10 grid grid-cols-2 gap-4 items-center">
        <div>
          <span className="label-caps text-[#a3a3a3]">Contagion Score (R₀)</span>
          <div
            className={`text-3xl font-black font-mono mt-1 ${
              isCritical ? "text-red-400" : isModerate ? "text-yellow-400" : "text-[#4edea3]"
            }`}
          >
            {finalR0}
          </div>
        </div>
        <div className="text-right">
          <span className="label-caps text-[#a3a3a3]">Project Impact</span>
          <div
            className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono uppercase mt-1 ${
              isCritical
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : isModerate
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-emerald-500/20 text-[#4edea3] border border-emerald-500/30"
            }`}
          >
            {isCritical ? "Critical Alert" : isModerate ? "Moderate Risk" : "Contained (OK)"}
          </div>
        </div>
      </div>
    </div>
  );
}
