"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Calendar, RefreshCw } from "lucide-react";
import CriticalPathTimeline from "@/components/scheduler/CriticalPathTimeline";
import MilestoneCard, { type Milestone } from "@/components/scheduler/MilestoneCard";
import MitigationPanel from "@/components/scheduler/MitigationPanel";
import R0ContagionTree from "@/components/scheduler/R0ContagionTree";
import R0Gauge from "@/components/scheduler/R0Gauge";
import type { SchedulerMitigation, SchedulerRisk, TaskActivity } from "@/components/scheduler/types";

interface RisksResponse {
  at_risk_tasks: SchedulerRisk[];
  mitigations: SchedulerMitigation[];
}

export default function SchedulerAgent() {
  const [tasks, setTasks] = useState<TaskActivity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<SchedulerRisk[]>([]);
  const [mitigations, setMitigations] = useState<SchedulerMitigation[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<SchedulerRisk | null>(null);
  const [r0Score, setR0Score] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const [timelineResponse, milestonesResponse, r0Response, risksResponse] = await Promise.all([
          fetch(`${apiBase}/api/v1/scheduler/timeline`, { signal: controller.signal }),
          fetch(`${apiBase}/api/v1/scheduler/milestones`, { signal: controller.signal }),
          fetch(`${apiBase}/api/v1/scheduler/r0`, { signal: controller.signal }),
          fetch(`${apiBase}/api/v1/scheduler/risks`, { signal: controller.signal }),
        ]);
        if (![timelineResponse, milestonesResponse, r0Response, risksResponse].every((response) => response.ok)) {
          throw new Error("A scheduler endpoint failed");
        }
        const [timelineData, milestoneData, r0Data, riskData] = await Promise.all([
          timelineResponse.json() as Promise<TaskActivity[]>,
          milestonesResponse.json() as Promise<Milestone[]>,
          r0Response.json() as Promise<{ score: number }>,
          risksResponse.json() as Promise<RisksResponse>,
        ]);
        const timelineById = new Map(timelineData.map((task) => [task.id, task]));
        setTasks(
          riskData.at_risk_tasks
            .map((risk) => timelineById.get(risk.task_id))
            .filter((task): task is TaskActivity => Boolean(task))
            .slice(0, 12)
            .map((task) => ({ ...task, name: `${task.id} · ${task.name}` })),
        );
        setMilestones(milestoneData.slice(0, 6));
        setRisks(riskData.at_risk_tasks);
        setMitigations(riskData.mitigations);
        setR0Score(r0Data.score);
        setSelectedRisk(riskData.at_risk_tasks[0] ?? null);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") setError("Scheduler intelligence is unavailable.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div><h1 className="flex items-center gap-3 text-2xl font-black text-on-surface"><Calendar className="h-6 w-6 text-primary" />Schedule Risk Control</h1><p className="mt-1 text-sm text-on-surface-variant">Critical-path exposure and downstream delay containment.</p></div>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-on-surface hover:bg-white/10"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh analysis</button>
      </header>

      {error && <div className="flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}</div>}
      {loading && <div className="grid min-h-[420px] place-items-center text-sm text-on-surface-variant">Calculating schedule contagion...</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_280px]"><CriticalPathTimeline data={tasks} /><R0Gauge score={r0Score} /></div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_360px]">
            <div className="space-y-5">
              <R0ContagionTree risk={selectedRisk} tasks={tasks} />
              <section className="border border-white/10 bg-surface-container-low p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3"><h3 className="text-[11px] font-bold uppercase text-on-surface-variant">Priority schedule risks</h3><span className="font-mono text-[10px] text-on-surface-variant">{risks.length} active</span></div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {milestones.map((milestone) => <MilestoneCard key={milestone.id} milestone={milestone} selected={selectedRisk?.task_id === milestone.id} onSelect={() => setSelectedRisk(risks.find((risk) => risk.task_id === milestone.id) ?? null)} />)}
                </div>
              </section>
            </div>
            <MitigationPanel risk={selectedRisk} mitigations={mitigations} />
          </div>
        </>
      )}
    </div>
  );
}
