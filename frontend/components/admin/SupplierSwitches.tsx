"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  MapPin, 
  Building, 
  User, 
  Check, 
  X,
  AlertTriangle,
  Send,
  Loader2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface SwitchProtocol {
  protocol_id: string;
  equipment_tag: string;
  replaced_supplier_id: string;
  replaced_supplier_name?: string;
  target_supplier_id: string;
  target_supplier_name?: string;
  target_city?: string;
  target_country?: string;
  target_risk_score?: number;
  target_lead_time?: number;
  trigger?: string;
  status: "pending_approval" | "approved" | "rejected" | string;
  created_at?: string;
  created_by?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  message?: string;
}

export default function SupplierSwitches({ tenantId, isSuper }: { tenantId: string; isSuper?: boolean }) {
  const [switches, setSwitches] = useState<SwitchProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending_approval" | "approved" | "rejected">("all");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchSwitches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/oracle/switches`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load switch protocols");
      const data = await response.json();
      setSwitches(data.switches || []);
    } catch (err: any) {
      setError(err.message || "Failed to load protocols.");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void fetchSwitches();
  }, [fetchSwitches]);

  const handleDecision = async (protocolId: string, decision: "approve" | "reject") => {
    setActionLoading(protocolId);
    try {
      const endpoint = `${apiBase}/api/v1/oracle/switches/${protocolId}/${decision}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: decision === "approve" ? "Approved by Admin Console" : "Rejected by Governance"
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${decision} protocol.`);
      }

      // Dispatch event to notify Oracle map to reload
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oracle:shipment-updated"));
      }

      await fetchSwitches();
    } catch (err: any) {
      alert(err.message || `Failed to ${decision} protocol.`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSwitches = switches.filter(s => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const pendingCount = switches.filter(s => s.status === "pending_approval").length;
  const approvedCount = switches.filter(s => s.status === "approved").length;
  const rejectedCount = switches.filter(s => s.status === "rejected").length;

  return (
    <div className="space-y-6 animate-in fade-in font-sans">
      {/* Header & KPI Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[#4edea3]" />
            <span>Oracle Supplier Switch Protocols (HITL Gate)</span>
          </h2>
          <p className="text-xs text-[#8c93a0] font-mono mt-1">
            Human-In-The-Loop approval gate for supply chain contingency re-routing and vendor substitutions.
          </p>
        </div>

        <button
          onClick={() => void fetchSwitches()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181a20] border border-[#2b313d] hover:bg-[#222530] text-xs font-mono text-[#f5f5f5] transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#4edea3] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Protocols</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#181a20] border border-[#262a33] p-4 rounded-xl shadow-md">
          <span className="text-[10px] text-[#8c93a0] uppercase font-bold block">Pending Decision Gate</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingCount}</span>
        </div>

        <div className="bg-[#181a20] border border-[#262a33] p-4 rounded-xl shadow-md">
          <span className="text-[10px] text-[#8c93a0] uppercase font-bold block">Approved & Re-routed</span>
          <span className="text-2xl font-black text-[#4edea3] mt-1 block">{approvedCount}</span>
        </div>

        <div className="bg-[#181a20] border border-[#262a33] p-4 rounded-xl shadow-md">
          <span className="text-[10px] text-[#8c93a0] uppercase font-bold block">Rejected / Closed</span>
          <span className="text-2xl font-black text-[#8c93a0] mt-1 block">{rejectedCount}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-[#181a20] border border-[#262a33] rounded-lg w-fit font-mono text-xs">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
            filter === "all" ? "bg-[#e5e5e5] text-[#111111]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
          }`}
        >
          All ({switches.length})
        </button>
        <button
          onClick={() => setFilter("pending_approval")}
          className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
            filter === "pending_approval" ? "bg-amber-400 text-[#111111]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
            filter === "approved" ? "bg-[#4edea3] text-[#003824]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
          }`}
        >
          Approved ({approvedCount})
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
            filter === "rejected" ? "bg-red-400 text-[#111111]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
          }`}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Protocol Cards List */}
      {loading && switches.length === 0 ? (
        <div className="p-12 text-center text-xs font-mono text-[#8c93a0]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4edea3] mb-2" />
          Loading active switch protocols...
        </div>
      ) : filteredSwitches.length === 0 ? (
        <div className="p-12 text-center bg-[#181a20] border border-[#262a33] rounded-xl text-xs font-mono text-[#8c93a0]">
          No switch protocols in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSwitches.map((protocol) => {
            const isPending = protocol.status === "pending_approval";
            const isApproved = protocol.status === "approved";
            const isRejected = protocol.status === "rejected";
            const isLoadingThis = actionLoading === protocol.protocol_id;

            return (
              <div
                key={protocol.protocol_id}
                className={`p-5 rounded-xl border transition-all shadow-lg font-mono text-xs ${
                  isPending
                    ? "bg-[#181a20] border-amber-500/40 hover:border-amber-500"
                    : isApproved
                    ? "bg-[#131b17] border-[#4edea3]/40"
                    : "bg-[#181a20] border-white/10 opacity-70"
                }`}
              >
                {/* Protocol Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#f5f5f5]">{protocol.protocol_id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                          : isApproved
                          ? "bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40"
                          : "bg-red-400/20 text-red-300 border border-red-400/40"
                      }`}>
                        {isPending ? "Pending Decision" : protocol.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8c93a0]">
                      Target Node: <span className="text-[#4edea3] font-bold">{protocol.equipment_tag}</span> • Trigger: <span className="uppercase text-[#f5f5f5]">{protocol.trigger || "oracle_recommendation"}</span>
                    </p>
                  </div>

                  {/* Action Buttons for Pending */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecision(protocol.protocol_id, "reject")}
                        disabled={isLoadingThis}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleDecision(protocol.protocol_id, "approve")}
                        disabled={isLoadingThis}
                        className="px-4 py-1.5 rounded-lg bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold shadow-[0_0_12px_rgba(78,222,163,0.3)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Approve Switch & Re-route</span>
                      </button>
                    </div>
                  )}

                  {isApproved && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Logistics Re-routed & Active</span>
                    </div>
                  )}
                </div>

                {/* Switch Comparison: From Supplier -> To Supplier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                  {/* Replaced Supplier */}
                  <div className="p-3.5 rounded-lg bg-[#0e1014] border border-red-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-red-400 font-bold text-[10px] uppercase">
                      <span>Replaced Failing Vendor</span>
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-bold text-[#f5f5f5] block">
                      {protocol.replaced_supplier_name || protocol.replaced_supplier_id}
                    </span>
                    <span className="text-[10px] text-[#8c93a0] block">ID: {protocol.replaced_supplier_id}</span>
                  </div>

                  {/* Target Supplier */}
                  <div className="p-3.5 rounded-lg bg-[#0e1014] border border-[#4edea3]/30 space-y-1.5">
                    <div className="flex items-center justify-between text-[#4edea3] font-bold text-[10px] uppercase">
                      <span>Target Replacement Vendor</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-bold text-[#f5f5f5] block">
                      {protocol.target_supplier_name || protocol.target_supplier_id}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-[#8c93a0] pt-1">
                      <span>ID: {protocol.target_supplier_id}</span>
                      {protocol.target_city && (
                        <span>{protocol.target_city}, {protocol.target_country}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Provenance Footer */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8c93a0]">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>Initiated by: <b className="text-[#f5f5f5]">{protocol.created_by || "procurement_lead"}</b></span>
                    {protocol.created_at && (
                      <span>({new Date(protocol.created_at).toLocaleString()})</span>
                    )}
                  </div>

                  {isApproved && protocol.approved_by && (
                    <div className="flex items-center gap-1.5 text-[#4edea3]">
                      <span>Approved by: <b className="text-[#f5f5f5]">{protocol.approved_by}</b></span>
                      {protocol.approved_at && (
                        <span>({new Date(protocol.approved_at).toLocaleTimeString()})</span>
                      )}
                    </div>
                  )}

                  {isRejected && (
                    <div className="text-red-400">
                      <span>Reason: {protocol.rejection_reason || "Declined"}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
