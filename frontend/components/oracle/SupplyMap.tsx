"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { 
  MapContainer, 
  Marker, 
  Popup, 
  TileLayer, 
  Polyline, 
  CircleMarker, 
  Tooltip,
  useMap 
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ShipmentPopup from "./ShipmentPopup";
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Compass, 
  Maximize2, 
  Radio, 
  Navigation,
  Plus,
  Minus
} from "lucide-react";

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

// Project Destination Hub (Navi Mumbai Hyperscale Data Center Site DC-01)
const PROJECT_SITE = {
  lat: 19.0760,
  lng: 72.8777,
  name: "STRAND Project Site DC-01 (Navi Mumbai)",
};

const COLORS: Record<ShipmentStatus, string> = {
  green: "#4edea3",
  amber: "#f59e0b",
  red: "#ff4d4f",
};

// MapCN custom tactical HTML marker icons with pulse animations
function createTacticalMarker(status: ShipmentStatus, isSelected: boolean) {
  const color = COLORS[status];
  const size = isSelected ? 26 : 18;
  const pulseColor = status === "red" ? "rgba(255, 77, 79, 0.4)" : status === "amber" ? "rgba(245, 158, 11, 0.4)" : "rgba(78, 222, 163, 0.4)";
  
  return L.divIcon({
    className: "mapcn-tactical-marker",
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center;">
        ${status === "red" || isSelected ? `
          <div style="
            position:absolute;
            inset:-8px;
            border-radius:50%;
            background:${pulseColor};
            animation: mapcn-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        ` : ""}
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:${color};
          border:${isSelected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.85)"};
          box-shadow: 0 0 ${isSelected ? "20px" : "10px"} ${color}, 0 2px 8px rgba(0,0,0,0.6);
          position:relative;
          z-index:2;
          transition: all 0.2s ease;
        ">
          ${isSelected ? `<div style="position:absolute; inset:3px; border-radius:50%; background:#111111;"></div>` : ""}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 6],
  });
}

