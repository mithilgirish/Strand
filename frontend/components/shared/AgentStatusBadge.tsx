"use client";

import React from 'react';

interface AgentStatusBadgeProps {
  name: string;
  status: 'active' | 'processing' | 'idle';
}

export default function AgentStatusBadge({ name, status }: AgentStatusBadgeProps) {
  const getStatusColor = () => {
    if (status === 'active') return 'bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.5)]';
    if (status === 'processing') return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse';
    return 'bg-outline'; // idle
  };

  return (
    <div className="flex items-center gap-2.5 bg-[rgba(255,255,255,0.03)] border-t border-l border-[rgba(255,255,255,0.10)] border-r border-b border-[rgba(0,0,0,0.30)] px-4 py-2 rounded-md shadow-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">{name}</span>
      <span className="text-[9px] text-on-surface-variant/50 uppercase tracking-[0.08em] font-sans font-bold select-none">{status}</span>
    </div>
  );
}
