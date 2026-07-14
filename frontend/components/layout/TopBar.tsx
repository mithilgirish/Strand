"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

type AgentStatus = "active" | "idle";

interface ProjectSummary {
  immunity_score: number;
  agents: Record<string, AgentStatus>;
}

export default function TopBar() {
  const pathname = usePathname();
  const [immunityScore, setImmunityScore] = useState<number | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});

  useEffect(() => {
    const controller = new AbortController();
    async function loadSummary() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/api/v1/project/summary`, { signal: controller.signal });
        if (!response.ok) return;
        const summary = await response.json() as ProjectSummary;
        setImmunityScore(summary.immunity_score);
        setAgentStatuses(summary.agents);
      } catch {
        // The header keeps its neutral loading state if the API is unavailable.
      }
    }
    void loadSummary();
    return () => controller.abort();
  }, []);

  // Helper to format pathname to title
  const getPageTitle = () => {
    if (pathname === "/") return "Risk Cockpit";
    const path = pathname.substring(1);
    return path.charAt(0).toUpperCase() + path.slice(1) + " Control";
  };

  const agents = ["Guardian", "Scheduler", "Oracle", "Inspector", "Brain"].map((name) => ({
    name,
    status: agentStatuses[name.toLowerCase()] ?? "idle",
  }));

  return (
    <header className="h-16 min-w-0 border-b border-outline-variant bg-surface-container-lowest px-3 sm:px-6 flex items-center justify-between gap-2 text-on-surface sticky top-0 z-10">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="max-w-[112px] truncate font-bold text-sm tracking-wide text-on-surface label-caps sm:max-w-none sm:text-lg">{getPageTitle()}</h1>
        <div className="hidden shrink-0 rounded-full border border-[rgba(78,222,163,0.2)] bg-[rgba(78,222,163,0.1)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary min-[360px]:block">
          Live Feed
        </div>
      </div>

      {/* Agents Status Bar */}
      <div className="flex min-w-0 items-center gap-2 lg:gap-6">
        <div className="hidden xl:flex items-center gap-4 bg-surface border border-outline-variant rounded-md px-4 py-1.5">
          <span className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">Agent Grid:</span>
          <div className="flex items-center gap-3">
            {agents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {agent.status === "active" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    agent.status === "active" ? "bg-secondary drop-shadow-[0_0_6px_rgba(78,222,163,0.50)]" : "bg-outline"
                  }`}></span>
                </span>
                <span className="text-xs font-semibold text-on-surface-variant mono-data uppercase">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Project Health summary indicator */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-[rgba(229,229,229,0.30)] bg-[rgba(229,229,229,0.05)] px-2 py-1.5 shadow-[0_0_12px_rgba(229,229,229,0.10)] sm:gap-2 sm:px-4">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="hidden text-xs font-bold text-on-surface-variant label-caps min-[360px]:inline sm:hidden">Score:</span>
          <span className="hidden text-xs font-bold text-on-surface-variant label-caps sm:inline">Immunity Score:</span>
          <span className="text-sm font-extrabold text-primary mono-data">{immunityScore === null ? "--" : `${immunityScore.toFixed(1)}%`}</span>
        </div>
      </div>
    </header>
  );
}
