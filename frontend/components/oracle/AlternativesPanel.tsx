"use client";

import { useEffect, useState } from "react";
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  Loader2, 
  MapPin, 
  ShieldAlert, 
  Check, 
  X, 
  ExternalLink,
  Building
} from "lucide-react";
import Link from "next/link";
import type { OracleShipment } from "./SupplyMap";

interface AlternativeSupplier {
  supplier_id: string;
  name: string;
  city: string;
  country: string;
  risk_score: number;
  on_time_rate: number;
  match_score: number;
  lead_time_days: number;
}

interface ActiveProtocol {
  protocol_id: string;
  equipment_tag: string;
  target_supplier_id: string;
  target_supplier_name?: string;
  replaced_supplier_id?: string;
  status: "pending_approval" | "approved" | "rejected" | string;
  created_at?: string;
  approved_at?: string;
}

function formatLocation(city: string, country: string) {
  return [city, country].filter(Boolean).join(", ") || "Location pending";
}

export default function AlternativesPanel({ shipment }: { shipment: OracleShipment | null }) {
  const [alternatives, setAlternatives] = useState<AlternativeSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<ActiveProtocol | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!shipment) {
      setAlternatives([]);
      setProtocol(null);
      return;
    }

    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1. Check for existing switch protocols for this equipment tag
        const switchResp = await fetch(`${apiBase}/api/v1/oracle/switches`, { signal: controller.signal });
        if (switchResp.ok) {
          const switchData = await switchResp.json();
          const existing = (switchData.switches || []).find(
            (s: ActiveProtocol) => s.equipment_tag === shipment!.equipmentTag
          );
          if (existing) {
            setProtocol(existing);
          } else {
            setProtocol(null);
          }
        }

        // 2. Load alternative suppliers if red/at risk
        if (shipment!.status === "red") {
          const params = new URLSearchParams({ failing_supplier_id: shipment!.supplierId });
          const response = await fetch(
            `${apiBase}/api/v1/oracle/alternatives/${encodeURIComponent(shipment!.equipmentTag)}?${params}`,
            { signal: controller.signal }
          );
          if (!response.ok) throw new Error(`Alternatives returned ${response.status}`);
          const data = (await response.json()) as { alternatives: AlternativeSupplier[] };
          setAlternatives(data.alternatives);
        }
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError("Alternative suppliers could not be loaded.");
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [shipment, apiBase]);

  async function initiateSwitch(alternative: AlternativeSupplier) {
    if (!shipment) return;
    setSwitching(alternative.supplier_id);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/oracle/initiate-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_tag: shipment.equipmentTag,
          replaced_supplier_id: shipment.supplierId,
          target_supplier_id: alternative.supplier_id,
          trigger: "oracle_recommendation",
        }),
      });
      if (!response.ok) throw new Error(`Switch returned ${response.status}`);
      const data = (await response.json()) as ActiveProtocol;
      setProtocol(data);
    } catch {
      setError("The switch protocol could not be created.");
    } finally {
      setSwitching(null);
    }
  }

  async function handleApproveSwitch(protocolId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/oracle/switches/${protocolId}/approve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Approve returned ${response.status}`);
      const data = await response.json();
      setProtocol(data.protocol);

      // Trigger map update so the shipment turns green!
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oracle:shipment-updated"));
      }
    } catch {
      setError("Failed to approve switch protocol.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSwitch(protocolId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/oracle/switches/${protocolId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "reject", reason: "Rejected in Oracle console" }),
      });
      if (!response.ok) throw new Error(`Reject returned ${response.status}`);
      const data = await response.json();
      setProtocol(data.protocol);
    } catch {
      setError("Failed to reject switch protocol.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="min-h-[320px] border border-white/10 bg-surface-container-low p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] font-sans">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase text-on-surface-variant font-mono">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <span>Qualified Alternative Suppliers</span>
        </h3>
        {shipment?.status === "red" && <ShieldAlert className="h-4 w-4 text-red-400" />}
      </div>

      {!shipment && (
        <p className="py-12 text-center text-xs text-on-surface-variant font-mono">
          Select a shipment on the map to inspect contingency options.
        </p>
      )}

      {shipment && shipment.status !== "red" && !protocol && (
        <div className="py-8 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#4edea3] mx-auto" />
          <p className="text-sm font-bold text-[#f5f5f5]">No Supplier Intervention Required</p>
          <p className="text-xs text-on-surface-variant font-mono">
            Shipment {shipment.id} ({shipment.equipmentTag}) is on track with acceptable risk index.
          </p>
        </div>
      )}

      {loading && (
        <p className="py-12 text-center text-xs text-on-surface-variant font-mono animate-pulse">
          Evaluating pre-qualified suppliers and ranking match scores...
        </p>
      )}

      {error && (
        <p className="mb-3 border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
          {error}
        </p>
      )}

      {/* ACTIVE / PENDING PROTOCOL CARD */}
      {protocol && (
        <div
          className={`mb-4 p-4 rounded-xl border font-mono text-xs transition-all ${
            protocol.status === "approved"
              ? "bg-[#003824]/20 border-[#4edea3]/40"
              : protocol.status === "rejected"
              ? "bg-red-950/20 border-red-500/30"
              : "bg-amber-950/20 border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#f5f5f5]">{protocol.protocol_id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  protocol.status === "approved"
                    ? "bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40"
                    : protocol.status === "rejected"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                }`}
              >
                {protocol.status === "pending_approval" ? "Pending Approval Gate" : protocol.status}
              </span>
            </div>
            <Link
              href="/admin"
              className="text-[10px] text-[#4edea3] hover:underline flex items-center gap-1 font-bold"
            >
              <span>Admin Console</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <p className="text-[11px] text-[#e5e5e5] mb-3">
            {protocol.status === "approved"
              ? `✓ Switch Approved: Re-routed to ${protocol.target_supplier_name || protocol.target_supplier_id}. Supply chain risk eliminated (Status: On Track).`
              : protocol.status === "rejected"
              ? `✗ Protocol rejected by procurement governance.`
              : `Contingency switch protocol created to substitute ${protocol.target_supplier_name || protocol.target_supplier_id} for ${protocol.equipment_tag}.`}
          </p>

          {/* Direct Approval Actions in Panel */}
          {protocol.status === "pending_approval" && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => void handleApproveSwitch(protocol.protocol_id)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Approve & Execute Switch</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRejectSwitch(protocol.protocol_id)}
                disabled={actionLoading}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ALTERNATIVES LIST */}
      <div className="space-y-3 font-mono">
        {shipment?.status === "red" &&
          alternatives.map((alternative, index) => (
            <article
              key={`${alternative.supplier_id || "alt"}-${index}`}
              className="border border-white/10 bg-white/[0.025] hover:bg-white/[0.04] p-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-on-surface font-sans">{alternative.name}</h4>
                    {index === 0 && (
                      <span className="bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary border border-primary/30">
                        Best fit
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                    <MapPin className="h-3 w-3" />
                    {formatLocation(alternative.city, alternative.country)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-on-surface text-[#4edea3]">
                    {alternative.match_score}%
                  </p>
                  <p className="text-[9px] uppercase text-on-surface-variant">Match</p>
                </div>
              </div>

              <div className="my-3 grid grid-cols-3 gap-2 border-y border-white/5 py-2 text-[10px] text-on-surface-variant">
                <span>
                  Risk <b className="block font-mono text-on-surface">{Math.round(alternative.risk_score * 100)}%</b>
                </span>
                <span>
                  On time{" "}
                  <b className="block font-mono text-on-surface">{Math.round(alternative.on_time_rate * 100)}%</b>
                </span>
                <span>
                  Lead time <b className="block font-mono text-on-surface">{alternative.lead_time_days}d</b>
                </span>
              </div>

              <button
                type="button"
                onClick={() => void initiateSwitch(alternative)}
                disabled={switching !== null || actionLoading}
                className="flex w-full items-center justify-center gap-2 bg-primary hover:bg-primary/90 px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50 transition-colors cursor-pointer"
              >
                {switching === alternative.supplier_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                <span>Initiate switch</span>
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
