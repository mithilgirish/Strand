"use client";

import React from 'react';

interface BrainAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function BrainAvatar({ size = 'md', animated = false }: BrainAvatarProps) {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-14 h-14',
  };
  const innerSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-xl flex items-center justify-center relative flex-shrink-0`}
      style={{
        background: 'linear-gradient(135deg, #4edea3 0%, #0f8a5f 50%, #0c3825 100%)',
        boxShadow: animated ? '0 0 18px rgba(78,222,163,0.45)' : '0 0 8px rgba(78,222,163,0.25)',
      }}
    >
      {animated && (
        <span className="absolute inset-0 rounded-xl brain-pulse-ring" />
      )}
      {/* Inner SVG — stylised brain node mesh */}
      <svg
        className={innerSize[size]}
        viewBox="0 0 20 20"
        fill="none"
      >
        <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.9)" />
        <circle cx="4" cy="6" r="1.5" fill="rgba(255,255,255,0.6)" />
        <circle cx="16" cy="6" r="1.5" fill="rgba(255,255,255,0.6)" />
        <circle cx="4" cy="14" r="1.5" fill="rgba(255,255,255,0.6)" />
        <circle cx="16" cy="14" r="1.5" fill="rgba(255,255,255,0.6)" />
        <line x1="10" y1="7" x2="4" y2="6" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="10" y1="7" x2="16" y2="6" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="10" y1="13" x2="4" y2="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="10" y1="13" x2="16" y2="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      </svg>
    </div>
  );
}
