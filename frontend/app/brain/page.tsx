import { MessageSquare, Send, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";

export default function BrainPage() {
  const messages = [
    {
      id: "msg-1",
      sender: "user",
      text: "What are the fire suppression requirements for the UPS room?",
      time: "10:32 AM"
    },
    {
      id: "msg-2",
      sender: "brain",
      text: "According to TIA-942 specifications, fire suppression inside UPS rooms exceeding 500kVA capacity must utilize clean agent systems (such as FM-200 or Novec 1230) rather than standard water-based sprinklers to protect electrical integrity.",
      time: "10:32 AM",
      confidence: "High",
      citations: [
        { doc: "spec_tia942_synthetic.pdf", clause: "§7.4.2", page: 47 }
      ]
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-cyan-400" />
          Brain Agent Project Assistant
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Ask natural language questions to inspect contract specifications, schedule CPM links, and active field NCRs with citations.
        </p>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-[#13132B]/60 border border-[#1E1E38] rounded-2xl p-6 flex flex-col justify-between overflow-hidden my-4">
        {/* Messages Scroll Area */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-xl p-4 rounded-2xl ${
                msg.sender === "user" 
                  ? "bg-cyan-500/10 text-cyan-200 border border-cyan-500/20 rounded-tr-sm" 
                  : "bg-[#0F0F24]/75 text-slate-300 border border-[#1E1E38] rounded-tl-sm"
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                
                {/* Citations and Confidence for Agent Response */}
                {msg.sender === "brain" && (
                  <div className="border-t border-[#1E1E38] pt-3 mt-3 space-y-2">
                    {/* Confidence Rating Badge */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Confidence:</span>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase">{msg.confidence}</span>
                      </div>
                    </div>

                    {/* Citations Pill list */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Citations:</span>
                      {msg.citations.map((cit, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold cursor-pointer hover:bg-cyan-900/10 transition-colors">
                          <BookOpen className="w-3 h-3" />
                          <span>{cit.doc} (Clause {cit.clause}, p. {cit.page})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-[#1E1E38] pt-4 mt-4">
          <div className="flex gap-3 bg-[#0A0A16]/50 border border-[#1E1E38] rounded-xl p-2 items-center">
            <input
              type="text"
              placeholder="Ask a question about the project specs (e.g. UPS room fire suppression)"
              className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 text-sm text-slate-200 px-3 outline-none"
            />
            <button className="p-2.5 bg-cyan-500 rounded-lg text-[#0A0A16] hover:bg-cyan-400 transition-colors">
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
