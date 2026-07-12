"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ShipmentPopup from "./ShipmentPopup";

export type ShipmentStatus = "green" | "amber" | "red";

export interface OracleShipment {
  id: string;
  equipmentTag: string;
  supplierId: string;
  supplierName: string;
  status: ShipmentStatus;
  eta: string;
  riskReason: string;
  delayDays: number;
  tier: number;
  lat: number;
  lng: number;
}

interface GeoJsonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    shipment_id?: string;
    equipment_tag?: string;
    supplier_id?: string;
    supplier_name?: string;
    risk_flag?: boolean;
    delay_days?: number;
    status?: string;
    expected_delivery?: string;
    tier?: number;
  };
}

interface GeoJsonCollection {
  features?: GeoJsonFeature[];
}

interface SupplyMapProps {
  selectedId: string | null;
  onSelect: (shipment: OracleShipment) => void;
}

const COLORS: Record<ShipmentStatus, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

function markerIcon(status: ShipmentStatus, selected: boolean) {
  const color = COLORS[status];
  const size = selected ? 24 : 18;
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${selected ? 4 : 3}px solid white;box-shadow:0 0 ${selected ? 18 : 10}px ${color};"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function mapGeoJson(collection: GeoJsonCollection): OracleShipment[] {
  return (collection.features ?? []).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates) return [];
    const properties = feature.properties ?? {};
    const delayDays = Number(properties.delay_days ?? 0);
    const status: ShipmentStatus = properties.risk_flag || delayDays > 7
      ? "red"
      : delayDays > 0
        ? "amber"
        : "green";
    return [{
      id: properties.shipment_id ?? "unknown-shipment",
      equipmentTag: properties.equipment_tag ?? "Unassigned equipment",
      supplierId: properties.supplier_id ?? "",
      supplierName: properties.supplier_name ?? "Unknown supplier",
      status,
      eta: properties.expected_delivery ?? "TBD",
      riskReason: status === "green" ? "" : properties.status ?? "Delivery risk",
      delayDays,
      tier: Number(properties.tier ?? 1),
      lng: Number(coordinates[0]),
      lat: Number(coordinates[1]),
    }];
  });
}

export default function SupplyMap({ selectedId, onSelect }: SupplyMapProps) {
  const [shipments, setShipments] = useState<OracleShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/api/v1/oracle/shipments`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Oracle returned ${response.status}`);
        const mapped = mapGeoJson(await response.json() as GeoJsonCollection);
        if (mapped.length === 0) throw new Error("Oracle returned no shipments");
        setShipments(mapped);
        const initial = mapped.find((shipment) => shipment.status === "red") ?? mapped[0];
        onSelect(initial);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") setError(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [onSelect]);

  const counts = useMemo(() => ({
    total: shipments.length,
    risk: shipments.filter((shipment) => shipment.status === "red").length,
    delayed: shipments.filter((shipment) => shipment.status === "amber").length,
  }), [shipments]);

  return (
    <div className="relative h-full min-h-[440px] w-full overflow-hidden rounded-lg border border-white/10 bg-surface-container-low shadow-[0_4px_20px_rgba(0,0,0,0.30)]">
      <div className="absolute left-4 top-4 z-[1000] border border-white/10 bg-surface-container/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-[11px] font-bold uppercase text-on-surface">Live shipment network</p>
        <p className="mt-1 text-[11px] text-on-surface-variant">{counts.total} tracked · {counts.risk} critical · {counts.delayed} delayed</p>
      </div>
      {loading && <div className="absolute inset-0 z-[1100] grid place-items-center bg-surface-container-low/80 text-sm text-on-surface-variant">Loading shipment telemetry...</div>}
      {error && <div className="absolute inset-x-4 bottom-4 z-[1100] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">Shipment telemetry is unavailable.</div>}
      <MapContainer center={[20.6, 79]} zoom={5} scrollWheelZoom zoomControl={false} style={{ height: "100%", width: "100%", zIndex: 1 }}>
        <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <ZoomControl position="bottomright" />
        {shipments.map((shipment) => (
          <Marker
            key={shipment.id}
            position={[shipment.lat, shipment.lng]}
            icon={markerIcon(shipment.status, shipment.id === selectedId)}
            eventHandlers={{ click: () => onSelect(shipment) }}
          >
            <Popup><ShipmentPopup shipment={shipment} onInspect={() => onSelect(shipment)} /></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
