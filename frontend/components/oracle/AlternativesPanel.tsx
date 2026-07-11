import React from 'react';
import { ArrowRightLeft, ShieldAlert, BadgeCheck, Clock, MapPin } from 'lucide-react';

interface AlternativeSupplier {
  id: string;
  name: string;
  location: string;
  immunityScore: number;
  etaDifference: string;
  costImpact: string;
  matchScore: number;
}

export default function AlternativesPanel() {
  const alternatives: AlternativeSupplier[] = [
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
    }
  ];

  return (
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
          <span className="font-semibold text-on-surface">Advanced Silicons Inc.</span> is facing a critical delay. Here are the top Oracle-recommended alternatives based on required specs and current logistics.
        </p>
      </div>

      <div className="space-y-4">
        {alternatives.map((alt, index) => (
          <div key={alt.id} className="bg-surface-container rounded-lg p-4 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-colors relative overflow-hidden group">
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
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Impact</div>
                <div className="font-mono text-on-surface flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-500" /> {alt.etaDifference}
                </div>
              </div>
            </div>

            <button className="w-full mt-4 bg-[rgba(255,255,255,0.05)] hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold py-2 rounded transition-all border border-[rgba(255,255,255,0.1)] hover:border-primary">
              Initiate Switch Protocol
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
