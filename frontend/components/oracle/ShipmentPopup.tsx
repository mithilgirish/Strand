"use client";

import { AlertTriangle, Package, ShieldCheck, Truck } from "lucide-react";
import type { OracleShipment } from "./SupplyMap";

export default function ShipmentPopup({ shipment, onInspect }: { shipment: OracleShipment; onInspect: () => void }) {
  const Icon = shipment.status === "red" ? AlertTriangle : shipment.status === "amber" ? Truck : ShieldCheck;
  return (
    <div className="min-w-[220px] p-1 font-sans text-gray-800">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-2">
        <Package className="h-5 w-5 text-blue-600" />
        <div><p className="text-xs text-gray-500">{shipment.id}</p><h4 className="font-bold">{shipment.equipmentTag}</h4></div>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="font-semibold">Supplier</dt><dd className="text-right">{shipment.supplierName}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">ETA</dt><dd>{shipment.eta}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-semibold">Delay</dt><dd>{shipment.delayDays} days</dd></div>
      </dl>
      <div className={`mt-3 flex items-center justify-center gap-2 border px-3 py-1.5 text-xs font-semibold uppercase ${shipment.status === "red" ? "border-red-200 bg-red-50 text-red-700" : shipment.status === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-green-200 bg-green-50 text-green-700"}`}>
        <Icon className="h-4 w-4" />{shipment.riskReason || "On track"}
      </div>
      <button type="button" onClick={onInspect} className="mt-3 w-full bg-gray-900 px-3 py-2 text-xs font-bold text-white">Inspect supply chain</button>
    </div>
  );
}
