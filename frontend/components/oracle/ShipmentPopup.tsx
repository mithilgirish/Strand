import React from 'react';
import { Package, Truck, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface ShipmentData {
  id: string;
  item: string;
  supplier: string;
  status: 'green' | 'amber' | 'red';
  eta: string;
  riskFactor: string;
}

interface ShipmentPopupProps {
  shipment: ShipmentData;
}

export default function ShipmentPopup({ shipment }: ShipmentPopupProps) {
  const getStatusColor = () => {
    switch (shipment.status) {
      case 'red': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'amber': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'green': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const StatusIcon = shipment.status === 'red' ? AlertTriangle : 
                     shipment.status === 'amber' ? Truck : ShieldCheck;

  return (
    <div className="p-1 min-w-[200px] font-sans">
      <div className="flex items-center gap-2 mb-3 border-b border-gray-200/20 pb-2">
        <Package className="w-5 h-5 text-primary" />
        <h4 className="font-bold text-gray-800 m-0 text-base">{shipment.item}</h4>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span className="font-semibold">Supplier:</span>
          <span>{shipment.supplier}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">ETA:</span>
          <span>{shipment.eta}</span>
        </div>
        {shipment.riskFactor && (
          <div className="flex justify-between">
            <span className="font-semibold">Risk:</span>
            <span className="text-xs text-red-600 font-medium bg-red-50 px-1 rounded">{shipment.riskFactor}</span>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${getStatusColor()} font-semibold text-xs uppercase tracking-wider justify-center`}>
        <StatusIcon className="w-4 h-4" />
        {shipment.status === 'red' ? 'Critical Delay' : 
         shipment.status === 'amber' ? 'At Risk' : 'On Track'}
      </div>
    </div>
  );
}
