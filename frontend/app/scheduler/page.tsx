"use client";

import React from 'react';
import { Calendar } from 'lucide-react';

export default function SchedulerAgent() {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-outline-variant">
        <Calendar className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-3xl font-black text-on-surface mb-2 tracking-wider label-caps">
        Scheduler Agent
      </h2>
      
      <p className="text-on-surface-variant max-w-md mb-10 text-lg">
        Critical path analysis and delay prediction.
      </p>
      
      <div className="bg-surface-container border-2 border-dashed border-outline-variant rounded-xl p-12 max-w-2xl w-full flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-[rgba(229,229,229,0.05)] border border-outline-variant flex items-center justify-center mb-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-on-surface">
          CPM Graph Coming Soon
        </h3>
        <p className="text-sm text-on-surface-variant mt-2">
          (Phase 2 Implementation)
        </p>
      </div>
    </div>
  );
}
