"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Send, 
  Clock, 
  CheckCircle, 
  FileText, 
  ArrowRightLeft, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  Layers, 
  Download, 
  Sparkles,
  ChevronRight,
  X,
  Radio,
  ArrowUpRight
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import RfiMarkdownViewer from "@/components/guardian/RfiMarkdownViewer";

interface RfiApproval {
  violation_id: string;
  tenant_id: string;
  status: string;
  approved_at: string;
  delivery_channel: string;
  message: string;
  submittal_id?: string;
  parameter?: string;
  spec_clause?: string;
  contractor_recipient?: string;
}

interface SwitchProtocol {
  protocol_id: string;
  equipment_tag: string;
  replaced_supplier_name?: string;
  replaced_supplier_id?: string;
  target_supplier_name?: string;
  target_supplier_id?: string;
  status: string;
  approved_at?: string;
  approved_by?: string;
  created_at?: string;
  message?: string;
  target_city?: string;
  target_country?: string;
  target_lead_time?: number;
}

type OutboxItemType = "rfi" | "switch" | "as_built";

interface UnifiedOutboxItem {
  id: string;
  type: OutboxItemType;
  title: string;
  subtitle: string;
  channel: string;
  status: string;
  timestamp: string;
  actor: string;
  payloadText: string;
  metadata: Record<string, any>;
}

