import { 
  ShieldAlert, 
  ClipboardAlert, 
  Ship, 
  Flame, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const kpis = [
    { title: "Violations Today", value: "2", subtitle: "1 Critical, 1 Minor", icon: ShieldAlert, color: "text-red-400 bg-red-500/10 border-red-500/20" },
    { title: "Open NCRs", value: "5", subtitle: "2 in review, 3 active", icon: ClipboardAlert, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { title: "At-Risk Shipments", value: "3", subtitle: "Critical delays at port", icon: Ship, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    { title: "Max R0 Score", value: "4.2", subtitle: "Moderate cascade risk", icon: Flame, color: "text-red-500 bg-red-600/10 border-red-600/20" },
  ];

  const alerts = [
    {
      id: "alt-001",
      agent: "Guardian",
      type: "Violation",
      title: "Cooling Tower Operating Temp Deviation",
      desc: "SUB-CT-01 reads 45°C operating capacity, violating contract clause Section 6.7.1 (requires 50°C).",
      time: "12 mins ago",
      impact: "Critical (R0: 4.2)"
    },
    {
      id: "alt-002",
      agent: "Scheduler",
      type: "Delay Risk",
      title: "Task T047 Delayed Predecessors",
      desc: "ATS delivery delay is propagating to Integrated System Testing (IST) scheduling.",
      time: "1 hour ago",
      impact: "Major (R0: 3.1)"
    },
    {
      id: "alt-003",
      agent: "Inspector",
      type: "Field NCR",
      title: "GEN-01 Fuel Consumption NCR-4091",
      desc: "Inspector logged 285 l/hr fuel consumption under load, exceeding limit (260 l/hr limit).",
      time: "3 hours ago",
      impact: "Critical (R0: 4.2)"
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-slate-900 via-[#0F0F28] to-slate-900 border border-[#1E1E38] rounded-2xl p-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            STRAND Construction Intelligence Cockpit
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Analyzing 15 spec requirements, 40 supply chains, and 100 schedule activities.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0A0A16] px-4 py-2 border border-[#1E1E38] rounded-xl text-xs font-semibold text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          PKG Causal Graph Synced
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col justify-between hover:border-slate-800 transition-all duration-200">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-400 tracking-wide">{kpi.title}</span>
                <div className={`p-2.5 rounded-xl border ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-100 tracking-tight">{kpi.value}</span>
                <p className="text-xs text-slate-500 font-semibold mt-1">{kpi.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Immunity Score and Real-time Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Immunity Index */}
        <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider mb-4">Project Immunity Index</h3>
            
            <div className="flex flex-col items-center py-6">
              {/* Simulated Circular Gauge */}
              <div className="relative w-44 h-44 rounded-full border-[10px] border-slate-900 border-t-[#06B6D4] border-r-[#10B981] flex items-center justify-center shadow-lg shadow-cyan-500/5">
                <div className="text-center">
                  <span className="text-4xl font-extrabold text-slate-100">78.5</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">HEALTH SCORE</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <TrendingUp className="w-4 h-4" />
                +2.4% vs last commissioning phase
              </div>
            </div>
          </div>

          <div className="border-t border-[#1E1E38] pt-4 mt-4 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Spec Alignment Rate:</span>
              <span className="text-slate-300">93.3% (14/15 verified)</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Supply Chain Stability:</span>
              <span className="text-slate-300">89.4% (3 delayed)</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Commissioning Status:</span>
              <span className="text-slate-300">91.3% (21/23 complete)</span>
            </div>
          </div>
        </div>

        {/* Right Col: Live Causal Risk Stream */}
        <div className="lg:col-span-2 bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-md font-bold text-slate-100 uppercase tracking-wider">Causal Violation Feed</h3>
            <span className="text-xs text-cyan-400 font-bold cursor-pointer hover:underline flex items-center gap-1">
              Filter Active Only <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 rounded-xl bg-[#0F0F24]/60 border border-[#1E1E38] flex gap-4 hover:border-slate-800 transition-all">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    alert.agent === "Guardian" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    alert.agent === "Scheduler" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}>
                    {alert.agent.charAt(0)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold mt-2 uppercase">{alert.agent}</span>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-200">{alert.title}</h4>
                    <span className="text-xs text-red-400 font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-500/5 border border-red-500/10">
                      {alert.impact}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {alert.desc}
                  </p>
                  <div className="flex justify-between items-center mt-3 text-[10px] text-slate-500 font-semibold">
                    <span>ID: {alert.id.toUpperCase()}</span>
                    <span>{alert.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
