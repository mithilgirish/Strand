import { MapPin, Globe, Server, AlertCircle, ArrowUpRight } from "lucide-react";

export default function OraclePage() {
  const shipments = [
    { id: "SHP-001", tag: "CT-01", status: "Kolkata Port Congestion", delay: "12 Days", supplier: "Schneider India", risk: "high" },
    { id: "SHP-002", tag: "ATS-02", status: "Customs Clearance - Delhi", delay: "5 Days", supplier: "Vertiv Solutions", risk: "medium" }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Globe className="w-7 h-7 text-cyan-400" />
          Oracle Agent Supply Chain Intelligence
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Tracking Tier-1/2/3 shipment milestones and identifying fallback procurement paths.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mock Leaflet Map Box */}
        <div className="lg:col-span-2 bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 h-[450px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-center z-10">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Transit Map (India centered)</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0A0A16] border border-[#1E1E38] text-slate-400">
              Active Map Overlay
            </span>
          </div>

          {/* Map Abstract Background Art representing India region */}
          <div className="absolute inset-0 bg-[#070712] flex items-center justify-center">
            {/* Visual placeholder of supply network graph */}
            <div className="w-[80%] h-[70%] border border-cyan-500/10 rounded-full flex items-center justify-center relative">
              <div className="absolute w-[60%] h-[60%] border border-cyan-500/10 rounded-full flex items-center justify-center">
                <div className="absolute w-4 h-4 rounded-full bg-cyan-500 animate-pulse shadow-lg shadow-cyan-500/40"></div>
              </div>
              <div className="absolute top-10 left-20 flex items-center gap-2 bg-[#0E0E1F]/90 border border-red-500/40 rounded-lg p-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="font-bold text-slate-200">Kolkata (SHP-001 Delayed)</span>
              </div>
              <div className="absolute bottom-20 right-20 flex items-center gap-2 bg-[#0E0E1F]/90 border border-cyan-500/20 rounded-lg p-2 text-xs">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200">Bengaluru Site HQ</span>
              </div>
            </div>
          </div>
          
          <div className="z-10 bg-[#0A0A16]/90 border border-[#1E1E38] rounded-xl p-4 text-xs max-w-sm">
            <p className="font-bold text-slate-300">GeoJSON Tracking Status:</p>
            <p className="text-slate-400 mt-1">10 shipment feeds online. 3 flagged at critical nodes (Ports, Customs checkpoints).</p>
          </div>
        </div>

        {/* Alternative Suppliers Panel */}
        <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Alternative Suppliers Lookup</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0F0F24] border border-[#1E1E38] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Equipment</span>
                    <span className="text-xs font-extrabold text-slate-300">CT-01 (Cooling Tower)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    94% Fit
                  </span>
                </div>
                <div className="text-xs">
                  <p className="text-slate-400 font-bold">Voltas India Ltd.</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Location: Pune (In-state dispatch: 48h)</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0F0F24] border border-[#1E1E38] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Equipment</span>
                    <span className="text-xs font-extrabold text-slate-300">ATS-02 (ATS Switch)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    89% Fit
                  </span>
                </div>
                <div className="text-xs">
                  <p className="text-slate-400 font-bold">ABB India Automation</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Location: Chennai (In-state dispatch: 72h)</p>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full py-3.5 bg-slate-900 border border-[#1E1E38] hover:border-slate-800 text-slate-300 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
            Query Alternative Pathways <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
