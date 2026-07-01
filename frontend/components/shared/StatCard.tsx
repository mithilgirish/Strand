"use client";

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'secondary' | 'tertiary' | 'warning';
}

export default function StatCard({ label, value, trend, color = 'primary' }: StatCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-tertiary" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-secondary" />;
    if (trend === 'neutral') return <Minus className="w-4 h-4 text-on-surface-variant" />;
    return null;
  };

  const colorMap = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    warning: 'text-yellow-500'
  };

  return (
    <div className="bg-surface-container-low rounded-lg border-t border-l border-[rgba(255,255,255,0.15)] border-r border-b border-[rgba(0,0,0,0.40)] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.50)] flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant font-sans select-none">{label}</span>
        {getTrendIcon()}
      </div>
      <div className={`text-4xl font-semibold font-mono tracking-[0.02em] ${colorMap[color]}`}>
        {value}
      </div>
    </div>
  );
}
