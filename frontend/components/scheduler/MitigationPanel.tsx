"use client";

import React from 'react';
import { Lightbulb, Wrench, ShieldAlert } from 'lucide-react';

interface MitigationStrategy {
  id: string;
  title: string;
  description: string;
  impactRecovery: string; // e.g., "+3 Days"
  cost: string;
  aiConfidence: number;
}

export default function MitigationPanel() {
  const strategies: MitigationStrategy[] = [
    {
      id: 'm1',
      title: 'Accelerate Cooling Tower Delivery',
      description: 'Air freight cooling tower components instead of sea freight. Reduces delay by 4 days but increases logistics cost.',
      impactRecovery: '+4 Days',
      cost: '$12,500',
      aiConfidence: 94
    },
    {
      id: 'm2',
      title: 'Parallel Track Electrical Routing',
      description: 'Authorize weekend overtime for electrical crews to route cables before switchgear arrives.',
      impactRecovery: '+2 Days',
      cost: '$8,200',
      aiConfidence: 85
    }
  ];

  return (
    <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full font-sans h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.1)] pb-3">
        <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          AI Mitigations
        </h3>
        <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold flex items-center gap-1">
          RAG Generated
        </span>
      </div>

      <div className="mb-5 bg-[rgba(255,179,173,0.05)] border border-[rgba(255,179,173,0.15)] rounded-md p-3 flex gap-3 items-start text-sm">
        <ShieldAlert className="w-5 h-5 text-tertiary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-on-surface">Generator Delay Detected</p>
          <p className="text-on-surface-variant mt-1 text-xs">
            Brain has synthesized 2 optimal recovery paths based on past similar project recoveries.
          </p>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
        {strategies.map((strat, idx) => (
          <div key={strat.id} className="bg-surface-container rounded-lg p-4 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-colors group">
            {idx === 0 && (
              <div className="w-fit mb-2 bg-green-500/20 text-green-500 text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-green-500/30">
                Highest Confidence ({strat.aiConfidence}%)
              </div>
            )}
            
            <h4 className="font-bold text-on-surface text-base mb-1">{strat.title}</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              {strat.description}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4 bg-[rgba(255,255,255,0.02)] p-2 rounded border border-[rgba(255,255,255,0.03)] text-xs">
              <div>
                <span className="block text-[10px] text-on-surface-variant uppercase mb-1">Time Recovery</span>
                <span className="font-mono text-green-400 font-bold">{strat.impactRecovery}</span>
              </div>
              <div>
                <span className="block text-[10px] text-on-surface-variant uppercase mb-1">Est. Cost</span>
                <span className="font-mono text-on-surface">{strat.cost}</span>
              </div>
            </div>

            <button
              type="button"
              aria-label={`Apply mitigation: ${strat.title}`}
              className="w-full flex items-center justify-center gap-2 bg-[rgba(255,255,255,0.05)] hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold py-2 rounded transition-all border border-[rgba(255,255,255,0.1)] hover:border-primary"
            >
              <Wrench className="w-3.5 h-3.5" />
              Apply Mitigation
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
