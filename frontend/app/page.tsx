"use client";

import React from 'react';
import { Shield, CalendarClock, LayoutDashboard } from 'lucide-react';
import ImmunityScore from '@/components/shared/ImmunityScore';
import StatCard from '@/components/shared/StatCard';
import AgentStatusBadge from '@/components/shared/AgentStatusBadge';
import ViolationCard from '@/components/guardian/ViolationCard';

export default function RiskCockpit() {
  const agents = [
    { name: 'Guardian', status: 'active' as const },
    { name: 'Scheduler', status: 'active' as const },
    { name: 'Oracle', status: 'active' as const },
    { name: 'Inspector', status: 'idle' as const },
    { name: 'Brain', status: 'active' as const },
  ];

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Page Title Header */}
      <div className="mb-6 select-none">
        <h2 className="text-3xl font-black text-on-surface flex items-center gap-3 font-sans tracking-wide">
          <LayoutDashboard className="w-7 h-7 text-primary" />
          RISK COCKPIT
        </h2>
        <p className="text-on-surface-variant mt-1.5 text-sm font-sans tracking-normal">
          Real-time causal project intelligence, compliance tracking, and contagion monitoring.
        </p>
      </div>

      {/* Row 1: KPI Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1">
          <ImmunityScore score={67.5} />
        </div>
        <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Violations Today" value={2} trend="up" color="tertiary" />
          <StatCard label="Open NCRs" value={5} trend="up" color="warning" />
          <StatCard label="At-Risk Shipments" value={3} trend="up" color="tertiary" />
        </div>
      </div>

      {/* Row 2: Agent Status Panel */}
      <div className="bg-surface-container-low border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] p-5 mb-6 flex flex-wrap items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.50)] rounded-lg">
        <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans mr-2 select-none">
          Active Agents Grid:
        </span>
        <div className="flex flex-wrap gap-4">
          {agents.map((agent) => (
            <AgentStatusBadge key={agent.name} name={agent.name} status={agent.status} />
          ))}
        </div>
      </div>

      {/* Row 3: Feeds & Alert Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violation Feed Module */}
        <div className="bg-surface-container-low border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] rounded-lg p-6 shadow-[0_4px_20px_rgba(0,0,0,0.50)]">
          <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans flex items-center gap-2.5 mb-5 select-none border-b border-outline-variant pb-3">
            <Shield className="w-4 h-4 text-primary" />
            Recent Guardian Violations
          </h3>
          <div className="space-y-6">
            <ViolationCard />
          </div>
        </div>

        {/* Scheduler Alerts Module */}
        <div className="bg-surface-container-low border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] rounded-lg p-6 shadow-[0_4px_20px_rgba(0,0,0,0.50)]">
          <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans flex items-center gap-2.5 mb-5 select-none border-b border-outline-variant pb-3">
            <CalendarClock className="w-4 h-4 text-primary" />
            Latest Scheduler Alerts
          </h3>
          
          <div className="bg-[rgba(255,255,255,0.02)] p-5 rounded-md border border-[rgba(255,255,255,0.05)] relative overflow-hidden">
            {/* Warning Alert bar uses rounded-none */}
            <div className="absolute left-0 top-0 w-1.5 h-full bg-yellow-500 rounded-none"></div>
            
            <div className="flex justify-between items-center mb-3.5 pl-3">
              <span className="px-2 py-0.5 rounded-none text-[10px] font-bold tracking-[0.08em] uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                At Risk
              </span>
              <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant font-mono">R0: 2.8</span>
            </div>
            
            <h4 className="font-bold text-on-surface font-sans text-base pl-3">Generator Installation Delay</h4>
            <p className="text-sm text-on-surface-variant font-sans mt-2 mb-5 pl-3 leading-relaxed">
              Delay probability estimated at <span className="text-on-surface font-semibold font-mono">85%</span> due to predecessor cooling tower procurement hold. Downstream cascading risk detected.
            </p>
            
            <div className="pl-3">
              <button className="px-4 py-2 text-xs font-bold rounded-md bg-primary text-on-primary hover:bg-opacity-90 shadow-md border-t border-l border-[rgba(255,255,255,0.20)] border-r border-b border-[rgba(0,0,0,0.40)] transition-all font-sans">
                View Critical Path
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
