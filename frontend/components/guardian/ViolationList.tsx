"use client";

import React from 'react';
import ViolationCard from './ViolationCard';

interface ViolationListProps {
  onSelectViolation: () => void;
}

export default function ViolationList({ onSelectViolation }: ViolationListProps) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <h3 className="text-lg font-bold text-on-surface label-caps">Detected Violations (1)</h3>
      
      <div 
        className="cursor-pointer transition-transform hover:-translate-y-1"
        onClick={onSelectViolation}
      >
        <ViolationCard />
      </div>
    </div>
  );
}
