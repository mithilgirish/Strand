"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Loader2, MapPin, ShieldAlert } from "lucide-react";
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

function formatLocation(city: string, country: string) {
  return [city, country].filter(Boolean).join(", ") || "Location pending";
}

export default function AlternativesPanel({ shipment }: { shipment: OracleShipment | null }) {
  const [alternatives, setAlternatives] = useState<AlternativeSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shipment || shipment.status !== "red") {
      return;
    }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const params = new URLSearchParams({ failing_supplier_id: shipment!.supplierId });
        const response = await fetch(`${apiBase}/api/v1/oracle/alternatives/${encodeURIComponent(shipment!.equipmentTag)}?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Alternatives returned ${response.status}`);
        const data = await response.json() as { alternatives: AlternativeSupplier[] };
        setAlternatives(data.alternatives);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") setError("Alternative suppliers could not be loaded.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [shipment]);

  async function initiateSwitch(alternative: AlternativeSupplier) {
    if (!shipment) return;
    setSwitching(alternative.supplier_id);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
      const data = await response.json() as { protocol_id: string };
      setProtocolId(data.protocol_id);
    } catch {
      setError("The switch protocol could not be created.");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <section className="min-h-[320px] border border-white/10 bg-surface-container-low p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase text-on-surface-variant"><ArrowRightLeft className="h-4 w-4 text-primary" />Qualified alternatives</h3>
        {shipment?.status === "red" && <ShieldAlert className="h-4 w-4 text-red-400" />}
      </div>
      {!shipment && <p className="py-12 text-center text-xs text-on-surface-variant">Select a shipment on the map.</p>}
      {shipment && shipment.status !== "red" && <p className="py-12 text-center text-xs text-on-surface-variant">No supplier intervention is required for {shipment.id}.</p>}
      {loading && <p className="py-12 text-center text-xs text-on-surface-variant">Ranking qualified suppliers...</p>}
      {error && <p className="mb-3 border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {protocolId && <div className="mb-3 flex items-center gap-2 border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-300"><CheckCircle2 className="h-4 w-4" />Protocol {protocolId} is pending approval.</div>}
      <div className="space-y-3">
        {shipment?.status === "red" && alternatives.map((alternative, index) => (
          <article key={`${alternative.supplier_id || "alt"}-${index}`} className="border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex items-center gap-2"><h4 className="truncate text-sm font-bold text-on-surface">{alternative.name}</h4>{index === 0 && <span className="bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Best fit</span>}</div><p className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant"><MapPin className="h-3 w-3" />{formatLocation(alternative.city, alternative.country)}</p></div>
              <div className="text-right"><p className="font-mono text-lg font-bold text-on-surface">{alternative.match_score}%</p><p className="text-[9px] uppercase text-on-surface-variant">Match</p></div>
            </div>
            <div className="my-3 grid grid-cols-3 gap-2 border-y border-white/5 py-2 text-[10px] text-on-surface-variant"><span>Risk <b className="block font-mono text-on-surface">{Math.round(alternative.risk_score * 100)}%</b></span><span>On time <b className="block font-mono text-on-surface">{Math.round(alternative.on_time_rate * 100)}%</b></span><span>Lead time <b className="block font-mono text-on-surface">{alternative.lead_time_days}d</b></span></div>
            <button type="button" onClick={() => void initiateSwitch(alternative)} disabled={switching !== null} className="flex w-full items-center justify-center gap-2 bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-50">{switching === alternative.supplier_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}Initiate switch</button>
          </article>
        ))}
      </div>
    </section>
  );
}
