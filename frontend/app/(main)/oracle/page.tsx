"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Network, PackageCheck } from "lucide-react";
import AlternativesPanel from "@/components/oracle/AlternativesPanel";
import SupplierTree from "@/components/oracle/SupplierTree";
import type { OracleShipment } from "@/components/oracle/SupplyMap";

const SupplyMap = dynamic(() => import("@/components/oracle/SupplyMap"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[440px] place-items-center border border-white/10 bg-surface-container-low text-sm text-on-surface-variant">Initializing geospatial view...</div>,
});

export default function OracleAgent() {
  const [selected, setSelected] = useState<OracleShipment | null>(null);
  const selectShipment = useCallback((shipment: OracleShipment) => setSelected(shipment), []);

  return (
    <div className="flex min-h-full flex-col pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-on-surface"><Network className="h-6 w-6 text-primary" />Oracle Supply Network</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Shipment exposure, supplier dependencies, and qualified recovery paths.</p>
        </div>
        {selected && (
          <div className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-4 py-2">
            {selected.status === "red" ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <PackageCheck className="h-5 w-5 text-green-400" />}
            <div><p className="font-mono text-[10px] text-on-surface-variant">{selected.id}</p><p className="text-sm font-bold text-on-surface">{selected.equipmentTag} · {selected.supplierName}</p></div>
          </div>
        )}
      </header>

      <div className="grid min-h-[720px] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,1fr)]">
        <SupplyMap selectedId={selected?.id ?? null} onSelect={selectShipment} />
        <div className="flex flex-col gap-5">
          <SupplierTree shipmentId={selected?.id ?? null} />
          <AlternativesPanel shipment={selected} />
        </div>
      </div>
    </div>
  );
}
