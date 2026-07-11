import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, Factory, Zap } from 'lucide-react';

interface SupplierNode {
  id: string;
  name: string;
  tier: number;
  status: 'critical' | 'warning' | 'healthy';
  children?: SupplierNode[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'critical': return 'text-red-500';
    case 'warning': return 'text-yellow-500';
    case 'healthy': return 'text-green-500';
    default: return 'text-gray-400';
  }
};

const TreeNode = ({ node }: { node: SupplierNode }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const getTierIcon = () => {
    switch (node.tier) {
      case 1: return <Building2 className="w-4 h-4 text-primary" />;
      case 2: return <Factory className="w-4 h-4 text-on-surface-variant" />;
      default: return <Zap className="w-4 h-4 text-on-surface-variant" />;
    }
  };

  return (
    <div className="ml-4 first:ml-0">
      <div 
        className={`flex items-center gap-2 py-2 px-2 hover:bg-[rgba(255,255,255,0.05)] rounded-md cursor-pointer select-none transition-colors ${hasChildren ? '' : 'ml-6'}`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          isExpanded ? 
            <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : 
            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
        )}
        {getTierIcon()}
        <span className="text-sm font-medium text-on-surface flex-1">{node.name}</span>
        <span className="text-xs text-on-surface-variant bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.1)]">
          Tier {node.tier}
        </span>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(node.status)} bg-current ml-2 shadow-[0_0_8px_currentColor]`} />
      </div>
      
      {isExpanded && hasChildren && (
        <div className="border-l border-[rgba(255,255,255,0.1)] ml-3 pl-2 mt-1 space-y-1">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function SupplierTree() {
  const dummyTreeData: SupplierNode[] = [
    {
      id: 's1',
      name: 'Global Tech Assembly (Tier 1)',
      tier: 1,
      status: 'warning',
      children: [
        {
          id: 's1-1',
          name: 'Precision Motors Co.',
          tier: 2,
          status: 'healthy',
          children: [
            { id: 's1-1-1', name: 'Raw Copper Mining Ltd', tier: 3, status: 'healthy' }
          ]
        },
        {
          id: 's1-2',
          name: 'Advanced Silicons Inc.',
          tier: 2,
          status: 'critical',
          children: [
            { id: 's1-2-1', name: 'Rare Earth Elements Corp', tier: 3, status: 'warning' },
            { id: 's1-2-2', name: 'Chemical Processors Ltd', tier: 3, status: 'critical' }
          ]
        }
      ]
    }
  ];

  return (
    <div className="bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg p-5 shadow-[0_4px_20px_rgba(0,0,0,0.30)] w-full font-sans overflow-hidden">
      <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface-variant flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.1)] pb-3">
        Supplier Dependency Tree
      </h3>
      <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {dummyTreeData.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
