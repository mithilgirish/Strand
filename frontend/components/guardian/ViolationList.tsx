"use client";

import React from 'react';
import ViolationCard from './ViolationCard';
import type { GuardianViolation } from '@/app/guardian/page';

interface ViolationListProps {
  violations: GuardianViolation[];
  specDnaChain: Record<string, Array<Record<string, unknown>>>;
  onSelectViolation: (violation: GuardianViolation) => void;
}

export default function ViolationList({ violations, specDnaChain, onSelectViolation }: ViolationListProps) {
  if (!violations.length) {
    return (
      <div className="mt-6 bg-surface-container-low rounded-lg border border-outline-variant p-6">
        <h3 className="text-lg font-bold text-on-surface">No deviations detected</h3>
        <p className="text-sm text-on-surface-variant mt-1">The uploaded submittal passed the Phase 1 specification checks.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <h3 className="text-lg font-bold text-on-surface label-caps">Detected Violations ({violations.length})</h3>
      
      {violations.map((violation) => (
        <div
          key={violation.id}
          className="cursor-pointer transition-transform hover:-translate-y-1"
          onClick={() => onSelectViolation(violation)}
        >
          <ViolationCard
            violation={violation}
            chain={specDnaChain[violation.parameter] || []}
          />
        </div>
      ))}
    </div>
  );
}
