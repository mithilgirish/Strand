"use client";

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface ImmunityScoreProps {
  score: number;
}

export default function ImmunityScore({ score }: ImmunityScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 2.5;
      if (current >= score) {
        current = score;
        clearInterval(interval);
      }
      setAnimatedScore(current);
    }, 30);
    return () => clearInterval(interval);
  }, [score]);

  // Color classes mapping to DESIGN.md
  // Green > 80 (secondary), Amber 60-80 (warning), Red < 60 (tertiary)
  let statusColor = 'text-secondary';
  let borderColor = 'border-[rgba(78,222,163,0.30)]';
  let glowColor = 'shadow-[0_0_15px_rgba(78,222,163,0.15)]';
  let Icon = ShieldCheck;
  
  if (score < 60) {
    statusColor = 'text-tertiary';
    borderColor = 'border-[rgba(255,179,173,0.30)]';
    glowColor = 'shadow-[0_0_15px_rgba(255,179,173,0.15)]';
    Icon = ShieldAlert;
  } else if (score < 80) {
    statusColor = 'text-yellow-500';
    borderColor = 'border-yellow-500/30';
    glowColor = 'shadow-[0_0_15px_rgba(234,179,8,0.15)]';
    Icon = Shield;
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-lg border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] ${borderColor} ${glowColor} relative overflow-hidden h-full shadow-[0_4px_20px_rgba(0,0,0,0.50)]`}>
      <Icon className={`w-8 h-8 mb-2 ${statusColor}`} />
      
      <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans mb-1 select-none">
        Project Immune Health
      </span>
      
      <div className={`text-5xl font-semibold font-mono tracking-[0.02em] ${statusColor}`}>
        {animatedScore.toFixed(1)}%
      </div>
    </div>
  );
}