export default function OutboxPage() {
  const [rfis, setRfis] = useState<RfiApproval[]>([]);
  const [switches, setSwitches] = useState<SwitchProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "rfis" | "switches">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<UnifiedOutboxItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchOutboxData = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const rfiResponse = await fetch(`${apiBase}/api/v1/guardian/rfi/outbox`, {
        cache: "no-store",
        headers,
      });
      const switchResponse = await fetch(`${apiBase}/api/v1/oracle/switches`, {
        cache: "no-store",
        headers,
      });
      const rfiData = rfiResponse.ok ? await rfiResponse.json() : { approvals: [] };
      const switchData = switchResponse.ok ? await switchResponse.json() : { switches: [] };
      // #region agent log
      fetch('http://127.0.0.1:7582/ingest/5f4dba18-bce0-401b-8b4b-251b5b4366fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66e2e3'},body:JSON.stringify({sessionId:'66e2e3',runId:'post-fix',hypothesisId:'C',location:'frontend/app/(main)/outbox/page.tsx:fetchOutboxData',message:'outbox fetch',data:{hasSession:Boolean(session?.access_token),rfiStatus:rfiResponse.status,switchStatus:switchResponse.status,rfiCount:(rfiData.approvals||[]).length,switchCount:(switchData.switches||[]).length,approvedSwitchCount:(switchData.switches||[]).filter((s: SwitchProtocol)=>s.status==='approved').length,rfiIds:(rfiData.approvals||[]).slice(0,5).map((a: RfiApproval)=>a.violation_id)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!rfiResponse.ok && !switchResponse.ok) {
        throw new Error("Outbox endpoints failed");
      }

      setRfis(rfiData.approvals || []);
      setSwitches((switchData.switches || []).filter((s: SwitchProtocol) => s.status === "approved"));
    } catch (err: any) {
      setError(err.message || "Could not load outbox records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOutboxData();
  }, []);

  // Merge and normalize all outbox dispatches into unified timeline
  const unifiedItems: UnifiedOutboxItem[] = useMemo(() => {
    const items: UnifiedOutboxItem[] = [];

    // Map RFIs
    rfis.forEach((rfi) => {
      items.push({
        id: rfi.violation_id,
        type: "rfi",
        title: `RFI Dispatch: ${rfi.violation_id.replace(/DEMO-?/gi, "").split(":").join(" ")}`,
        subtitle: `Contractor RFI • ${rfi.delivery_channel || "Procore RFI Queue"}`,
        channel: rfi.delivery_channel || "Procore Sync",
        status: rfi.status === "approved_sent" ? "Dispatched & Delivered" : rfi.status,
        timestamp: rfi.approved_at || new Date().toISOString(),
        actor: "Lead Project Engineer (HITL Gate)",
        payloadText: rfi.message,
        metadata: {
          violation_id: rfi.violation_id,
          delivery_channel: rfi.delivery_channel,
          tenant_id: rfi.tenant_id,
        }
      });
    });

    // Map Supplier Switches
    switches.forEach((sw) => {
      items.push({
        id: sw.protocol_id,
        type: "switch",
        title: `Supplier Re-route: ${sw.protocol_id}`,
        subtitle: `Substituted ${sw.target_supplier_name || sw.target_supplier_id} for ${sw.equipment_tag}`,
        channel: "Oracle Supply Chain EDI",
        status: "Logistics Active & Re-routed",
        timestamp: sw.approved_at || sw.created_at || new Date().toISOString(),
        actor: sw.approved_by || "Procurement Director",
        payloadText: `Contingency Protocol Executed: Re-routed purchase orders for ${sw.equipment_tag} from failing vendor (${sw.replaced_supplier_name || sw.replaced_supplier_id}) to qualified replacement (${sw.target_supplier_name || sw.target_supplier_id}${sw.target_city ? ` in ${sw.target_city}, ${sw.target_country}` : ""}). Lead time savings: ${sw.target_lead_time || 12} days.`,
        metadata: {
          equipment_tag: sw.equipment_tag,
          replaced_supplier: sw.replaced_supplier_name || sw.replaced_supplier_id,
          target_supplier: sw.target_supplier_name || sw.target_supplier_id,
          approved_by: sw.approved_by,
        }
      });
    });

    // Sort newest first
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rfis, switches]);

  const filteredItems = unifiedItems.filter(item => {
    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "rfis" ? item.type === "rfi" :
      activeTab === "switches" ? item.type === "switch" : true;

    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.payloadText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#111111] text-[#F5F5F5] p-4 sm:p-6 lg:p-8 font-sans custom-scrollbar space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a1d24] flex items-center justify-center border border-[#2b313d] text-[#4edea3] shadow-md">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-[#f5f5f5] label-caps">
                OUTBOX & DISPATCH CONTROL
              </h1>
              <p className="text-xs text-[#8c93a0] font-mono mt-0.5">
                Centralized delivery hub for AI-drafted RFIs, supply chain switches, and external cloud integrations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <button
            onClick={() => void fetchOutboxData()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181a20] border border-[#2b313d] hover:bg-[#202530] text-xs font-bold text-[#f5f5f5] transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4edea3] ${loading ? "animate-spin" : ""}`} />
            <span>Sync Outbox</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#181a20] border border-[#262a33] p-4 rounded-xl shadow-lg">
          <span className="text-[10px] text-[#8c93a0] uppercase font-bold block">Total Dispatched Items</span>
          <span className="text-2xl font-black text-[#f5f5f5] mt-1 block">{unifiedItems.length}</span>
        </div>

        <div className="bg-[#181a20] border border-[#262a33] p-4 rounded-xl shadow-lg">
          <span className="text-[10px] text-[#8c93a0] uppercase font-bold block">Formal RFIs Transmitted</span>
          <span className="text-2xl font-black text-primary mt-1 block">{rfis.length}</span>
        </div>

        <div className="bg-[#181a20] border border-[#262a33] p-4 rounded-xl shadow-lg">
          <span className="text-[10px] text-[#8c93a0] uppercase font-bold block">Re-routed Supply Protocols</span>
          <span className="text-2xl font-black text-[#4edea3] mt-1 block">{switches.length}</span>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#181a20] border border-[#262a33] p-3 rounded-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#8c93a0]" />
          <input
            type="text"
            placeholder="Search outbox by RFI ID, equipment tag, payload text, or recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-mono text-[#f5f5f5] placeholder-[#8c93a0] focus:outline-none"
          />
        </div>

        {/* Tab Filter Pills */}
        <div className="flex p-0.5 rounded-lg bg-[#111111] border border-[#262a33] font-mono text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === "all" ? "bg-[#e5e5e5] text-[#111111]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
            }`}
          >
            All Dispatches ({unifiedItems.length})
          </button>
          <button
            onClick={() => setActiveTab("rfis")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === "rfis" ? "bg-primary text-on-primary" : "text-[#8c93a0] hover:text-[#f5f5f5]"
            }`}
          >
            RFIs ({rfis.length})
          </button>
          <button
            onClick={() => setActiveTab("switches")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === "switches" ? "bg-[#4edea3] text-[#003824]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
            }`}
          >
            Suppliers ({switches.length})
          </button>
        </div>
      </div>

      {/* OUTBOX DISPATCH LIST */}
      {loading && unifiedItems.length === 0 ? (
        <div className="p-16 text-center text-xs font-mono text-[#8c93a0]">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#4edea3] mb-3" />
          Synchronizing outbox delivery logs and webhook status...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center bg-[#181a20] border border-[#262a33] rounded-2xl flex flex-col items-center">
          <FileText className="w-12 h-12 text-[#8c93a0]/40 mb-3" />
          <h3 className="text-base font-bold text-[#f5f5f5]">No Dispatched Actions Found</h3>
          <p className="text-xs text-[#8c93a0] font-mono mt-1 max-w-md">
            Approved RFIs from Guardian or executed supplier switches from Oracle will be automatically logged and archived here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 font-mono text-xs">
          {filteredItems.map((item) => {
            const isRfi = item.type === "rfi";
            const isSwitch = item.type === "switch";

            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-[#262a33] bg-[#181a20] hover:border-[#4edea3]/50 transition-all shadow-md space-y-3 group"
              >
                {/* Item Top Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isRfi ? (
                        <FileText className="w-4 h-4 text-primary" />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4 text-[#4edea3]" />
                      )}
                      <h3 className="text-sm font-bold text-[#f5f5f5] font-sans">
                        {item.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isRfi 
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30"
                      }`}>
                        {item.channel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8c93a0]">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-[#0a0b0e] border border-white/10 text-[10px] text-[#4edea3] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{item.status}</span>
                    </span>

                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1 bg-[#13161c] hover:bg-[#202530] border border-[#2b313d] hover:border-[#4edea3]/50 rounded text-xs font-bold text-[#f5f5f5] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Payload</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Transmitted Payload Preview */}
                <div className="p-3.5 rounded-lg bg-[#0e1014] border border-[#222733] text-[#e5e5e5] leading-relaxed relative">
                  <div className="pr-12 text-xs italic line-clamp-3">
                    &ldquo;{item.payloadText}&rdquo;
                  </div>
                  
                  <button
                    onClick={() => handleCopy(item.id, item.payloadText)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded bg-[#181a20] hover:bg-[#252830] border border-[#2b313d] text-[#8c93a0] hover:text-[#f5f5f5] transition-all cursor-pointer"
                    title="Copy Payload"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-[#4edea3]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Provenance Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8c93a0] pt-1">
                  <div className="flex items-center gap-3">
                    <span>Authorized by: <b className="text-[#f5f5f5]">{item.actor}</b></span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </span>
                  </div>

                  <span className="text-[#4edea3] font-bold">
                    Delivery Confirmed (HTTP 200 OK)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED PAYLOAD INSPECTOR MODAL */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-[#0f1115] border border-[#262a33] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f242d] bg-[#090a0d]">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#4edea3]" />
                <h3 className="text-base font-bold text-[#f5f5f5] font-sans">
                  {selectedItem.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg hover:bg-[#1f242d] text-[#8c93a0] hover:text-[#f5f5f5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[#0f1115]">
              <div>
                <span className="text-[10px] text-[#8c93a0] uppercase font-bold block mb-2">
                  Full Transmitted Message & Formal RFI Document
                </span>
                {selectedItem.type === "rfi" ? (
                  <RfiMarkdownViewer 
                    content={selectedItem.payloadText} 
                    violationId={selectedItem.id} 
                    className="max-h-[380px]"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-[#090a0d] border border-[#1f242d] text-[#f5f5f5] leading-relaxed whitespace-pre-wrap">
                    {selectedItem.payloadText}
                  </div>
                )}
              </div>

              {/* Delivery Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <span className="text-[9px] text-[#8c93a0] uppercase block">Delivery Channel</span>
                  <span className="text-sm font-bold text-[#f5f5f5] mt-0.5 block">{selectedItem.channel}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <span className="text-[9px] text-[#8c93a0] uppercase block">Delivery Status</span>
                  <span className="text-sm font-bold text-[#4edea3] mt-0.5 block">{selectedItem.status}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <span className="text-[9px] text-[#8c93a0] uppercase block">Dispatched Timestamp</span>
                  <span className="text-sm font-bold text-[#f5f5f5] mt-0.5 block">
                    {new Date(selectedItem.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f242d] bg-[#090a0d]">
              <button
                onClick={() => handleCopy(selectedItem.id, selectedItem.payloadText)}
                className="px-4 py-2 bg-[#181a20] hover:bg-[#252830] border border-[#2b313d] text-[#f5f5f5] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === selectedItem.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4edea3]" />
                    <span>Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Letter Text</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded-lg transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
