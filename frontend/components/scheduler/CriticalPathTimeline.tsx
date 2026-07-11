"use client";

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export interface TaskActivity {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  critical: boolean;
}

interface CriticalPathTimelineProps {
  data: TaskActivity[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface-container border border-[rgba(255,255,255,0.1)] p-3 rounded-md shadow-lg font-sans text-sm">
        <p className="font-bold text-on-surface mb-1">{data.name}</p>
        <p className="text-on-surface-variant">Start: Day {data.offset}</p>
        <p className="text-on-surface-variant">Duration: {data.duration} Days</p>
        <p className="text-on-surface-variant">End: Day {data.endDay}</p>
        {data.critical && (
          <p className="text-red-500 font-bold mt-1 text-xs uppercase tracking-wider">Critical Path</p>
        )}
      </div>
    );
  }
  return null;
};

export default function CriticalPathTimeline({ data }: CriticalPathTimelineProps) {
  // Format data for stacked bar chart to simulate Gantt
  const chartData = data.map((task) => ({
    name: task.name,
    offset: task.startDay,
    duration: task.duration,
    critical: task.critical,
    // Add end day for tooltip
    endDay: task.startDay + task.duration,
  }));

  return (
    <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full h-[400px] flex flex-col font-sans">
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
              width={150}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            
            {/* The invisible offset bar to push the duration bar to the start day */}
            <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
            
            {/* The actual duration bar */}
            <Bar dataKey="duration" stackId="a" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.critical ? 'rgba(239, 68, 68, 0.8)' : 'var(--color-primary)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
