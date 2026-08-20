"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Factory, Network, Zap } from "lucide-react";
import type { OracleShipment } from "./SupplyMap";

interface SupplierNodeData {
  supplier_id: string;
  name: string;
  tier: number;
  risk_score: number;
  on_time_rate: number;
  status: "critical" | "warning" | "healthy";
  children: SupplierNodeData[];
}

interface SupplyChainResponse {
  shipment_id: string;
  equipment_tag: string;
  root: SupplierNodeData;
}

const STATUS_COLOR = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  healthy: "bg-green-500",
};

function SupplierNode({ node }: { node: SupplierNodeData }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const Icon = node.tier === 1 ? Building2 : node.tier === 2 ? Factory : Zap;
  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 border-l-2 border-transparent px-2 py-2 text-left hover:border-primary hover:bg-white/5"
      >
        <span className="w-4">{hasChildren && (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}</span>
        <Icon className="h-4 w-4 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">{node.name}</span>
        <span className="text-[10px] text-on-surface-variant">T{node.tier}</span>
        <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[node.status]}`} title={`${node.status} risk`} />
      </button>
      {hasChildren && expanded && (
        <div className="ml-6 border-l border-white/10 pl-2">
          {node.children.map((child) => <SupplierNode key={child.supplier_id} node={child} />)}
        </div>
      )}
    </div>
  );
}

export default function SupplierTree({
  shipmentId,
  shipment,
}: {
  shipmentId: string | null;
  shipment?: OracleShipment | null;
}) {
  const [data, setData] = useState<SupplyChainResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!shipmentId) {
      setData(null);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    async function load() {
      setState("loading");
      setData(null);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiBase}/api/v1/oracle/supply-chain/${encodeURIComponent(shipmentId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Supply chain returned ${response.status}`);
        setData(await response.json() as SupplyChainResponse);
        setState("idle");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          if (shipment) {
            setData({
              shipment_id: shipment.id,
              equipment_tag: shipment.equipmentTag,
              root: {
                supplier_id: shipment.supplierId || shipment.id,
                name: shipment.supplierName,
                tier: shipment.tier || 1,
                risk_score: 0.7,
                on_time_rate: 0.8,
                status: shipment.status === "red" ? "critical" : shipment.status === "amber" ? "warning" : "healthy",
                children: [],
              },
            });
            setState("idle");
          } else {
            setState("error");
          }
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [shipmentId, shipment]);

  return (
    <section className="min-h-[250px] border border-white/10 bg-surface-container-low p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase text-on-surface-variant"><Network className="h-4 w-4 text-primary" />Supplier dependency</h3>
        {data && <span className="font-mono text-[10px] text-primary">{data.equipment_tag}</span>}
      </div>
      {state === "loading" && <p className="py-10 text-center text-xs text-on-surface-variant">Loading tier dependencies...</p>}
      {state === "error" && <p className="border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">Dependency data could not be loaded.</p>}
      {!shipmentId && <p className="py-10 text-center text-xs text-on-surface-variant">Select a shipment on the map.</p>}
      {state === "idle" && data?.shipment_id === shipmentId && <SupplierNode node={data.root} />}
    </section>
  );
}
