"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShipmentPopup, { ShipmentData } from './ShipmentPopup';

// Create custom div icons to avoid default Leaflet icon path issues and match our theme
const createCustomIcon = (status: 'green' | 'amber' | 'red') => {
  const colorMap = {
    red: '#ef4444',
    amber: '#eab308',
    green: '#22c55e'
  };

  const bgColor = colorMap[status];

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 10px ${bgColor};
        animation: shipment-pulse 2s infinite;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

interface MapShipment extends ShipmentData {
  lat: number;
  lng: number;
}

const fallbackShipments: MapShipment[] = [
  {
    id: 'shp1',
    item: 'Precision Motors',
    supplier: 'Global Tech Assembly',
    status: 'green',
    eta: 'Oct 24, 2026',
    riskFactor: '',
    lat: 18.5204,
    lng: 73.8567
  },
  {
    id: 'shp2',
    item: 'Control Boards',
    supplier: 'Advanced Silicons Inc.',
    status: 'red',
    eta: 'Oct 28, 2026 (Delayed)',
    riskFactor: 'Port Strike',
    lat: 13.0827,
    lng: 80.2707
  },
  {
    id: 'shp3',
    item: 'Cooling Systems',
    supplier: 'Thermal Dynamics Ltd',
    status: 'amber',
    eta: 'Oct 25, 2026',
    riskFactor: 'Weather Alert',
    lat: 19.0760,
    lng: 72.8777
  },
  {
    id: 'shp4',
    item: 'Steel Frames',
    supplier: 'Heavy Metals Co',
    status: 'green',
    eta: 'Oct 22, 2026',
    riskFactor: '',
    lat: 28.7041,
    lng: 77.1025
  }
];

function mapGeoJsonToShipments(geojson: any): MapShipment[] {
  if (!geojson?.features) return [];

  return geojson.features
    .filter((f: any) => f.geometry?.coordinates)
    .map((f: any) => {
      const props = f.properties || {};
      const [lng, lat] = f.geometry.coordinates;
      const delayDays = props.delay_days || 0;
      const riskFlag = props.risk_flag || false;

      let status: 'green' | 'amber' | 'red' = 'green';
      if (riskFlag || delayDays > 7) status = 'red';
      else if (delayDays > 0 && delayDays <= 7) status = 'amber';

      return {
        id: props.shipment_id || f.id || `shp-${Math.random()}`,
        item: props.equipment_tag || 'Unknown Equipment',
        supplier: props.supplier_name || 'Unknown Supplier',
        status,
        eta: props.expected_delivery || props.eta || 'TBD',
        riskFactor: riskFlag ? (props.status || 'At Risk') : '',
        lat,
        lng,
      };
    });
}

export default function SupplyMap() {
  const [shipments, setShipments] = useState<MapShipment[]>(fallbackShipments);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShipments() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiBase}/api/v1/oracle/shipments`);

        if (res.ok) {
          const geojson = await res.json();
          const mapped = mapGeoJsonToShipments(geojson);
          if (mapped.length > 0) {
            setShipments(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to fetch shipments, using fallback:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchShipments();
  }, []);

  const atRiskCount = shipments.filter(s => s.status === 'red').length;
  const totalCount = shipments.length;

  return (
    <div className="w-full h-full min-h-[400px] bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.30)] relative">
      <div className="absolute top-4 left-4 z-[1000] bg-surface-container/90 backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-2 shadow-lg">
        <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface">Oracle Live Tracking</h3>
        <p className="text-[10px] text-on-surface-variant">
          {totalCount} shipments · {atRiskCount} at-risk
        </p>
      </div>

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />

        {shipments.map(shipment => (
          <Marker
            key={shipment.id}
            position={[shipment.lat, shipment.lng]}
            icon={createCustomIcon(shipment.status)}
          >
            <Popup className="oracle-custom-popup">
              <ShipmentPopup shipment={shipment} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
