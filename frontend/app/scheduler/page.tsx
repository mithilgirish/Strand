"use client";

import React, { useEffect, useState } from 'react';
import R0Gauge from '@/components/scheduler/R0Gauge';
import CriticalPathTimeline, { TaskActivity } from '@/components/scheduler/CriticalPathTimeline';
import MilestoneCard, { Milestone } from '@/components/scheduler/MilestoneCard';
import R0ContagionTree from '@/components/scheduler/R0ContagionTree';
import MitigationPanel from '@/components/scheduler/MitigationPanel';
import { Calendar, AlertCircle } from 'lucide-react';

export default function SchedulerAgent() {
  const [tasks, setTasks] = useState<TaskActivity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [r0Score, setR0Score] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchedulerData() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const [timelineRes, risksRes, r0Res] = await Promise.allSettled([
          fetch(`${apiBase}/api/v1/scheduler/timeline`),
          fetch(`${apiBase}/api/v1/scheduler/milestones`),
          fetch(`${apiBase}/api/v1/scheduler/r0`),
        ]);

        // Fallback dummy data if backend is offline or 404
        const mockTasks: TaskActivity[] = [
          { id: 't1', name: 'Site Prep', startDay: 0, duration: 5, critical: false },
          { id: 't2', name: 'Foundation', startDay: 5, duration: 10, critical: true },
          { id: 't3', name: 'Steel Framing', startDay: 15, duration: 12, critical: true },
          { id: 't4', name: 'Generator Install', startDay: 27, duration: 8, critical: true },
          { id: 't5', name: 'Cooling Setup', startDay: 20, duration: 6, critical: false },
        ];

        const mockMilestones: Milestone[] = [
          { id: 'm1', name: 'Foundation Complete', status: 'completed', plannedDate: '2026-07-01', delayRisk: 0, impactScore: 0 },
          { id: 'm2', name: 'Steel Erected', status: 'in_progress', plannedDate: '2026-07-20', delayRisk: 15, impactScore: 4.5 },
          { id: 'm3', name: 'Generator Operational', status: 'delayed', plannedDate: '2026-08-05', projectedDate: '2026-08-10', delayRisk: 85, impactScore: 9.2 },
          { id: 'm4', name: 'Cooling Live', status: 'pending', plannedDate: '2026-08-12', delayRisk: 30, impactScore: 6.0 },
        ];

        const mockR0 = 2.8;

        // Timeline
        if (timelineRes.status === 'fulfilled' && timelineRes.value.ok) {
          const timelineData = await timelineRes.value.json();
          setTasks(Array.isArray(timelineData) ? timelineData : mockTasks);
        } else {
          setTasks(mockTasks);
        }

        // Milestones from at-risk tasks
        if (risksRes.status === 'fulfilled' && risksRes.value.ok) {
          const milestonesData = await risksRes.value.json();
          setMilestones(Array.isArray(milestonesData) ? milestonesData : mockMilestones);
        } else {
          setMilestones(mockMilestones);
        }

        // R0 score
        if (r0Res.status === 'fulfilled' && r0Res.value.ok) {
          const r0Data = await r0Res.value.json();
          setR0Score(r0Data.score ?? mockR0);
        } else {
          setR0Score(mockR0);
        }

      } catch (err) {
        console.error("Scheduler fetch error:", err);
        setError("Failed to load scheduler data.");
      } finally {
        setLoading(false);
      }
    }

    fetchSchedulerData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[400px] h-full items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-on-surface-variant text-sm font-bold uppercase tracking-wider">Analyzing Critical Path...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center border border-outline-variant">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-on-surface tracking-wide label-caps">
              Scheduler &amp; Delay Analysis
            </h1>
          </div>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            Live critical path monitoring and AI-driven contagion tracking for delay risk mitigation.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            {error} (Using Mock Data)
          </div>
        )}
      </div>

      {/* Top Grid: Timeline + R0 Gauge */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <CriticalPathTimeline data={tasks} />
        </div>
        <div className="xl:col-span-1">
          <R0Gauge score={r0Score} />
        </div>
      </div>

      {/* Bottom Grid: Milestones + Contagion Tree + Mitigations */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Column: Milestones & Tree */}
        <div className="xl:col-span-3 space-y-6">
          {/* Contagion Tree */}
          <div>
            <R0ContagionTree />
          </div>

          {/* Milestone Cards */}
          <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full">
            <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant mb-4 border-b border-[rgba(255,255,255,0.1)] pb-3">
              Key Project Milestones
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {milestones.map((ms) => (
                <MilestoneCard key={ms.id} milestone={ms} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mitigations Sidebar */}
        <div className="xl:col-span-1 h-full">
          <MitigationPanel />
        </div>
        
      </div>
    </div>
  );
}
