import { Calendar, AlertTriangle, Layers, TrendingDown, RefreshCw } from "lucide-react";

export default function SchedulerPage() {
  const atRiskTasks = [
    { id: "T023", name: "Install Cooling Tower Fan System", r0: 4.2, status: "delayed", reason: "Submittal Temp Deviation" },
    { id: "T047", name: "Integrated System Test (IST) Dry Runs", r0: 3.1, status: "at_risk", reason: "ATS delay propagation" },
    { id: "T078", name: "Backup Generator Fuel Synchronization", r0: 4.2, status: "delayed", reason: "Flow consumption NCR" }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-amber-400" />
          Scheduler Agent Causal Dependency Engine
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Forecasting delay risks and critical path impacts through NetworkX CPM cascades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cascade R0 Gauge Dial */}
        <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Max Contagion Rate (R0)</h3>
            
            <div className="flex flex-col items-center py-6">
              <div className="relative w-40 h-40 rounded-full border-[10px] border-slate-900 border-t-red-500 border-r-amber-500 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl font-black text-slate-100">4.2</span>
                  <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest mt-1">CRITICAL RISK</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-400 text-center mt-6 px-4 leading-relaxed">
                An R0 of 4.2 indicates that a delay in any critical equipment submittal will infect up to 4 downstream commissioning activities.
              </p>
            </div>
          </div>

          <div className="bg-[#0A0A16]/50 border border-[#1E1E38] rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Critical Path Task Drift:</span>
              <span className="text-amber-400 font-bold">+72 Hours</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Delay Cascade Probability:</span>
              <span className="text-slate-300 font-bold">81.5%</span>
            </div>
          </div>
        </div>

        {/* Infected Tasks Table */}
        <div className="lg:col-span-2 bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Propagation Target Queue</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E1E38] text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pb-2">
                  <th className="pb-3">Task ID</th>
                  <th className="pb-3">Activity Description</th>
                  <th className="pb-3 text-center">R0 Impact</th>
                  <th className="pb-3">Causal Factor</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E38] text-xs font-semibold text-slate-300">
                {atRiskTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-900/10">
                    <td className="py-4 text-cyan-400 font-bold">{task.id}</td>
                    <td className="py-4 text-slate-200">{task.name}</td>
                    <td className="py-4 text-center font-bold text-red-400">{task.r0}</td>
                    <td className="py-4 text-slate-500">{task.reason}</td>
                    <td className="py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        task.status === "delayed" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      } border`}>
                        {task.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
