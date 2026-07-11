"use client";

import React, { useEffect, useState } from 'react';

interface R0GaugeProps {
  score: number; // 0-10 scale
}

const getColor = (val: number) => {
  if (val >= 7) return '#ef4444'; // red — critical
  if (val >= 4) return '#eab308'; // amber — elevated
  return '#22c55e'; // green — healthy
};

export default function R0Gauge({ score }: R0GaugeProps) {
  const [animated, setAnimated] = useState(false);

  // Defer to next tick so the CSS transition fires after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const color = getColor(score);

  // SVG arc — 270° (¾ circle), starting bottom-left
  const radius = 54;
  const strokeWidth = 11;
  const r = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const offset = animated ? arcLength - (score / 10) * arcLength : arcLength;
  const size = radius * 2;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.30)] relative min-h-[200px]">
      <h3 className="absolute top-4 left-4 text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant">
        System R0 Factor
      </h3>

      <div className="relative flex items-center justify-center mt-6" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[135deg]"
        >
          {/* Track arc */}
          <circle
            r={r}
            cx={radius}
            cy={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Value arc */}
          <circle
            r={r}
            cx={radius}
            cy={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        {/* Center label — positioned absolutely to sit inside the SVG */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-black font-mono leading-none"
            style={{ color }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
            R0 Risk
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm text-center text-on-surface-variant max-w-[180px] leading-snug">
        Contagion probability across dependent tasks.
      </p>
    </div>
  );
}
