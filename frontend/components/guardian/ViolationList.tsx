"use client";

import React from 'react';
import ViolationCard from './ViolationCard';
import type { GuardianViolation } from '@/components/guardian/types';

interface ViolationListProps {
  violations: GuardianViolation[];
  specDnaChain: Record<string, Array<Record<string, unknown>>>;
  onSelectViolation: (violation: GuardianViolation) => void;
}

export default function ViolationList({ violations, specDnaChain, onSelectViolation }: ViolationListProps) {
  const rows = Array.isArray(violations) ? violations : [];
  if (!rows.length) {
    return (
      <div className="mt-6 bg-surface-container-low rounded-lg border border-outline-variant p-6">
        <h3 className="text-lg font-bold text-on-surface">No deviations detected</h3>
        <p className="text-sm text-on-surface-variant mt-1">The uploaded submittal passed all specification compliance checks.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <h3 className="text-lg font-bold text-on-surface label-caps">Detected Violations ({rows.length})</h3>
      
      {rows.map((violation) => (
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
