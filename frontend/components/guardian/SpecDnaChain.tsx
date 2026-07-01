"use client";

import React from 'react';
import { FileText, HardDrive, ShoppingCart, FileCheck, AlertTriangle } from 'lucide-react';

export default function SpecDnaChain() {
  const nodes = [
    { id: 'n1', label: 'Contract Clause', value: '50°C', icon: FileText, color: 'bg-[#111c30] border-slate-600 text-slate-300' },
    { id: 'n2', label: 'BOQ', value: '50°C', icon: HardDrive, color: 'bg-[#0f2d59] border-blue-600 text-blue-300' },
    { id: 'n3', label: 'Purchase Order', value: '50°C', icon: ShoppingCart, color: 'bg-[#064e43] border-teal-600 text-teal-300' },
    { id: 'n4', label: 'Vendor Submittal', value: '45°C', icon: FileCheck, color: 'bg-[rgba(105,0,5,0.45)] border-tertiary text-tertiary', isMutation: true },
  ];

  return (
    <div className="mt-6 p-5 bg-[#0a0a0a] rounded-lg border border-outline-variant relative">
      <h4 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans mb-5 select-none">Spec-DNA Traceability</h4>
      
      <div className="flex items-center justify-between relative z-10">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <React.Fragment key={node.id}>
              <div className={`relative flex flex-col items-center w-24 group`}>
                {node.isMutation && (
                  <div className="absolute -top-3.5 -right-2">
                    <AlertTriangle className="w-5 h-5 text-tertiary fill-tertiary/20 animate-pulse" />
                  </div>
                )}
                
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2.5 shadow-lg transition-transform hover:scale-105 cursor-pointer ${node.color} ${node.isMutation ? 'shadow-[0_0_15px_rgba(255,179,173,0.30)] border-tertiary' : 'border-t-2 border-l-2'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-center tracking-[0.05em] leading-tight h-6 text-on-surface-variant font-sans">{node.label}</span>
                <span className={`text-[13px] font-semibold mt-1 font-mono tracking-[0.02em] ${node.isMutation ? 'text-tertiary' : 'text-on-surface'}`}>{node.value}</span>
              </div>
              
              {index < nodes.length - 1 && (
                <div className="flex-1 h-0.5 bg-outline-variant relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3.5px] border-t-transparent border-l-[6px] border-l-outline-variant border-b-[3.5px] border-b-transparent"></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
