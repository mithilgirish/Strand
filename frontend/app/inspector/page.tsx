import { ClipboardCheck, ShieldCheck, Flame, User, Clock } from "lucide-react";

export default function InspectorPage() {
  const ncrs = [
    {
      id: "NCR-4091",
      tag: "GEN-01",
      step: "IST-002",
      severity: "Critical",
      r0: 4.2,
      raisedBy: "field_eng_nair",
      time: "3 hours ago",
      desc: "Measured generator fuel consumption reads 285 l/hr under full load check, exceeding contract specification (limit: 260 l/hr limit)."
    },
    {
      id: "NCR-3982",
      tag: "UPS-02",
      step: "IST-014",
      severity: "Major",
      r0: 2.2,
      raisedBy: "qc_lead_sharma",
      time: "Yesterday",
      desc: "Battery backup cell battery resistance readings exceed standard threshold limits (§7.4.2)."
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-cyan-400" />
          Inspector Agent Commissioning Dashboard
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Reviewing Non-Conformance Reports (NCRs) logged from native mobile apps on site.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Active NCR List */}
        <div className="lg:col-span-2 bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Open Field Non-Conformances</h3>
          
          <div className="space-y-4">
            {ncrs.map((ncr) => (
              <div key={ncr.id} className="p-5 rounded-xl bg-[#0F0F24]/50 border border-[#1E1E38] hover:border-slate-800 transition-all space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-cyan-400">{ncr.id}</span>
                    <span className="text-xs text-slate-500 font-bold">•</span>
                    <span className="text-xs text-slate-300 font-bold uppercase">{ncr.tag} ({ncr.step})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      ncr.severity === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    } border`}>
                      {ncr.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-red-400 font-extrabold px-2 py-0.5 rounded bg-red-500/5 border border-red-500/10">
                      R0: {ncr.r0}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  "{ncr.desc}"
                </p>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> Logged by: {ncr.raisedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ncr.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Commissioning Status Statistics */}
        <div className="space-y-6">
          <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Verification Statistics</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0F0F24] border border-[#1E1E38] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Verification Rate</span>
                  <span className="text-lg font-black text-slate-300">91.3%</span>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0F0F24] border border-[#1E1E38] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Cascaded Rework Threat</span>
                  <span className="text-lg font-black text-red-400">₹5.2 Crore</span>
                </div>
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <Flame className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
