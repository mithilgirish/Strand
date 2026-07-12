"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { TaskActivity } from './types';
export type { TaskActivity } from './types';

interface CriticalPathTimelineProps {
  data: TaskActivity[];
}
export default function CriticalPathTimeline({ data }: CriticalPathTimelineProps) {
  // Format data for stacked bar chart to simulate Gantt
  const chartData = data.map((task) => ({
    name: task.name,
    offset: task.startDay,
    duration: task.duration,
    critical: task.critical,
    atRisk: task.atRisk,
    r0Score: task.r0Score,
    // Add end day for tooltip
    endDay: task.startDay + task.duration,
  }));

  return (
    <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full h-[460px] flex flex-col font-sans">
      <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.1)] pb-3">
        <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant">
          Critical Path Timeline
        </h3>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500/80"></div>
            <span className="text-on-surface-variant">Critical Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/80"></div>
            <span className="text-on-surface-variant">Standard</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              stroke="#76777d" 
              tick={{ fill: '#76777d', fontSize: 12 }}
              domain={[0, 'dataMax + 5']}
              tickFormatter={(val) => `Day ${val}`}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#76777d"
              tick={{ fill: '#c6c6cd', fontSize: 12 }}
              width={210}
              interval={0}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#24252b', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4 }} />
            
            {/* The invisible offset bar to push the duration bar to the start day */}
            <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
            
            {/* The actual duration bar */}
            <Bar dataKey="duration" stackId="a" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.atRisk ? 'rgba(239, 68, 68, 0.85)' : entry.critical ? 'rgba(245, 158, 11, 0.8)' : 'var(--color-primary)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
