"use client";

import React, { useState, useEffect } from "react";
import { X, Sliders, Check } from "lucide-react";
import { Widget, WidgetType } from "./types";

interface WidgetEditorModalProps {
  isOpen: boolean;
  editingWidget: Widget | null;
  onClose: () => void;
  onSave: (widget: Partial<Widget>) => void;
}

const WIDGET_TYPES: { type: WidgetType; label: string; description: string }[] = [
  { type: "FormulaCard", label: "KPI Formula Card", description: "Single key metric value with target variance" },
  { type: "R0Gauge", label: "R0 Severity Gauge", description: "Circular gauge dial for risk index scores" },
  { type: "PredictiveTrendChart", label: "Predictive Area", description: "Area time-series chart with confidence bounds" },
  { type: "LineChart", label: "Line Chart", description: "Continuous data over time" },
  { type: "DataGrid", label: "Data Table Grid", description: "Tabular list view with search & columns" },
  { type: "BarChart", label: "Bar Comparison", description: "Categorical bar chart for relative volumes" },
  { type: "DonutChart", label: "Status Donut", description: "Distribution pie/donut chart breakdown" },
  { type: "RadarChart", label: "Radar Chart", description: "Multi-variable performance comparison" },
  { type: "ScatterChart", label: "Scatter Plot", description: "Correlation distribution of points" },
  { type: "MarkdownCard", label: "Rich Text", description: "Markdown or unstructured text notes" },
  { type: "JSONViewer", label: "JSON Payload", description: "Raw Cypher response visualization" },
  { type: "StatusList", label: "Status List", description: "List of items with status indicators" }
];

export default function WidgetEditorModal({
  isOpen,
  editingWidget,
  onClose,
  onSave
}: WidgetEditorModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WidgetType>("FormulaCard");

  useEffect(() => {
    if (editingWidget) {
      setTitle(editingWidget.title || "");
      setDescription(editingWidget.description || "");
      setType(editingWidget.type || "FormulaCard");
    } else {
      setTitle("New Custom Widget");
      setDescription("Custom metric visualizer");
      setType("FormulaCard");
    }
  }, [editingWidget, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editingWidget?.id,
      title,
      description,
      type
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#111111]/95 border border-[#333333] rounded-xl shadow-2xl overflow-hidden glass-panel font-sans text-xs text-[#f5f5f5]">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#171717]/80">
          <div className="flex items-center gap-2 text-[#4edea3]">
            <Sliders className="w-4 h-4" />
            <span className="label-caps text-sm text-[#f5f5f5]">
              {editingWidget ? "Edit Widget Settings" : "Add Custom Widget"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#f5f5f5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-mono">
          <div className="space-y-1">
            <label className="label-caps text-[#a3a3a3] text-[10px]">Widget Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-md text-xs outline-none focus:border-[#4edea3]/50 text-[#f5f5f5]"
              placeholder="e.g. Submittal R0 Severity Index"
            />
          </div>

          <div className="space-y-1">
            <label className="label-caps text-[#a3a3a3] text-[10px]">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-md text-xs outline-none focus:border-[#4edea3]/50 text-[#f5f5f5]"
              placeholder="Subtext explanation..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-caps text-[#a3a3a3] text-[10px]">Visualizer Type</label>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPES.map((wt) => (
                <div
                  key={wt.type}
                  onClick={() => setType(wt.type)}
                  className={`p-2.5 rounded-md border cursor-pointer transition-all space-y-1 glass-panel ${
                    type === wt.type
                      ? "border-[#4edea3] bg-[#4edea3]/10 text-[#f5f5f5]"
                      : "border-[#262626] bg-black/20 text-[#a3a3a3] hover:border-[#404040]"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{wt.label}</span>
                    {type === wt.type && <Check className="w-3.5 h-3.5 text-[#4edea3]" />}
                  </div>
                  <p className="text-[9px] text-[#737373] line-clamp-1">{wt.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 hover:bg-[#262626] rounded-md text-[#a3a3a3] label-caps text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4edea3] hover:bg-[#6cf8bb] text-[#003824] font-bold rounded-md label-caps text-[10px] flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{editingWidget ? "Save Changes" : "Create Widget"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
