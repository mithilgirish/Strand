"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Network } from 'lucide-react';
import SupplierTree from '@/components/oracle/SupplierTree';
import AlternativesPanel from '@/components/oracle/AlternativesPanel';

// Dynamically import the map to avoid SSR issues with Leaflet
const SupplyMap = dynamic(() => import('@/components/oracle/SupplyMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] lg:h-full min-h-[400px] bg-surface-container-low flex flex-col items-center justify-center border border-[rgba(255,255,255,0.1)] rounded-lg animate-pulse">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
      <p className="text-on-surface-variant font-mono text-sm uppercase tracking-widest">Initializing Map...</p>
    </div>
  )
});

export default function OracleAgent() {
  return (
    <div className="flex flex-col h-full pb-12">
      {/* Page Title Header */}
      <div className="mb-6 select-none flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-on-surface flex items-center gap-3 font-sans tracking-wide">
            <Network className="w-7 h-7 text-primary" />
            ORACLE
          </h2>
          <p className="text-on-surface-variant mt-1.5 text-sm font-sans tracking-normal">
            Geospatial intelligence, predictive supply chain mapping, and risk resolution.
          </p>
        </div>
        <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Live Feed Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
        {/* Left Column: Map */}
        <div className="lg:col-span-2 h-[500px] lg:h-auto">
          <SupplyMap />
        </div>

        {/* Right Column: Panels */}
        <div className="flex flex-col gap-6">
          <div className="flex-1">
            <SupplierTree />
          </div>
          <div className="flex-1">
            <AlternativesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
