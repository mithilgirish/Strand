"use client";

import React from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export interface Milestone {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'delayed' | 'pending';
  plannedDate: string;
  projectedDate?: string;
  delayRisk: number; // Percentage
  impactScore: number; // 0-10
}

interface MilestoneCardProps {
  milestone: Milestone;
  selected?: boolean;
  onSelect?: () => void;
}

export default function MilestoneCard({ milestone, selected = false, onSelect }: MilestoneCardProps) {
  const isDelayed = milestone.status === 'delayed' || milestone.delayRisk > 50;

  return (
    <button type="button" onClick={onSelect} className={`w-full p-4 rounded-lg border bg-surface-container relative overflow-hidden transition-colors text-left ${
      selected ? 'border-primary ring-1 ring-primary/30' : isDelayed ? 'border-red-500/30 hover:border-red-500/50' : 'border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]'
    }`}>
      {isDelayed && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-none"></div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          {milestone.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : milestone.status === 'delayed' ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-500" />
          )}
          <h4 className="font-bold text-on-surface text-base">{milestone.name}</h4>
        </div>
        
        <div className="text-right">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
            milestone.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
            milestone.status === 'delayed' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
            milestone.status === 'in_progress' ? 'bg-primary/20 text-primary border border-primary/30' :
            'bg-gray-500/10 text-gray-500 border border-gray-500/20'
          }`}>
            {milestone.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 bg-[rgba(255,255,255,0.02)] p-3 rounded border border-[rgba(255,255,255,0.03)]">
        <div>
          <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Planned Date</span>
          <span className="text-sm font-mono text-on-surface">{milestone.plannedDate}</span>
        </div>
        <div>
          <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Projected Date</span>
          <span className={`text-sm font-mono ${isDelayed ? 'text-red-400 font-bold' : 'text-on-surface'}`}>
            {milestone.projectedDate || milestone.plannedDate}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Delay Risk</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div 
                className={`h-full ${milestone.delayRisk > 50 ? 'bg-red-500' : milestone.delayRisk > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${milestone.delayRisk}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono">{milestone.delayRisk}%</span>
          </div>
        </div>
        <div>
          <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Impact Score</span>
          <span className="text-sm font-mono text-on-surface">{milestone.impactScore.toFixed(1)} / 10</span>
        </div>
      </div>
    </button>
  );
}
