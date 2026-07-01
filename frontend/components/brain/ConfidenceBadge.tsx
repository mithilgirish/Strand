"use client";

import React from 'react';

export default function ConfidenceBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const colors = {
    High: 'bg-[rgba(78,222,163,0.15)] text-secondary border-[rgba(78,222,163,0.3)]',
    Medium: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    Low: 'bg-[rgba(255,179,173,0.15)] text-tertiary border-[rgba(255,179,173,0.3)]'
  };

  return (
    <div className={`px-2 py-0.5 rounded-full border text-[10px] label-caps ${colors[level]}`}>
      {level} Confidence
    </div>
  );
}
