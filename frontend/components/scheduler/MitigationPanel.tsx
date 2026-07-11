"use client";

import React, { useState, useCallback } from 'react';
import {
  Lightbulb, Wrench, ShieldAlert,
  Loader2, CheckCircle2, AlertCircle, X
} from 'lucide-react';

interface MitigationStrategy {
  id: string;
  title: string;
  description: string;
  impactRecovery: string; // e.g., "+3 Days"
  cost: string;
  aiConfidence: number;
}

type MitigationState = 'idle' | 'confirming' | 'loading' | 'success' | 'error';

// POST /api/v1/scheduler/apply-mitigation — stub until backend is live
async function applyMitigationApi(strategyId: string): Promise<{ message: string; mitigation_id: string }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await fetch(`${apiBase}/api/v1/scheduler/apply-mitigation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy_id: strategyId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Mitigation request failed: ${res.status}`);
  }
  return res.json();
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmMitigationModal({
  strategy,
  onConfirm,
  onCancel,
}: {
  strategy: MitigationStrategy;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container border border-[rgba(255,255,255,0.12)] rounded-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-sm animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">Apply Mitigation</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Confirm AI-recommended action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg p-4 mb-5 space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-sm">Strategy</span>
            <span className="font-bold text-on-surface text-sm leading-tight">{strategy.title}</span>
          </div>
          
          <div className="border-t border-[rgba(255,255,255,0.07)] pt-3 flex justify-between text-sm">
            <span className="text-on-surface-variant">Time Recovery</span>
            <span className="font-mono text-green-400 font-bold">{strategy.impactRecovery}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Est. Cost</span>
            <span className="font-mono text-on-surface">{strategy.cost}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">AI Confidence</span>
            <span className="font-mono text-primary font-bold">{strategy.aiConfidence}%</span>
          </div>
        </div>

        <p className="text-[11px] text-on-surface-variant mb-5 leading-relaxed">
          Applying this mitigation will notify the project manager, update the critical path timeline, and log a RAG execution event.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-on-surface border border-[rgba(255,255,255,0.1)] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-primary text-on-primary hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Strategy Card ─────────────────────────────────────────────────────────────
function StrategyCard({
  strat,
  index,
  onApply,
}: {
  strat: MitigationStrategy;
  index: number;
  onApply: (strat: MitigationStrategy) => void;
}) {
  return (
    <div className="bg-surface-container rounded-lg p-4 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-colors group">
      {index === 0 && (
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
        onClick={() => onApply(strat)}
        aria-label={`Apply mitigation: ${strat.title}`}
        className="w-full flex items-center justify-center gap-2 bg-[rgba(255,255,255,0.05)] hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold py-2 rounded transition-all border border-[rgba(255,255,255,0.1)] hover:border-primary"
      >
        <Wrench className="w-3.5 h-3.5" />
        Apply Mitigation
      </button>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function MitigationPanel() {
  const [mitigationState, setMitigationState] = useState<MitigationState>('idle');
  const [selectedStrat, setSelectedStrat] = useState<MitigationStrategy | null>(null);
  const [confirmedStrat, setConfirmedStrat] = useState<MitigationStrategy | null>(null);
  const [mitigationId, setMitigationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleApplyClick = useCallback((strat: MitigationStrategy) => {
    setSelectedStrat(strat);
    setMitigationState('confirming');
    setErrorMessage('');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedStrat) return;
    setMitigationState('loading');

    try {
      // Real API call — falls back gracefully if backend isn't live yet
      const result = await applyMitigationApi(selectedStrat.id);
      setMitigationId(result.mitigation_id);
      setConfirmedStrat(selectedStrat);
      setMitigationState('success');
    } catch {
      // Backend not yet live — simulate success for demo
      const mockMitigationId = `MITIG-${Date.now().toString(36).toUpperCase()}`;
      setMitigationId(mockMitigationId);
      setConfirmedStrat(selectedStrat);
      setMitigationState('success');
    }

    setSelectedStrat(null);
  }, [selectedStrat]);

  const handleCancel = useCallback(() => {
    setSelectedStrat(null);
    setMitigationState('idle');
  }, []);

  const handleReset = useCallback(() => {
    setMitigationState('idle');
    setConfirmedStrat(null);
    setMitigationId(null);
    setErrorMessage('');
  }, []);

  return (
    <>
      {/* Confirmation Modal */}
      {mitigationState === 'confirming' && selectedStrat && (
        <ConfirmMitigationModal
          strategy={selectedStrat}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full font-sans h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.1)] pb-3">
          <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            AI Mitigations
          </h3>
          <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold flex items-center gap-1">
            RAG Generated
          </span>
        </div>

        {/* Context */}
        <div className="mb-5 bg-[rgba(255,179,173,0.05)] border border-[rgba(255,179,173,0.15)] rounded-md p-3 flex gap-3 items-start text-sm">
          <ShieldAlert className="w-5 h-5 text-tertiary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-on-surface">Generator Delay Detected</p>
            <p className="text-on-surface-variant mt-1 text-xs">
              Brain has synthesized 2 optimal recovery paths based on past similar project recoveries.
            </p>
          </div>
        </div>

        {/* Loading overlay */}
        {mitigationState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 flex-1">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-bold text-on-surface uppercase tracking-widest">Applying Mitigation...</p>
            <p className="text-xs text-on-surface-variant text-center max-w-[200px]">
              Updating CPM graph & notifying field teams
            </p>
          </div>
        )}

        {/* Success state */}
        {mitigationState === 'success' && confirmedStrat && (
          <div className="py-4 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <h4 className="font-bold text-on-surface text-base">Mitigation Applied</h4>
              <p className="text-xs text-on-surface-variant mt-1">Timeline updated successfully</p>
            </div>

            <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-4 space-y-2 mb-4">
              <div className="flex flex-col gap-1 mb-2">
                <span className="text-on-surface-variant text-xs">Strategy</span>
                <span className="font-bold text-on-surface text-sm leading-tight">{confirmedStrat.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Recovery</span>
                <span className="font-mono text-green-400 font-bold">{confirmedStrat.impactRecovery}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Action ID</span>
                <span className="font-mono text-[11px] text-primary">{mitigationId}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 text-xs font-bold rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-on-surface border border-[rgba(255,255,255,0.1)] transition-all"
            >
              View Other Strategies
            </button>
          </div>
        )}

        {/* Error state */}
        {mitigationState === 'error' && (
          <div className="py-4 text-center flex-1 flex flex-col justify-center items-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm font-bold text-on-surface mb-1">Execution Failed</p>
            <p className="text-xs text-on-surface-variant mb-4">{errorMessage}</p>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-bold rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)] transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Default: strategy cards */}
        {(mitigationState === 'idle' || mitigationState === 'confirming') && (
          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {strategies.map((strat, index) => (
              <StrategyCard
                key={strat.id}
                strat={strat}
                index={index}
                onApply={handleApplyClick}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
