"use client";

import { useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Wrench } from "lucide-react";
import type { SchedulerMitigation, SchedulerRisk } from "./types";

export default function MitigationPanel({ risk, mitigations }: { risk: SchedulerRisk | null; mitigations: SchedulerMitigation[] }) {
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const relevant = risk
    ? mitigations.filter((mitigation) => mitigation.task_id === risk.task_id)
    : [];

  async function apply(mitigation: SchedulerMitigation) {
    setApplying(mitigation.task_id);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/v1/scheduler/apply-mitigation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: mitigation.task_id, mitigation_action: mitigation.mitigation_action }),
      });
      if (!response.ok) throw new Error(`Mitigation returned ${response.status}`);
      const data = await response.json() as { mitigation_id: string };
      setApplied(data.mitigation_id);
    } catch {
      setError("Mitigation could not be applied.");
    } finally {
      setApplying(null);
    }
  }

  return (
    <section className="h-full min-h-[300px] border border-white/10 bg-surface-container-low p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase text-on-surface-variant"><Lightbulb className="h-4 w-4 text-primary" />Recovery action</h3>
        {risk && <span className="font-mono text-[10px] text-primary">{risk.task_id}</span>}
      </div>
      {risk && <div className="mb-4 border-l-2 border-red-500 bg-red-500/5 p-3"><p className="text-sm font-bold text-on-surface">{risk.task_name}</p><p className="mt-1 text-xs text-on-surface-variant">{Math.round(risk.delay_probability * 100)}% delay probability · {risk.downstream_count} downstream tasks</p></div>}
      {!risk && <p className="py-10 text-center text-xs text-on-surface-variant">No mitigation selected.</p>}
      {error && <p className="mb-3 border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {applied && <div className="mb-3 flex items-center gap-2 border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-300"><CheckCircle2 className="h-4 w-4" />{applied} applied</div>}
      <div className="space-y-3">
        {relevant.map((mitigation) => (
          <article key={`${mitigation.task_id}-${mitigation.mitigation_action}`} className="border border-white/10 bg-white/[0.025] p-4">
            <p className="text-sm font-bold leading-snug text-on-surface">{mitigation.mitigation_action}</p>
            <div className="my-3 flex justify-between border-y border-white/5 py-2 text-[10px] text-on-surface-variant"><span>{mitigation.responsible_party}</span><span>{mitigation.deadline_hours}h target</span></div>
            <button type="button" onClick={() => void apply(mitigation)} disabled={applying !== null || applied !== null} className="flex w-full items-center justify-center gap-2 bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50">{applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}Apply mitigation</button>
          </article>
        ))}
      </div>
    </section>
  );
}
