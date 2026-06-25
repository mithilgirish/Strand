import { ShieldAlert, UploadCloud, FileText, ArrowRight, Check } from "lucide-react";

export default function GuardianPage() {
  const violations = [
    {
      id: "v-01",
      param: "ambient_temperature_max",
      expected: "50°C",
      actual: "45°C",
      section: "6.7.1",
      unit: "°C",
      status: "critical",
      impact: "Tier III cooling compliance fail under peak load"
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-red-400" />
          Guardian Agent Compliance Auditor
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Verifying equipment submittals against parametric constraints mapped in the PKG.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Zone & Param List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Upload Document Submittal</h3>
            
            <div className="border border-dashed border-[#1E1E38] hover:border-cyan-500/40 rounded-xl p-8 flex flex-col items-center justify-center bg-[#0A0A16]/40 cursor-pointer transition-all">
              <UploadCloud className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-sm font-bold text-slate-200">Drag & drop shop drawing or datasheet PDF here</p>
              <p className="text-xs text-slate-500 mt-1">Supports PDF, JSON, CSV formats up to 30MB</p>
            </div>
          </div>

          <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Detected Spec Deviations</h3>
            
            <div className="space-y-4">
              {violations.map((v) => (
                <div key={v.id} className="p-5 rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                        CRITICAL VIOLATION
                      </span>
                      <span className="text-xs text-slate-400 font-bold">Clause §{v.section}</span>
                    </div>
                    <h4 className="text-md font-bold text-slate-100 uppercase tracking-wide">{v.param.replace(/_/g, ' ')}</h4>
                    <p className="text-xs text-slate-400">{v.impact}</p>
                  </div>

                  <div className="flex gap-6 items-center">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Spec Limit</span>
                      <span className="text-md font-extrabold text-slate-300">{v.expected}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Actual Read</span>
                      <span className="text-md font-extrabold text-red-400">{v.actual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RFI Draft Panel */}
        <div className="bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col justify-between h-[500px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">RFI Draft Assistant</h3>
              <FileText className="w-5 h-5 text-slate-500" />
            </div>

            <div className="bg-[#0A0A16]/50 rounded-xl p-4 border border-[#1E1E38] text-xs font-mono text-slate-400 leading-relaxed overflow-y-auto h-[340px]">
              <p className="font-bold text-slate-200">To: Schneider Engineering Services</p>
              <p className="font-bold text-slate-200">Subject: Deviation RFI - Cooling Tower Maximum Ambient Temperature</p>
              <br />
              <p>Reference: shop drawing submittal #SUB-CT-01.</p>
              <br />
              <p>During the review of the cooling tower datasheet, maximum operating temperature capability was flagged at 45°C. Contract clause Section 6.7.1 requires compliance with maximum design conditions up to 50°C to guarantee Tier III operational continuity.</p>
              <br />
              <p>Please submit alternative configurations or verification of operation up to 50°C within 5 business days.</p>
            </div>
          </div>

          <button className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-[#0A0A16] font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-500/15 transition-all">
            <Check className="w-4 h-4 stroke-[3]" /> Approve & Transmit RFI
          </button>
        </div>

      </div>
    </div>
  );
}
