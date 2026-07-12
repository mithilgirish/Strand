"use client";

import { Activity, AlertTriangle, ArrowRight } from "lucide-react";
import type { SchedulerRisk, TaskActivity } from "./types";

export default function R0ContagionTree({ risk, tasks }: { risk: SchedulerRisk | null; tasks: TaskActivity[] }) {
  const names = new Map(tasks.map((task) => [task.id, task.name]));
  const downstream = risk?.downstream_task_ids.slice(0, 6) ?? [];
  return (
    <section className="overflow-hidden border border-white/10 bg-surface-container-low p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase text-on-surface-variant"><Activity className="h-4 w-4 text-primary" />Downstream exposure</h3>
        {risk && <span className="font-mono text-[10px] text-on-surface-variant">{risk.downstream_count} tasks exposed</span>}
      </div>
      {!risk && <p className="py-8 text-center text-xs text-on-surface-variant">No active schedule risk.</p>}
      {risk && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <div className="w-48 shrink-0 border border-red-500/30 bg-red-500/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-red-400"><AlertTriangle className="h-4 w-4" />Source risk</div>
            <p className="text-sm font-bold text-on-surface">{risk.task_name}</p>
            <p className="mt-2 font-mono text-xs text-red-300">R0 {risk.r0_score.toFixed(1)}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
          <div className="grid min-w-[520px] grid-cols-3 gap-2">
            {downstream.map((taskId, index) => (
              <div key={taskId} className="border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="font-mono text-[10px] text-amber-400">+{index + 1} hop</p>
                <p className="mt-1 truncate text-xs font-semibold text-on-surface">{names.get(taskId) ?? taskId}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
