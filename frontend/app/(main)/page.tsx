"use client";

import React, { useEffect, useState } from 'react';
import { Shield, CalendarClock, LayoutDashboard, Loader2 } from 'lucide-react';
import ImmunityScore from '@/components/shared/ImmunityScore';
import StatCard from '@/components/shared/StatCard';
import AgentStatusBadge from '@/components/shared/AgentStatusBadge';
import ViolationCard from '@/components/guardian/ViolationCard';
import type { GuardianViolation } from '@/components/guardian/types';
import type { SchedulerRisk } from '@/components/scheduler/types';

interface ProjectSummary {
  immunityScore: number;
  violationsToday: number;
  openNCRs: number;
  atRiskShipments: number;
  criticalR0Max: number;
}

interface SchedulerAlert {
  taskId: string;
  taskName: string;
  severity: string;
  r0Score: number;
  delayProbability: number;
  discipline: string;
}

export default function RiskCockpit() {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [violations, setViolations] = useState<GuardianViolation[]>([]);
  const [topAlert, setTopAlert] = useState<SchedulerAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([
    { name: 'Guardian', status: 'active' as const },
    { name: 'Scheduler', status: 'active' as const },
    { name: 'Oracle', status: 'active' as const },
    { name: 'Inspector', status: 'idle' as const },
    { name: 'Brain', status: 'active' as const },
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // Fetch from real APIs with graceful fallback
        const [summaryRes, violationsRes, schedulerRes] = await Promise.allSettled([
          fetch(`${apiBase}/api/v1/project/summary`),
          fetch(`${apiBase}/api/v1/guardian/violations`),
          fetch(`${apiBase}/api/v1/scheduler/risks`),
        ]);

        // Project Summary
        let summaryData: ProjectSummary | null = null;
        if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
          const raw = await summaryRes.value.json();
          summaryData = {
            immunityScore: raw.immunity_score ?? 67.5,
            violationsToday: raw.violations_today ?? 2,
            openNCRs: raw.open_ncrs ?? 5,
            atRiskShipments: raw.at_risk_shipments ?? 3,
            criticalR0Max: raw.critical_r0_max ?? 4.2,
          };

          // Update agent statuses from API
          if (raw.agents) {
            setAgents([
              { name: 'Guardian', status: raw.agents.guardian === 'active' ? 'active' : 'idle' },
              { name: 'Scheduler', status: raw.agents.scheduler === 'active' ? 'active' : 'idle' },
              { name: 'Oracle', status: raw.agents.oracle === 'active' ? 'active' : 'idle' },
              { name: 'Inspector', status: raw.agents.inspector === 'active' ? 'active' : 'idle' },
              { name: 'Brain', status: raw.agents.brain === 'active' ? 'active' : 'idle' },
            ]);
          }
        }

        setSummary(summaryData || {
          immunityScore: 67.5,
          violationsToday: 2,
          openNCRs: 5,
          atRiskShipments: 3,
          criticalR0Max: 4.2,
        });

        // Guardian Violations
        if (violationsRes.status === 'fulfilled' && violationsRes.value.ok) {
          const violData = await violationsRes.value.json();
          const viols = violData.violations || violData;
          setViolations(Array.isArray(viols) ? viols : []);
        } else {
          setViolations([
            {
              id: 'DEMO-CT-01:ambient_temperature_max',
              submittal_id: 'DEMO-CT-01',
              parameter: 'ambient_temperature_max',
              required: 50,
              actual: 45,
              unit: '°C',
              section: '6.7.1',
              r0_score: 3.0,
              severity: 'Critical',
            }
          ]);
        }

        // Scheduler top alert
        if (schedulerRes.status === 'fulfilled' && schedulerRes.value.ok) {
          const schedData = await schedulerRes.value.json();
          const atRiskTasks = (schedData.at_risk_tasks || []) as SchedulerRisk[];
          if (atRiskTasks.length > 0) {
            const top = atRiskTasks.reduce((highest, candidate) =>
              highest.r0_score > candidate.r0_score ? highest : candidate
            );
            setTopAlert({
              taskId: top.task_id,
              taskName: top.task_name || top.task_id,
              severity: top.severity || 'Critical',
              r0Score: top.r0_score || 0,
              delayProbability: Math.round((top.delay_probability || 0) * 100),
              discipline: top.discipline || '',
            });
          }
        }

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Page Title Header */}
      <div className="mb-6 select-none flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-on-surface flex items-center gap-3 font-sans tracking-wide">
            <LayoutDashboard className="w-7 h-7 text-primary" />
            RISK COCKPIT
          </h2>
          <p className="text-on-surface-variant mt-1.5 text-sm font-sans tracking-normal">
            Real-time causal project intelligence, compliance tracking, and contagion monitoring.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-primary text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            SYNCING LIVE DATA
          </div>
        )}
      </div>

      {/* Row 1: KPI Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1">
          <ImmunityScore score={summary?.immunityScore ?? 0} />
        </div>
        <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Violations Today" value={summary?.violationsToday || 0} trend="up" color="tertiary" />
          <StatCard label="Open NCRs" value={summary?.openNCRs || 0} trend="up" color="warning" />
          <StatCard label="At-Risk Shipments" value={summary?.atRiskShipments || 0} trend="up" color="tertiary" />
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
          <div className="flex justify-between items-center mb-5 border-b border-outline-variant pb-3">
            <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans flex items-center gap-2.5 select-none">
              <Shield className="w-4 h-4 text-primary" />
              Recent Guardian Violations
            </h3>
            <span className="text-[10px] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-wider">
              Live Feed
            </span>
          </div>
          
          <div className="space-y-6">
            {violations.map((violation) => (
              <ViolationCard key={violation.id} violation={violation} />
            ))}
            {violations.length === 0 && !loading && (
              <div className="text-center py-8 text-on-surface-variant">
                No recent violations detected.
              </div>
            )}
          </div>
        </div>

        {/* Scheduler Alerts Module */}
        <div className="bg-surface-container-low border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] rounded-lg p-6 shadow-[0_4px_20px_rgba(0,0,0,0.50)]">
          <div className="flex justify-between items-center mb-5 border-b border-outline-variant pb-3">
            <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans flex items-center gap-2.5 select-none">
              <CalendarClock className="w-4 h-4 text-primary" />
              Latest Scheduler Alerts
            </h3>
            <span className="text-[10px] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-wider">
              Live Feed
            </span>
          </div>
          
          <div className="bg-[rgba(255,255,255,0.02)] p-5 rounded-md border border-[rgba(255,255,255,0.05)] relative overflow-hidden">
            {/* Warning Alert bar uses rounded-none */}
            <div className={`absolute left-0 top-0 w-1.5 h-full rounded-none ${
              topAlert && topAlert.r0Score >= 5.0 ? 'bg-red-500' :
              topAlert && topAlert.r0Score >= 2.5 ? 'bg-yellow-500' :
              'bg-yellow-500'
            }`}></div>
            
            <div className="flex justify-between items-center mb-3.5 pl-3">
              <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold tracking-[0.08em] uppercase border ${
                topAlert?.severity === 'Critical' || topAlert?.severity === 'Systemic'
                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
              }`}>
                {topAlert?.severity || 'At Risk'}
              </span>
              <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant font-mono">
                R0: {topAlert?.r0Score?.toFixed(1) || summary?.criticalR0Max?.toFixed(1) || '2.8'}
              </span>
            </div>
            
            <h4 className="font-bold text-on-surface font-sans text-base pl-3">
              {topAlert?.taskName || 'Generator Installation Delay'}
            </h4>
            <p className="text-sm text-on-surface-variant font-sans mt-2 mb-5 pl-3 leading-relaxed">
              Delay probability estimated at <span className="text-on-surface font-semibold font-mono">
                {topAlert ? `${topAlert.delayProbability}%` : '85%'}
              </span> {topAlert?.discipline ? `in ${topAlert.discipline} discipline.` : 'due to predecessor cooling tower procurement hold.'} Downstream cascading risk detected.
            </p>
            
            <div className="pl-3">
              <a href="/scheduler" className="px-4 py-2 text-xs font-bold rounded-md bg-primary text-on-primary hover:bg-opacity-90 shadow-md border-t border-l border-[rgba(255,255,255,0.20)] border-r border-b border-[rgba(0,0,0,0.40)] transition-all font-sans inline-block">
                View Critical Path
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
