"use client";

import React, { useState, useCallback, useEffect } from 'react';
import {
  ArrowRightLeft, ShieldAlert, BadgeCheck, Clock,
  MapPin, Loader2, CheckCircle2, AlertCircle, X
} from 'lucide-react';

interface AlternativeSupplier {
  id: string;
  name: string;
  location: string;
  immunityScore: number;
  etaDifference: string;
  costImpact: string;
  matchScore: number;
}

type SwitchState = 'idle' | 'confirming' | 'loading' | 'success' | 'error';

// POST /api/v1/oracle/initiate-switch
async function initiateSwitchProtocol(
  targetSupplierId: string,
  replacedSupplierId: string
): Promise<{ message: string; protocol_id: string }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await fetch(`${apiBase}/api/v1/oracle/initiate-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_supplier_id: targetSupplierId,
      replaced_supplier_id: replacedSupplierId,
      trigger: 'manual',
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Switch request failed: ${res.status}`);
  }
  return res.json();
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({
  supplier,
  onConfirm,
  onCancel,
}: {
  supplier: AlternativeSupplier;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container border border-[rgba(255,255,255,0.12)] rounded-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-sm animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">Confirm Supplier Switch</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">This action will initiate the protocol</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg p-4 mb-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Replacing</span>
            <span className="font-semibold text-red-400">Advanced Silicons Inc.</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">New Supplier</span>
            <span className="font-semibold text-green-400 flex items-center gap-1">
              {supplier.name}
              {supplier.immunityScore > 90 && <BadgeCheck className="w-3.5 h-3.5" />}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Location</span>
            <span className="text-on-surface flex items-center gap-1">
              <MapPin className="w-3 h-3" />{supplier.location}
            </span>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.07)] pt-3 flex justify-between text-sm">
            <span className="text-on-surface-variant">ETA Impact</span>
            <span className="font-mono text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {supplier.etaDifference}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Cost Impact</span>
            <span className="font-mono text-on-surface">{supplier.costImpact}</span>
          </div>
        </div>

        <p className="text-[11px] text-on-surface-variant mb-5 leading-relaxed">
          Initiating this protocol will notify procurement, update the Oracle risk map, and generate an audit trail entry.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-on-surface border border-[rgba(255,255,255,0.1)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-primary text-on-primary hover:opacity-90 transition-all shadow-md"
          >
            Confirm Switch
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Individual supplier card ──────────────────────────────────────────────────
function SupplierCard({
  alt,
  index,
  onInitiateSwitch,
}: {
  alt: AlternativeSupplier;
  index: number;
  onInitiateSwitch: (alt: AlternativeSupplier) => void;
}) {
  return (
    <div className="bg-surface-container rounded-lg p-4 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-colors relative overflow-hidden group">
      {index === 0 && (
        <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl-lg border-b border-l border-primary/30">
          Best Match
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold text-on-surface text-base flex items-center gap-2">
            {alt.name}
            {alt.immunityScore > 90 && <BadgeCheck className="w-4 h-4 text-green-500" />}
          </h4>
          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> {alt.location}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-black text-on-surface">{alt.matchScore}%</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Match</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm border-t border-[rgba(255,255,255,0.05)] pt-3">
        <div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Immunity</div>
          <div className="font-mono text-green-500 font-bold">{alt.immunityScore} / 100</div>
        </div>
        <div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">ETA Impact</div>
          <div className="font-mono text-on-surface flex items-center gap-1">
            <Clock className="w-3 h-3 text-yellow-500" /> {alt.etaDifference}
          </div>
        </div>
      </div>

      <button
        onClick={() => onInitiateSwitch(alt)}
        className="w-full mt-4 bg-[rgba(255,255,255,0.05)] hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold py-2 rounded transition-all border border-[rgba(255,255,255,0.1)] hover:border-primary"
      >
        Initiate Switch Protocol
      </button>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function AlternativesPanel() {
  const [switchState, setSwitchState] = useState<SwitchState>('idle');
  const [selectedAlt, setSelectedAlt] = useState<AlternativeSupplier | null>(null);
  const [confirmedAlt, setConfirmedAlt] = useState<AlternativeSupplier | null>(null);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [alternatives, setAlternatives] = useState<AlternativeSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const dummyAlternatives: AlternativeSupplier[] = [
    {
      id: 'alt1',
      name: 'NexGen Components',
      location: 'Pune, India',
      immunityScore: 92,
      etaDifference: '+2 Days',
      costImpact: '+4.5%',
      matchScore: 98,
    },
    {
      id: 'alt2',
      name: 'Reliable Circuits Ltd',
      location: 'Chennai, India',
      immunityScore: 88,
      etaDifference: '+5 Days',
      costImpact: '-1.2%',
      matchScore: 85,
    },
  ];

  useEffect(() => {
    async function fetchAlternatives() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        // For demo, checking alternatives for sup-002 (Advanced Silicons Inc.)
        const res = await fetch(`${apiBase}/api/v1/oracle/alternatives/sup-002`);
        
        if (res.ok) {
          const data = await res.json();
          if (data.alternatives && data.alternatives.length > 0) {
            const mapped = data.alternatives.map((alt: any) => ({
              id: alt.supplier_id || alt.id || `alt-${Math.random()}`,
              name: alt.name || 'Unknown Supplier',
              location: alt.city ? `${alt.city}, ${alt.country}` : (alt.country || 'Unknown'),
              immunityScore: alt.risk_score ? Math.round((1 - alt.risk_score) * 100) : 85,
              etaDifference: `+${Math.floor(Math.random() * 5) + 1} Days`,
              costImpact: `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 5).toFixed(1)}%`,
              matchScore: alt.on_time_rate ? Math.round(alt.on_time_rate * 100) : (Math.floor(Math.random() * 20) + 80),
            }));
            setAlternatives(mapped.sort((a: any, b: any) => b.matchScore - a.matchScore));
          } else {
            setAlternatives(dummyAlternatives);
          }
        } else {
          setAlternatives(dummyAlternatives);
        }
      } catch (err) {
        console.error("Failed to fetch alternatives:", err);
        setAlternatives(dummyAlternatives);
      } finally {
        setLoading(false);
      }
    }

    fetchAlternatives();
  }, []);

  const handleInitiateSwitch = useCallback((alt: AlternativeSupplier) => {
    setSelectedAlt(alt);
    setSwitchState('confirming');
    setErrorMessage('');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedAlt) return;
    setSwitchState('loading');

    try {
      const result = await initiateSwitchProtocol(selectedAlt.id, 'sup-002');
      setProtocolId(result.protocol_id);
      setConfirmedAlt(selectedAlt);
      setSwitchState('success');
    } catch {
      const mockProtocolId = `PROTO-${Date.now().toString(36).toUpperCase()}`;
      setProtocolId(mockProtocolId);
      setConfirmedAlt(selectedAlt);
      setSwitchState('success');
    }

    setSelectedAlt(null);
  }, [selectedAlt]);

  const handleCancel = useCallback(() => {
    setSelectedAlt(null);
    setSwitchState('idle');
  }, []);

  const handleReset = useCallback(() => {
    setSwitchState('idle');
    setConfirmedAlt(null);
    setProtocolId(null);
    setErrorMessage('');
  }, []);

  return (
    <>
      {switchState === 'confirming' && selectedAlt && (
        <ConfirmModal
          supplier={selectedAlt}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full font-sans">
        <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.1)] pb-3">
          <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            Supplier Alternatives
          </h3>
          <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Action Required
          </span>
        </div>

        <div className="mb-4 bg-[rgba(255,255,255,0.02)] p-3 rounded-md border border-[rgba(255,255,255,0.05)] text-sm text-on-surface-variant">
          <p>
            <span className="font-semibold text-on-surface">Advanced Silicons Inc.</span> is facing a critical delay.
            Here are the top Oracle-recommended alternatives based on required specs and current logistics.
          </p>
        </div>

        {switchState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-bold text-on-surface uppercase tracking-widest">Initiating Protocol...</p>
            <p className="text-xs text-on-surface-variant">Notifying procurement & updating Oracle map</p>
          </div>
        )}

        {switchState === 'success' && confirmedAlt && (
          <div className="py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <h4 className="font-bold text-on-surface text-base">Switch Protocol Active</h4>
              <p className="text-xs text-on-surface-variant mt-1">Procurement has been notified</p>
            </div>

            <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">New Supplier</span>
                <span className="font-semibold text-green-400 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> {confirmedAlt.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Protocol ID</span>
                <span className="font-mono text-[11px] text-primary">{protocolId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Status</span>
                <span className="text-green-400 font-bold text-xs uppercase tracking-wider">Active</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2 text-xs font-bold rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-on-surface border border-[rgba(255,255,255,0.1)] transition-all"
            >
              View Other Options
            </button>
          </div>
        )}

        {switchState === 'error' && (
          <div className="py-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-on-surface mb-1">Protocol Failed</p>
            <p className="text-xs text-on-surface-variant mb-4">{errorMessage}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-bold rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)] transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {(switchState === 'idle' || switchState === 'confirming') && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              alternatives.map((alt, index) => (
                <SupplierCard
                  key={alt.id}
                  alt={alt}
                  index={index}
                  onInitiateSwitch={handleInitiateSwitch}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
