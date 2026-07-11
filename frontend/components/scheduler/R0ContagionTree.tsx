"use client";

import React, { useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';

interface ContagionNode {
  id: string;
  name: string;
  r0: number; // Infection score
  status: 'infected' | 'vulnerable' | 'safe';
  children?: ContagionNode[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'infected': return 'text-red-500 bg-red-500/10 border-red-500/30';
    case 'vulnerable': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'safe': return 'text-green-500 bg-green-500/10 border-green-500/30';
    default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
};

const TreeNode = ({ node, isRoot = false }: { node: ContagionNode, isRoot?: boolean }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const StatusIcon = node.status === 'infected' ? AlertTriangle :
                     node.status === 'vulnerable' ? Activity : ShieldCheck;

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative flex flex-col items-center p-3 rounded-lg border shadow-sm transition-all cursor-pointer hover:shadow-md ${getStatusColor(node.status)} ${isRoot ? 'w-48' : 'w-40'} z-10`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 mb-2 w-full justify-center">
          <StatusIcon className="w-4 h-4" />
          <span className="font-bold text-xs uppercase tracking-wider">{node.status}</span>
        </div>
        <h4 className="text-sm font-bold text-center leading-tight mb-2 text-on-surface">{node.name}</h4>
        <div className="bg-[rgba(0,0,0,0.2)] px-2 py-1 rounded text-xs font-mono font-bold">
          R0: {node.r0.toFixed(1)}
        </div>
        
        {/* Collapse indicator — only shown when there are children */}
        {hasChildren && (
          <div className="absolute -bottom-2.5 flex items-center justify-center">
            {expanded
              ? <ChevronDown className="w-4 h-4 opacity-60" />
              : <ChevronRight className="w-4 h-4 opacity-60" />}
          </div>
        )}
      </div>

      {/* Children Container */}
      {hasChildren && expanded && (
        <div className="relative flex justify-center mt-8 gap-6 pt-4">
          {/* Horizontal connection line */}
          {node.children!.length > 1 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] h-px bg-outline-variant opacity-50"></div>
          )}
          {/* Vertical line from parent to horizontal line */}
          <div className="absolute top-[-2rem] left-1/2 w-px h-8 bg-outline-variant opacity-50 -translate-x-1/2"></div>
          
          {node.children!.map((child) => (
            <div key={child.id} className="relative flex flex-col items-center">
              {/* Vertical line to child */}
              <div className="absolute -top-4 left-1/2 w-px h-4 bg-outline-variant opacity-50 -translate-x-1/2"></div>
              <TreeNode node={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function R0ContagionTree() {
  const dummyData: ContagionNode = {
    id: 'root',
    name: 'Generator Installation',
    r0: 2.8,
    status: 'infected',
    children: [
      {
        id: 'c1',
        name: 'Cooling Tower Setup',
        r0: 1.5,
        status: 'vulnerable',
        children: [
          { id: 'c1-1', name: 'Water Piping', r0: 0.5, status: 'safe' }
        ]
      },
      {
        id: 'c2',
        name: 'Electrical Switchgear',
        r0: 2.1,
        status: 'infected',
        children: [
          { id: 'c2-1', name: 'Transformer Testing', r0: 1.1, status: 'vulnerable' },
          { id: 'c2-2', name: 'Cable Routing', r0: 0.2, status: 'safe' }
        ]
      }
    ]
  };

  return (
    <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-6 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full overflow-x-auto custom-scrollbar font-sans">
      <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant flex items-center gap-2 mb-8 border-b border-[rgba(255,255,255,0.1)] pb-3 sticky left-0">
        <Activity className="w-4 h-4 text-primary" />
        R0 Cascading Delay Tree
      </h3>
      
      <div className="flex justify-center min-w-max pb-4">
        <TreeNode node={dummyData} isRoot={true} />
      </div>
    </div>
  );
}
