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
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 ${bgColor}80; }
          70% { box-shadow: 0 0 0 10px ${bgColor}00; }
          100% { box-shadow: 0 0 0 0 ${bgColor}00; }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

const dummyShipments: (ShipmentData & { lat: number; lng: number })[] = [
  {
    id: 'shp1',
    item: 'Precision Motors',
    supplier: 'Global Tech Assembly',
    status: 'green',
    eta: 'Oct 24, 2026',
    riskFactor: '',
    lat: 18.5204, // Pune
    lng: 73.8567
  },
  {
    id: 'shp2',
    item: 'Control Boards',
    supplier: 'Advanced Silicons Inc.',
    status: 'red',
    eta: 'Oct 28, 2026 (Delayed)',
    riskFactor: 'Port Strike',
    lat: 13.0827, // Chennai
    lng: 80.2707
  },
  {
    id: 'shp3',
    item: 'Cooling Systems',
    supplier: 'Thermal Dynamics Ltd',
    status: 'amber',
    eta: 'Oct 25, 2026',
    riskFactor: 'Weather Alert',
    lat: 19.0760, // Mumbai
    lng: 72.8777
  },
  {
    id: 'shp4',
    item: 'Steel Frames',
    supplier: 'Heavy Metals Co',
    status: 'green',
    eta: 'Oct 22, 2026',
    riskFactor: '',
    lat: 28.7041, // Delhi
    lng: 77.1025
  }
];

export default function SupplyMap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-full bg-surface-container-low flex items-center justify-center border border-[rgba(255,255,255,0.1)] rounded-lg">Loading Map...</div>;
  }

  return (
    <div className="w-full h-full min-h-[400px] bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.30)] relative">
      <div className="absolute top-4 left-4 z-[1000] bg-surface-container/90 backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-2 shadow-lg">
        <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface">Oracle Live Tracking</h3>
        <p className="text-[10px] text-on-surface-variant">Real-time geospatial intelligence</p>
      </div>

      <MapContainer 
        center={[20.5937, 78.9629]} // Center of India
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
        
        {dummyShipments.map(shipment => (
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

      <style jsx global>{`
        .oracle-custom-popup .leaflet-popup-content-wrapper {
          background: #ffffff;
          color: #1f2937;
          border-radius: 8px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        }
        .oracle-custom-popup .leaflet-popup-tip {
          background: #ffffff;
        }
        .oracle-custom-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .leaflet-container {
          background: #0f1115;
          font-family: inherit;
        }
        .leaflet-bar a, .leaflet-bar a:hover {
          background-color: #1a1d24;
          color: #e2e2e2;
          border-color: rgba(255,255,255,0.1);
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          color: #e2e2e2 !important;
        }
      `}</style>
    </div>
  );
}
