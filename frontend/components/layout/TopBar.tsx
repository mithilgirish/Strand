"use client";

import { usePathname } from "next/navigation";
import { ShieldCheck, Server, AlertCircle } from "lucide-react";

export default function TopBar() {
  const pathname = usePathname();

  // Helper to format pathname to title
  const getPageTitle = () => {
    if (pathname === "/") return "Risk Cockpit";
    const path = pathname.substring(1);
    return path.charAt(0).toUpperCase() + path.slice(1) + " Control";
  };

  const agents = [
    { name: "Guardian", status: "active" },
    { name: "Scheduler", status: "active" },
    { name: "Oracle", status: "active" },
    { name: "Inspector", status: "idle" },
    { name: "Brain", status: "active" },
  ];

  return (
    <header className="h-16 border-b border-[#1E1E38] bg-[#0E0E1F] px-6 flex items-center justify-between text-slate-100 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <h1 className="font-extrabold text-lg tracking-wide text-slate-100">{getPageTitle()}</h1>
        <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
          Live Feed
        </div>
      </div>

      {/* Agents Status Bar */}
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-4 bg-[#0A0A16]/50 border border-[#1E1E38] rounded-xl px-4 py-1.5">
          <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Agent Grid:</span>
          <div className="flex items-center gap-3">
            {agents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {agent.status === "active" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    agent.status === "active" ? "bg-emerald-500" : "bg-slate-600"
                  }`}></span>
                </span>
                <span className="text-xs font-semibold text-slate-400">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Project Health summary indicator */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-cyan-500/30 rounded-xl px-4 py-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-400">Immunity Score:</span>
          <span className="text-xs font-extrabold text-cyan-400">78.5%</span>
        </div>
      </div>
    </header>
  );
}