// Project Destination Hub Icon
const projectHubIcon = L.divIcon({
  className: "mapcn-hub-marker",
  html: `
    <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; inset:-6px; border-radius:50%; background:rgba(56,189,248,0.35); animation: mapcn-ping 2.5s infinite;"></div>
      <div style="
        width:24px; height:24px; border-radius:6px; background:#0ea5e9; border:2px solid #ffffff;
        box-shadow:0 0 16px #0ea5e9, 0 4px 12px rgba(0,0,0,0.8);
        display:flex; align-items:center; justify-content:center;
        transform: rotate(45deg);
      ">
        <div style="width:8px; height:8px; background:#ffffff; border-radius:2px;"></div>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

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

// Tactical Map Controller for Zoom / Pan
function MapTacticalControls({ onReset }: { onReset: () => void }) {
  const map = useMap();

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5 font-mono">
      <button
        onClick={() => map.zoomIn()}
        className="w-8 h-8 rounded-lg bg-[#181a20]/95 hover:bg-[#252830] border border-[#2b313d] text-[#f5f5f5] flex items-center justify-center shadow-lg transition-all cursor-pointer"
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-8 h-8 rounded-lg bg-[#181a20]/95 hover:bg-[#252830] border border-[#2b313d] text-[#f5f5f5] flex items-center justify-center shadow-lg transition-all cursor-pointer"
        title="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          map.flyTo([20.6, 79], 5, { duration: 1.2 });
          onReset();
        }}
        className="w-8 h-8 rounded-lg bg-[#181a20]/95 hover:bg-[#252830] border border-[#2b313d] text-[#4edea3] flex items-center justify-center shadow-lg transition-all cursor-pointer"
        title="Reset Radar Center"
      >
        <Compass className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function SupplyMap({ selectedId, onSelect }: SupplyMapProps) {
  const [shipments, setShipments] = useState<OracleShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "red" | "green">("all");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshIndex((prev) => prev + 1);
    };
    window.addEventListener("oracle:shipment-updated", handleUpdate);
    return () => window.removeEventListener("oracle:shipment-updated", handleUpdate);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/api/v1/oracle/shipments`, { 
          signal: controller.signal, 
          cache: "no-store" 
        });
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
  }, [onSelect, refreshIndex]);

  const counts = useMemo(() => ({
    total: shipments.length,
    risk: shipments.filter((shipment) => shipment.status === "red").length,
    delayed: shipments.filter((shipment) => shipment.status === "amber").length,
    onTrack: shipments.filter((shipment) => shipment.status === "green").length,
  }), [shipments]);

  const filteredShipments = shipments.filter(s => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  return (
    <div className="relative h-full min-h-[460px] w-full overflow-hidden rounded-xl border border-[#262a33] bg-[#0c0d10] shadow-[0_8px_32px_rgba(0,0,0,0.6)] font-sans">
      
      {/* MapCN Radar Animation Keyframes */}
      <style jsx global>{`
        @keyframes mapcn-ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .leaflet-popup-content-wrapper {
          background: #14171d !important;
          color: #f5f5f5 !important;
          border: 1px solid #2b313d !important;
          border-radius: 12px !important;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8) !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip {
          background: #14171d !important;
          border: 1px solid #2b313d !important;
        }
        .leaflet-container {
          background-color: #090a0d !important;
          font-family: inherit !important;
        }
      `}</style>

      {/* TOP-LEFT MAPCN HUD OVERLAY */}
      <div className="absolute left-4 top-4 z-[1000] border border-[#262a33] bg-[#12141a]/95 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs max-w-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#4edea3]">
            Global Supply Chain Radar
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#e5e5e5] pt-1 border-t border-white/10">
          <span>{counts.total} Nodes</span>
          <span>·</span>
          <span className="text-red-400 font-bold">{counts.risk} Critical</span>
          <span>·</span>
          <span className="text-[#4edea3] font-bold">{counts.onTrack} On Track</span>
        </div>
      </div>

      {/* TOP-RIGHT FILTER PILLS */}
      <div className="absolute right-4 top-4 z-[1000] flex items-center gap-1.5 p-1 bg-[#12141a]/95 border border-[#262a33] rounded-lg shadow-xl backdrop-blur-md font-mono text-[10px]">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
            statusFilter === "all" ? "bg-[#e5e5e5] text-[#111111]" : "text-[#8c93a0] hover:text-[#f5f5f5]"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter("red")}
          className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
            statusFilter === "red" ? "bg-red-500 text-white shadow-sm" : "text-red-400 hover:text-red-300"
          }`}
        >
          Critical ({counts.risk})
        </button>
        <button
          onClick={() => setStatusFilter("green")}
          className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
            statusFilter === "green" ? "bg-[#4edea3] text-[#003824] shadow-sm" : "text-[#4edea3] hover:text-white"
          }`}
        >
          On Track ({counts.onTrack})
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1100] grid place-items-center bg-[#090a0d]/80 text-xs font-mono text-[#8c93a0] backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#4edea3] animate-pulse" />
            <span>Establishing live satellite telemetry feed...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-4 bottom-4 z-[1100] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-300 rounded-lg">
          Shipment telemetry is currently unavailable.
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <MapContainer 
        center={[20.6, 79]} 
        zoom={5} 
        scrollWheelZoom 
        zoomControl={false} 
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        {/* Dark Matter Tiles with high contrast */}
        <TileLayer 
          attribution='&copy; CARTO &copy; OpenStreetMap' 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          maxZoom={19}
        />

        {/* Tactical Map Controls */}
        <MapTacticalControls onReset={() => setStatusFilter("all")} />

        {/* Project Destination Hub Marker */}
        <Marker position={[PROJECT_SITE.lat, PROJECT_SITE.lng]} icon={projectHubIcon}>
          <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
            <div className="font-mono text-xs p-1">
              <span className="text-[#0ea5e9] font-bold block">PROJECT DESTINATION HUB</span>
              <span className="text-[#f5f5f5] text-[10px]">{PROJECT_SITE.name}</span>
            </div>
          </Tooltip>
        </Marker>

        {/* Supply Chain Corridors (Geodesic transit lines connecting origin to project site) */}
        {filteredShipments.map((shipment) => {
          const isSelected = shipment.id === selectedId;
          const lineColor = COLORS[shipment.status];
          const isCritical = shipment.status === "red";

          return (
            <Polyline
              key={`line-${shipment.id}`}
              positions={[
                [shipment.lat, shipment.lng],
                [PROJECT_SITE.lat, PROJECT_SITE.lng]
              ]}
              pathOptions={{
                color: isSelected ? "#ffffff" : lineColor,
                weight: isSelected ? 2.5 : isCritical ? 2 : 1.2,
                opacity: isSelected ? 0.9 : isCritical ? 0.7 : 0.35,
                dashArray: isCritical ? "6, 8" : "4, 6",
              }}
            />
          );
        })}

        {/* Shipment Supplier Nodes */}
        {filteredShipments.map((shipment) => {
          const isSelected = shipment.id === selectedId;

          return (
            <Marker
              key={shipment.id}
              position={[shipment.lat, shipment.lng]}
              icon={createTacticalMarker(shipment.status, isSelected)}
              eventHandlers={{ click: () => onSelect(shipment) }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.9}>
                <div className="font-mono text-xs p-0.5">
                  <span className="text-[#f5f5f5] font-bold block">{shipment.equipmentTag}</span>
                  <span className="text-[10px] text-[#8c93a0]">{shipment.supplierName}</span>
                </div>
              </Tooltip>
              <Popup>
                <ShipmentPopup shipment={shipment} onInspect={() => onSelect(shipment)} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
