"use client";

import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import SpecDnaChain from './SpecDnaChain';

export default function ViolationCard() {
  return (
    <div className="bg-surface-container-low rounded-lg border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.50)] relative overflow-hidden">
      {/* Absolute left indicator indicating error/alert (uses rounded-none as per DESIGN.md) */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-tertiary rounded-none"></div>
      
      <div className="flex justify-between items-start mb-6 pl-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {/* Critical status override uses rounded-none */}
            <span className="px-2 py-0.5 rounded-none text-[10px] font-bold tracking-[0.08em] uppercase bg-[rgba(255,179,173,0.15)] text-tertiary border border-[rgba(255,179,173,0.30)]">
              Critical
            </span>
            <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant font-mono">R0: 4.2</span>
          </div>
          <h3 className="text-[18px] font-bold text-on-surface font-sans tracking-wide">Maximum Ambient Temperature Deviation</h3>
        </div>
        <div className="p-2.5 bg-[rgba(255,179,173,0.1)] rounded-none text-tertiary border border-[rgba(255,179,173,0.2)]">
          <AlertCircle className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pl-3">
        <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-md border border-[rgba(255,255,255,0.05)]">
          <span className="block text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant mb-2 font-sans select-none">Expected (TIA-942-B)</span>
          <span className="text-xl font-semibold text-secondary font-mono tracking-[0.02em]">50°C</span>
        </div>
        <div className="bg-[rgba(255,179,173,0.03)] p-4 rounded-md border border-[rgba(255,179,173,0.15)] shadow-inner">
          <span className="block text-[12px] font-bold tracking-[0.08em] uppercase text-tertiary mb-2 font-sans select-none">Actual (Submittal)</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-tertiary font-mono tracking-[0.02em]">45°C</span>
            <ArrowRight className="w-4 h-4 text-tertiary" />
          </div>
        </div>
      </div>

      <div className="pl-3">
        <SpecDnaChain />
      </div>
    </div>
  );
}
