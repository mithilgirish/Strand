"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type AgentStatus = "active" | "idle" | "degraded";

interface ProjectSummary {
  immunity_score: number;
  agents: Record<string, string>;
  demo_mode?: boolean;
}

export default function TopBar() {
  const pathname = usePathname();
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSummary() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/api/v1/project/summary`, { signal: controller.signal });
        if (!response.ok) return;
        const summary = await response.json() as ProjectSummary;
        setAgentStatuses(summary.agents as Record<string, AgentStatus>);
        setDemoMode(Boolean(summary.demo_mode));
      } catch {
        // The header keeps its neutral loading state if the API is unavailable.
      }
    }
    async function loadUserSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, role')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            setUserRole(profile.role);
            setTenantName(profile.tenant_id);
          }
        }
      } catch (e) {
        console.error("Failed to load user session for topbar", e);
      }
    }

    void loadSummary();
    void loadUserSession();
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
        {demoMode && (
          <span className="hidden sm:inline-flex rounded-md border border-amber-400/50 bg-amber-400/15 px-2 py-1 text-[10px] font-bold tracking-[0.08em] uppercase text-amber-200">
            DEMO
          </span>
        )}
        <h1 className="max-w-[112px] truncate font-bold text-sm tracking-wide text-on-surface label-caps sm:max-w-none sm:text-lg">{getPageTitle()}</h1>

      </div>

      {/* Agents Status Bar */}
      <div className="flex min-w-0 items-center gap-2 lg:gap-6">
        {/* Tenant & Role Profile Badge */}
        {tenantName && (
          <div className="hidden lg:flex items-center gap-3 bg-surface border border-outline-variant rounded-md px-4 py-1.5 ml-auto">
            <div className="flex flex-col">
              <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Tenant</span>
              <span className="text-[11px] text-primary font-mono font-semibold">{tenantName}</span>
            </div>
            <div className="w-px h-5 bg-outline-variant opacity-50"></div>
            <div className="flex flex-col">
              <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Role</span>
              <span className="text-[11px] text-secondary font-mono font-semibold uppercase">{userRole}</span>
            </div>
          </div>
        )}

        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowAgentDetails(!showAgentDetails)}
            className="hidden md:flex items-center gap-3 bg-surface border border-outline-variant rounded-md px-3 py-1.5 hover:bg-surface-container transition-colors cursor-pointer focus:outline-none" 
            title="Click for Agent Details"
          >
            <span className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Grid:</span>
            <div className="flex items-center gap-1.5">
              {agents.map((agent) => (
                <div 
                  key={agent.name} 
                  className="relative flex h-2.5 w-2.5" 
                >
                  {agent.status === "active" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    agent.status === "active" ? "bg-secondary drop-shadow-[0_0_6px_rgba(78,222,163,0.50)]" : "bg-outline"
                  }`}></span>
                </div>
              ))}
            </div>
          </button>

          {/* Expanded Dropdown */}
          {showAgentDetails && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-outline-variant rounded-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] z-50 py-2">
              <div className="px-3 pb-2 border-b border-outline-variant/50 mb-2">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Agent System Status</span>
              </div>
              <div className="flex flex-col gap-1 px-1">
                {agents.map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between px-3 py-1.5 rounded-sm hover:bg-surface-container transition-colors cursor-default">
                    <span className="text-xs font-semibold text-primary mono-data uppercase">{agent.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${agent.status === 'active' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                        {agent.status}
                      </span>
                      <span className={`relative flex h-2 w-2 rounded-full ${
                        agent.status === "active" ? "bg-secondary drop-shadow-[0_0_6px_rgba(78,222,163,0.50)]" : "bg-outline"
                      }`}></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
