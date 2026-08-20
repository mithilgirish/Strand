"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  X, 
  Check, 
  Sliders, 
  LayoutGrid, 
  Sparkles,
  Layers
} from "lucide-react";
import { Widget, WidgetType } from "./types";

interface ConfigureWidgetModalProps {
  isOpen: boolean;
  widget: Widget | null;
  onClose: () => void;
  onSave: (updatedWidget: Widget) => void;
}

export default function ConfigureWidgetModal({
  isOpen,
  widget,
  onClose,
  onSave
}: ConfigureWidgetModalProps) {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [type, setType] = useState<WidgetType>("FormulaCard");
  const [width, setWidth] = useState<number>(6);
  const [height, setHeight] = useState<number>(3);

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || "");
      setDescription(widget.description || "");
      setType(widget.type || "FormulaCard");
      setWidth(Number(widget.w) || 6);
      setHeight(Number(widget.h) || 3);
    }
  }, [widget]);

  if (!isOpen || !widget) return null;

  const handleSave = () => {
    onSave({
      ...widget,
      title: title.trim() || widget.title || widget.type,
      description: description.trim(),
      type,
      w: Math.min(12, Math.max(2, width)),
      h: Math.max(2, height)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#111317] border border-[#262a33] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Specular Edge Highlight */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22262f] bg-[#0c0d10]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f5f5f5] font-sans">
                Configure Widget Properties
              </h2>
              <p className="text-xs text-[#8c93a0] font-mono mt-0.5">
                Widget: <span className="text-[#e1e4ea] font-bold">{widget.title || widget.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#262a33] rounded-md text-[#8c93a0] hover:text-[#f5f5f5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar bg-[#111317] font-mono text-xs">
          
          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-[#8c93a0] text-[11px] block mb-1.5 font-bold uppercase tracking-wider">
                Display Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Submittal Variance KPI"
                className="w-full bg-[#161920] border border-[#2b313d] rounded-md px-3 py-2 text-xs text-[#e1e4ea] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all font-sans"
              />
            </div>

            <div>
              <label className="text-[#8c93a0] text-[11px] block mb-1.5 font-bold uppercase tracking-wider">
                Subtitle / Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Calculated from Neo4j knowledge graph"
                className="w-full bg-[#161920] border border-[#2b313d] rounded-md px-3 py-2 text-xs text-[#e1e4ea] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all font-sans"
              />
            </div>
          </div>

          {/* Visualizer Type */}
          <div>
            <label className="text-[#8c93a0] text-[11px] block mb-1.5 font-bold uppercase tracking-wider">
              Visualization Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WidgetType)}
              className="w-full bg-[#161920] border border-[#2b313d] rounded-md px-3 py-2 text-xs text-[#e1e4ea] focus:outline-none focus:border-[#4edea3]"
            >
              <option value="FormulaCard">Formula Card (Large Metric / KPI)</option>
              <option value="R0Gauge">R0 Risk Severity Radial Gauge</option>
              <option value="DataGrid">Filterable Tabular Data Grid</option>
              <option value="PredictiveTrendChart">Predictive Area Forecast Chart</option>
              <option value="BarChart">Categorical Bar Breakdown Chart</option>
              <option value="DonutChart">Status Distribution Donut Ring</option>
              <option value="LineChart">Time-Series Line Chart</option>
              <option value="RadarChart">Multi-Axis Vendor Radar Matrix</option>
              <option value="ScatterChart">Scatter Plot Correlation</option>
              <option value="MarkdownCard">Rich Markdown Notes & Documentation</option>
              <option value="JSONViewer">Raw JSON Payload Inspector</option>
              <option value="StatusList">Live Activity Status Feed</option>
            </select>
          </div>

          {/* Grid Dimensions */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[#161920]/80 border border-[#262a33]">
            <div>
              <label className="text-[#8c93a0] text-[11px] block mb-1 font-bold uppercase tracking-wider">
                Columns Width (1 - 12)
              </label>
              <select
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full bg-[#0c0d10] border border-[#2b313d] rounded px-3 py-1.5 text-xs text-[#e1e4ea] focus:outline-none focus:border-[#4edea3]"
              >
                <option value={3}>3 Columns (1/4 Width)</option>
                <option value={4}>4 Columns (1/3 Width)</option>
                <option value={6}>6 Columns (Half Width)</option>
                <option value={8}>8 Columns (2/3 Width)</option>
                <option value={12}>12 Columns (Full Width)</option>
              </select>
            </div>

            <div>
              <label className="text-[#8c93a0] text-[11px] block mb-1 font-bold uppercase tracking-wider">
                Rows Height (2 - 6)
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full bg-[#0c0d10] border border-[#2b313d] rounded px-3 py-1.5 text-xs text-[#e1e4ea] focus:outline-none focus:border-[#4edea3]"
              >
                <option value={2}>2 Rows (Compact ~240px)</option>
                <option value={3}>3 Rows (Standard ~360px)</option>
                <option value={4}>4 Rows (Expanded ~480px)</option>
                <option value={5}>5 Rows (Large ~600px)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#22262f] bg-[#0c0d10]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1d24] hover:bg-[#262a33] border border-[#303540] rounded-md text-xs font-mono text-[#c5cbd6] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded-md text-xs font-mono flex items-center gap-2 transition-all shadow-[0_0_14px_rgba(78,222,163,0.30)] cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>

      </div>
    </div>
  );
}
