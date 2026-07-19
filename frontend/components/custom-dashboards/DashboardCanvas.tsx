"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart as RechartsLineChart,
  Line,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart as RechartsScatterChart,
  Scatter
} from "recharts";
import { Responsive as ResponsiveGridLayout, Layout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Cpu,
  Zap,
  RefreshCw,
  Plus,
  Save,
  SlidersHorizontal,
  LayoutGrid,
  Edit2,
  Trash2,
  Copy,
  Layers,
  AlertTriangle,
  TrendingUp,
  Table as TableIcon,
  Activity,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  ChevronDown,
  FileCode,
  FileText,
  Code,
  List
} from "lucide-react";
import { Widget, SavedDashboard, WidgetData, DashboardRow } from "./types";

interface DashboardCanvasProps {
  currentDashboard: SavedDashboard | null;
  widgetData: Record<string, WidgetData>;
  loadingData: Record<string, boolean>;
  isGenerating: boolean;
  onRefreshData: () => void;
  onOpenSaveModal: () => void;
  onExportJson: () => void;
  onAddWidget: () => void;
  onDeleteWidget: (widgetId: string) => void;
  onDuplicateWidget: (widget: Widget) => void;
  onLoadPreset: (presetKey: string) => void;
  onLayoutChange?: (layout: Layout) => void;
  onUpdateWidget?: (widget: Widget) => void;
}

const CHART_COLORS = ["#4edea3", "#38bdf8", "#a855f7", "#f59e0b", "#ffb3ad", "#ec4899"];

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function getRows(data: WidgetData | undefined): DashboardRow[] {
  return Array.isArray(data) ? data : [];
}

function firstValue(data: WidgetData | undefined): number | string | null {
  const rows = getRows(data);
  if (!rows[0]) return null;
  const val = Object.values(rows[0])[0];
  return typeof val === "number" || typeof val === "string" ? val : null;
}
export default function DashboardCanvas({
  currentDashboard,
  widgetData,
  loadingData,
  isGenerating,
  onRefreshData,
  onOpenSaveModal,
  onExportJson,
  onAddWidget,
  onDeleteWidget,
  onDuplicateWidget,
  onLoadPreset,
  onLayoutChange,
  onUpdateWidget
}: DashboardCanvasProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [tempWidgetConfig, setTempWidgetConfig] = useState<Partial<Widget>>({});

  const handleOpenSettings = (widget: Widget) => {
    setEditingWidgetId(widget.id);
    setTempWidgetConfig({ title: widget.title, description: widget.description, type: widget.type, metricKey: widget.metricKey });
  };

  const handleSaveSettings = (widget: Widget) => {
    if (onUpdateWidget) {
      onUpdateWidget({ ...widget, ...tempWidgetConfig });
    }
    setEditingWidgetId(null);
  };

  return (
    <div className="space-y-6 bg-[#111111] min-h-[calc(100vh-100px)] p-4 sm:p-6 rounded-xl transition-colors glass-panel">
      {/* CANVAS HEADER BAR - Industrial Glass Specification */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-sans tracking-tight text-[#f5f5f5]">
              {currentDashboard?.dashboard_name || "Real-Time Dashboard Canvas"}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.60)] animate-pulse" style={{ background: 'radial-gradient(circle, #4edea3 40%, transparent 70%)' }} />
              Live
            </span>
          </div>
          <p className="text-xs text-[#a3a3a3] font-mono mt-1">
            Parametric Knowledge Graph Visualizers
          </p>
        </div>

        {/* Toolbar Action Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Preset templates menu */}
          <div className="relative group">
            <button className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#333333] rounded-md text-[#e5e5e5] flex items-center gap-1.5 transition-all label-caps text-[10px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.40)]">
              <LayoutGrid className="w-3.5 h-3.5 text-[#4edea3]" />
              <span>Presets</span>
              <ChevronDown className="w-3 h-3 text-[#737373]" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#171717] border border-[#333333] rounded-md shadow-2xl p-1 z-50 hidden group-hover:block glass-panel">
              <button
                onClick={() => onLoadPreset("datacenter")}
                className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded transition-colors font-mono"
              >
                Data Center Facilities
              </button>
              <button
                onClick={() => onLoadPreset("submittal")}
                className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded transition-colors font-mono"
              >
                Submittal & R0 Severity
              </button>
              <button
                onClick={() => onLoadPreset("logistics")}
                className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded transition-colors font-mono"
              >
                Equipment Logistics
              </button>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefreshData}
            className="p-1.5 bg-[#171717] hover:bg-[#262626] border border-[#333333] rounded-md text-[#e5e5e5] transition-all relative hover:shadow-[0_4px_12px_rgba(0,0,0,0.40)]"
            title="Sync Data Now"
          >
            <RefreshCw className="w-4 h-4 text-[#4edea3]" />
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            className="p-1.5 bg-[#171717] hover:bg-[#262626] border border-[#333333] rounded-md text-[#a3a3a3] hover:text-[#4edea3] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.40)]"
            title="Export Layout Config JSON"
          >
            <FileCode className="w-4 h-4" />
          </button>

          {/* Toggle Rearrange Edit Mode */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 rounded-md border transition-all flex items-center gap-1.5 label-caps text-[10px] ${
              editMode
                ? "bg-[#4edea3]/20 border-[#4edea3] text-[#4edea3] font-bold"
                : "bg-[#171717] border-[#333333] text-[#a3a3a3] hover:text-[#e5e5e5]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{editMode ? "Done Editing" : "Customize"}</span>
          </button>

          {/* Add Custom Widget */}
          <button
            onClick={onAddWidget}
            className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#333333] rounded-md text-[#4edea3] flex items-center gap-1 transition-all label-caps text-[10px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Widget</span>
          </button>

          {/* Save Dashboard Option */}
          <button
            onClick={onOpenSaveModal}
            className="px-3.5 py-1.5 text-[#003824] font-bold rounded-md flex items-center gap-1.5 transition-all shadow-md label-caps text-[10px] hover:shadow-[0_0_12px_rgba(78,222,163,0.40)] active:shadow-[inset_0_4px_4px_rgba(0,0,0,0.40)]"
            style={{ background: 'linear-gradient(to bottom, #6cf8bb, #4edea3)', borderTop: '1px solid rgba(255,255,255,0.30)' }}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Custom Layout</span>
          </button>
        </div>
      </div>

      {/* FILTER & QUICK SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#171717]/60 border border-[#262626] rounded-lg font-mono text-xs glass-panel">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#737373]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter widget parameters & values..."
            className="w-full bg-transparent border-none outline-none text-[#e5e5e5] placeholder-[#525252]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[#737373] label-caps text-[10px]">
            <Filter className="w-3.5 h-3.5" />
            <span>Range:</span>
          </div>
          {(["7d", "30d", "90d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2 py-0.5 rounded text-[11px] transition-all uppercase label-caps ${
                timeRange === r ? "bg-[#4edea3]/20 text-[#4edea3] font-bold" : "text-[#737373] hover:text-[#e5e5e5]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* REAL-TIME GENERATING LAZY LOADING OVERLAY */}
      {isGenerating && (
        <div className="p-6 rounded-lg border border-[#4edea3]/40 bg-[#171717]/90 relative overflow-hidden space-y-4 animate-in fade-in duration-300 glass-panel">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4edea3] via-[#38bdf8] to-[#a855f7] animate-pulse" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[#4edea3]/10 border border-[#4edea3]/40 text-[#4edea3]">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold label-caps text-[#f5f5f5] flex items-center gap-2">
                  Synthesizing Real-Time Dashboard...
                </h3>
                <p className="text-xs text-[#a3a3a3] font-mono">
                  Assembling data visualizers and binding knowledge graph query engines.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#4edea3]/10 text-[#4edea3] font-mono text-xs border border-[#4edea3]/30 uppercase tracking-widest animate-pulse label-caps">
              Building Canvas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 rounded-lg border border-dashed border-[#4edea3]/30 bg-black/40 p-4 flex flex-col justify-between animate-pulse relative"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-[#4edea3]/20 rounded" />
                  <div className="h-3 w-16 bg-[#262626] rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-8 w-1/2 bg-[#4edea3]/10 rounded" />
                  <div className="h-3 w-3/4 bg-[#262626] rounded" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#4edea3]/60">
                  <span>● Processing Node #{i}</span>
                  <span>Compiling Cypher AST...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD WIDGETS GRID */}
      {currentDashboard && currentDashboard.layout.length > 0 ? (
        <div ref={containerRef} className="w-full">
          {mounted && (
            <ResponsiveGridLayout
              width={width}
              className="layout"
              layouts={{ lg: currentDashboard.layout.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })) }}
              cols={{ lg: 2, md: 2, sm: 1, xs: 1, xxs: 1 }}
              rowHeight={320}
              onLayoutChange={(layout) => {
                if (onLayoutChange) onLayoutChange(layout);
              }}
              dragConfig={{ enabled: editMode, handle: ".drag-handle" }}
              resizeConfig={{ enabled: editMode }}
              margin={[24, 24]}
            >
          {currentDashboard.layout.map((widget, index) => {
            const data = widgetData[widget.id];
            const isLoading = loadingData[widget.id];
            const rows = getRows(data);
            const val = firstValue(data);
            const primaryNumber = typeof val === "number" ? val : parseFloat(String(val ?? 0)) || 0;

            const isExpanded = expandedWidgetId === widget.id;

            return (
              <div
                key={widget.id}
                className={isExpanded ? "fixed inset-8 z-[100] bg-[#111] rounded-xl border border-[#4edea3]/50 shadow-2xl p-6 glass-panel flex flex-col" : `relative rounded-lg glass-panel flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-[#4edea3]/40 hover:shadow-[0_4px_24px_rgba(78,222,163,0.08)]`}
                style={isExpanded ? {} : { padding: "20px", width: "100%", height: "100%" }}
              >
                {/* Specular Milled Edge — top + left highlight per DESIGN.md */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />
                <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10" />

                {/* Widget Header Bar */}
                <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid #1a1a1a', boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-black/40 border border-[#262626] text-[#4edea3]">
                      {widget.type === "R0Gauge" && <Activity className="w-4 h-4" />}
                      {widget.type === "PredictiveTrendChart" && <TrendingUp className="w-4 h-4" />}
                      {widget.type === "FormulaCard" && <Zap className="w-4 h-4" />}
                      {widget.type === "DataGrid" && <TableIcon className="w-4 h-4" />}
                      {widget.type === "BarChart" && <Layers className="w-4 h-4" />}
                      {widget.type === "DonutChart" && <LayoutGrid className="w-4 h-4" />}
                      {widget.type === "LineChart" && <TrendingUp className="w-4 h-4" />}
                      {widget.type === "RadarChart" && <Maximize2 className="w-4 h-4" />}
                      {widget.type === "ScatterChart" && <LayoutGrid className="w-4 h-4" />}
                      {widget.type === "MarkdownCard" && <FileText className="w-4 h-4" />}
                      {widget.type === "JSONViewer" && <Code className="w-4 h-4" />}
                      {widget.type === "StatusList" && <List className="w-4 h-4" />}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold label-caps text-[#f5f5f5]">
                        {widget.title || widget.type}
                      </h3>
                      {widget.description && (
                        <p className="text-[10px] text-[#a3a3a3] font-mono">{widget.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Widget Action Toolbar */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedWidgetId(isExpanded ? null : widget.id)}
                      className="p-1 hover:bg-[#262626] rounded text-[#737373] hover:text-[#f5f5f5] transition-colors"
                      title={isExpanded ? "Minimize" : "Maximize"}
                    >
                      {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>

                    {editMode && (
                      <>
                        <div className="drag-handle cursor-move p-1 hover:bg-[#262626] rounded text-[#737373] hover:text-[#e5e5e5]">
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </div>
                        <button
                          onClick={() => onDuplicateWidget(widget)}
                          className="p-1 hover:bg-[#262626] rounded text-[#737373] hover:text-[#f5f5f5]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenSettings(widget)}
                          className="p-1 hover:bg-[#262626] rounded text-[#737373] hover:text-[#4edea3]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteWidget(widget.id)}
                          className="p-1 hover:bg-[#262626] rounded text-[#737373] hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Local Settings Pop-Up */}
                {editingWidgetId === widget.id && (
                  <div className="absolute inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md p-5 flex flex-col justify-center animate-in zoom-in-95 duration-200 rounded-lg">
                    <h4 className="text-sm font-bold text-[#4edea3] mb-4 label-caps">Configure Widget</h4>
                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <label className="text-[#a3a3a3] block mb-1">Title</label>
                        <input 
                          type="text" 
                          value={tempWidgetConfig.title || ""} 
                          onChange={(e) => setTempWidgetConfig({...tempWidgetConfig, title: e.target.value})} 
                          className="w-full bg-[#0a0a0a] border border-[#333333] rounded-sm px-2.5 py-1.5 text-[#e5e5e5] focus:outline-none focus:border-[#e5e5e5] focus:shadow-[0_0_8px_rgba(229,229,229,0.25)] transition-all"
                          style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.60)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[#a3a3a3] block mb-1">Description</label>
                        <input 
                          type="text" 
                          value={tempWidgetConfig.description || ""} 
                          onChange={(e) => setTempWidgetConfig({...tempWidgetConfig, description: e.target.value})} 
                          className="w-full bg-[#0a0a0a] border border-[#333333] rounded-sm px-2.5 py-1.5 text-[#e5e5e5] focus:outline-none focus:border-[#e5e5e5] focus:shadow-[0_0_8px_rgba(229,229,229,0.25)] transition-all"
                          style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.60)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[#a3a3a3] block mb-1">Visualization Type</label>
                        <select 
                          value={tempWidgetConfig.type || ""} 
                          onChange={(e) => setTempWidgetConfig({...tempWidgetConfig, type: e.target.value as import("./types").WidgetType})}
                          className="w-full bg-[#0a0a0a] border border-[#333333] rounded-sm px-2.5 py-1.5 text-[#e5e5e5] focus:outline-none focus:border-[#e5e5e5] focus:shadow-[0_0_8px_rgba(229,229,229,0.25)] transition-all"
                          style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.60)' }}
                        >
                          <option value="FormulaCard">Formula Card</option>
                          <option value="R0Gauge">R0 Gauge</option>
                          <option value="DataGrid">Data Grid</option>
                          <option value="PredictiveTrendChart">Trend Chart</option>
                          <option value="BarChart">Bar Chart</option>
                          <option value="DonutChart">Donut Chart</option>
                          <option value="LineChart">Line Chart</option>
                          <option value="RadarChart">Radar Chart</option>
                          <option value="ScatterChart">Scatter Chart</option>
                          <option value="MarkdownCard">Markdown</option>
                          <option value="JSONViewer">JSON Viewer</option>
                          <option value="StatusList">Status List</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button onClick={() => setEditingWidgetId(null)} className="px-3 py-1.5 rounded-md border border-[#333333] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs font-mono transition-all glass-panel hover:shadow-[0_4px_12px_rgba(0,0,0,0.40)]">Cancel</button>
                      <button onClick={() => handleSaveSettings(widget)} className="px-3 py-1.5 rounded-md text-[#003824] font-bold text-xs font-mono transition-all hover:shadow-[0_0_12px_rgba(78,222,163,0.40)] active:shadow-[inset_0_4px_4px_rgba(0,0,0,0.40)]" style={{ background: 'linear-gradient(to bottom, #6cf8bb, #4edea3)', borderTop: '1px solid rgba(255,255,255,0.30)' }}>Save</button>
                    </div>
                  </div>
                )}

                {/* Widget Content Render */}
                <div className="flex-1 flex flex-col justify-center relative">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-xs font-mono text-[#737373] space-y-2">
                      <RefreshCw className="w-5 h-5 text-[#4edea3] animate-spin" />
                      <span>Executing Graph Query...</span>
                    </div>
                  ) : data && "error" in data ? (
                    <div className="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{data.error}</span>
                    </div>
                  ) : (
                    <>
                      {/* FORMULA CARD */}
                      {widget.type === "FormulaCard" && (
                        <div className="py-6 font-mono text-center space-y-3">
                          <div className="text-5xl font-extrabold tracking-tight text-[#f5f5f5]" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
                            {val !== null ? formatCellValue(val) : "42.8"}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] font-bold flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> +12.4%
                            </span>
                            <span className="text-[#737373]">vs target baseline</span>
                          </div>
                        </div>
                      )}

                      {/* R0 SEVERITY GAUGE */}
                      {widget.type === "R0Gauge" && (
                        <div className="py-4 font-mono text-center space-y-3">
                          <div className="relative inline-flex flex-col items-center justify-center">
                            <div className="w-32 h-32 rounded-full border-[3px] border-[#4edea3]/50 flex items-center justify-center relative bg-black/40 shadow-[0_0_20px_rgba(78,222,163,0.25),inset_0_0_12px_rgba(78,222,163,0.08)]">
                              <span className="text-4xl font-extrabold text-[#4edea3]" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.02em', textShadow: '0 0 12px rgba(78,222,163,0.40)' }}>
                                {Number.isFinite(primaryNumber) ? primaryNumber.toFixed(1) : "3.4"}
                              </span>
                            </div>
                            <span className="mt-2 label-caps text-[10px] text-[#a3a3a3]">
                              R0 Risk Severity Index
                            </span>
                          </div>
                          <div className="flex justify-center gap-4 text-[10px] font-mono">
                            <span className="text-[#4edea3] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'radial-gradient(circle, #4edea3 40%, transparent 70%)', boxShadow: '0 0 6px rgba(78,222,163,0.50)' }} />Normal (&lt; 2.0)</span>
                            <span className="text-amber-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'radial-gradient(circle, #fbbf24 40%, transparent 70%)', boxShadow: '0 0 6px rgba(251,191,36,0.50)' }} />Moderate (2 - 4)</span>
                            <span className="text-[#ffb3ad] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'radial-gradient(circle, #ffb3ad 40%, transparent 70%)', boxShadow: '0 0 6px rgba(255,179,173,0.50)' }} />Critical (&gt; 4)</span>
                          </div>
                        </div>
                      )}

                      {/* DATA GRID */}
                      {widget.type === "DataGrid" && (
                        <div className="overflow-x-auto max-h-[260px] overflow-y-auto font-mono text-xs custom-scrollbar">
                          {rows.length > 0 ? (
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[#737373] label-caps text-[10px]" style={{ borderBottom: '1px solid #1a1a1a', boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
                                  {Object.keys(rows[0]).map((key) => (
                                    <th key={key} className="pb-2 pr-4 font-bold tracking-widest">{key}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1a1a1a]">
                                {rows
                                  .filter((r) =>
                                    !searchFilter ||
                                    Object.values(r).some((v) =>
                                      formatCellValue(v).toLowerCase().includes(searchFilter.toLowerCase())
                                    )
                                  )
                                  .map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                      {Object.entries(row).map(([, cellVal], j) => {
                                        const isNumeric = typeof cellVal === 'number' || /^-?[\d.]+$/.test(String(cellVal));
                                        return (
                                          <td key={j} className={`py-2 pr-4 truncate max-w-[180px] ${isNumeric ? 'font-mono text-[#4edea3] mono-data' : 'text-[#a3a3a3]'}`}>
                                            {formatCellValue(cellVal)}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-8 text-[#525252]">No grid records returned.</div>
                          )}
                        </div>
                      )}

                      {/* PREDICTIVE TREND CHART */}
                      {widget.type === "PredictiveTrendChart" && (
                        <div className="h-52 w-full pt-2">
                          {rows.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={rows}>
                                <defs>
                                  <linearGradient id={`grad_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="date" stroke="#525252" fontSize={10} />
                                <YAxis stroke="#525252" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }} />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill={`url(#grad_${widget.id})`}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-center py-10 text-[#525252] font-mono">
                              Insufficient time-series payload.
                            </div>
                          )}
                        </div>
                      )}

                      {/* BAR CHART */}
                      {widget.type === "BarChart" && (
                        <div className="h-52 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={rows.length > 0 ? rows : [
                              { name: "Unit A", count: 24 },
                              { name: "Unit B", count: 18 },
                              { name: "Unit C", count: 32 },
                              { name: "Unit D", count: 12 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis dataKey="name" stroke="#525252" fontSize={10} />
                              <YAxis stroke="#525252" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }} />
                              <Bar dataKey="count" fill="#4edea3" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* DONUT CHART */}
                      {widget.type === "DonutChart" && (
                        <div className="h-52 w-full pt-2 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={rows.length > 0 ? rows : [
                                  { name: "Low Risk", value: 60 },
                                  { name: "Moderate", value: 25 },
                                  { name: "Critical", value: 15 }
                                ]}
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {CHART_COLORS.map((col, idx) => (
                                  <Cell key={`cell-${idx}`} fill={col} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }} />
                              <Legend />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* LINE CHART */}
                      {widget.type === "LineChart" && (
                        <div className="h-52 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={rows.length > 0 ? rows : [
                              { date: "Day 1", value: 12 },
                              { date: "Day 2", value: 18 },
                              { date: "Day 3", value: 15 },
                              { date: "Day 4", value: 25 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis dataKey={Object.keys(rows[0] || {date:""})[0]} stroke="#525252" fontSize={10} />
                              <YAxis stroke="#525252" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }} />
                              <Line type="monotone" dataKey={Object.keys(rows[0] || {value:""})[1] || "value"} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[index % CHART_COLORS.length] }} />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* RADAR CHART */}
                      {widget.type === "RadarChart" && (
                        <div className="h-52 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsRadarChart data={rows.length > 0 ? rows : [
                              { subject: "Speed", A: 120, fullMark: 150 },
                              { subject: "Power", A: 98, fullMark: 150 },
                              { subject: "Efficiency", A: 86, fullMark: 150 },
                              { subject: "Security", A: 99, fullMark: 150 }
                            ]} outerRadius="80%">
                              <PolarGrid stroke="#262626" />
                              <PolarAngleAxis dataKey={Object.keys(rows[0] || {subject:""})[0]} tick={{ fill: "#a3a3a3", fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: "#525252", fontSize: 10 }} />
                              <Radar name="Metric" dataKey={Object.keys(rows[0] || {A:""})[1] || "A"} stroke={CHART_COLORS[index % CHART_COLORS.length]} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.4} />
                              <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }} />
                            </RechartsRadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* SCATTER CHART */}
                      {widget.type === "ScatterChart" && (
                        <div className="h-52 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsScatterChart>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis dataKey={Object.keys(rows[0] || {x:""})[0]} type="number" stroke="#525252" fontSize={10} name="X Axis" />
                              <YAxis dataKey={Object.keys(rows[0] || {y:""})[1] || "y"} type="number" stroke="#525252" fontSize={10} name="Y Axis" />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }} />
                              <Scatter name="Data" data={rows.length > 0 ? rows : [
                                { x: 10, y: 30 }, { x: 30, y: 200 }, { x: 45, y: 100 },
                                { x: 50, y: 400 }, { x: 70, y: 150 }, { x: 100, y: 250 }
                              ]} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            </RechartsScatterChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* MARKDOWN / TEXT CARD */}
                      {widget.type === "MarkdownCard" && (
                        <div className="overflow-y-auto max-h-[260px] p-2 text-sm text-[#d4d4d4] font-sans leading-relaxed custom-scrollbar whitespace-pre-wrap">
                          {rows.length > 0 && typeof Object.values(rows[0])[0] === 'string'
                            ? String(Object.values(rows[0])[0])
                            : "No text data provided. Add a query that returns a text string to display rich text notes here."}
                        </div>
                      )}

                      {/* JSON VIEWER */}
                      {widget.type === "JSONViewer" && (
                        <div className="overflow-y-auto max-h-[260px] p-3 bg-[#111] rounded border border-[#262626] font-mono text-[10px] text-[#a3a3a3] custom-scrollbar">
                          <pre>{JSON.stringify(rows, null, 2)}</pre>
                        </div>
                      )}

                      {/* STATUS LIST */}
                      {widget.type === "StatusList" && (
                        <div className="overflow-y-auto max-h-[260px] custom-scrollbar font-mono text-xs">
                          {rows.length > 0 ? (
                            <ul className="space-y-2">
                              {rows.map((r, i) => {
                                const vals = Object.values(r);
                                const label = formatCellValue(vals[0]);
                                const status = vals.length > 1 ? String(vals[1]).toLowerCase() : 'unknown';
                                let statusColor = "bg-[#262626] text-[#a3a3a3]";
                                if (status.includes('ok') || status.includes('active') || status.includes('normal')) statusColor = "bg-[#4edea3]/20 text-[#4edea3]";
                                else if (status.includes('warn') || status.includes('moderate')) statusColor = "bg-amber-400/20 text-amber-400";
                                else if (status.includes('crit') || status.includes('err') || status.includes('fail')) statusColor = "bg-[#ffb3ad]/20 text-[#ffb3ad]";

                                return (
                                  <li key={i} className="flex items-center justify-between p-2 rounded bg-black/40 border border-[#262626]">
                                    <span className="text-[#e5e5e5] truncate pr-4">{label}</span>
                                    {vals.length > 1 && (
                                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${statusColor}`}>
                                        {formatCellValue(vals[1])}
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="text-center py-8 text-[#525252]">No list items returned.</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-lg h-[450px] text-center p-8 space-y-5 glass-panel relative overflow-hidden">
          {/* Specular edges on empty state */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          <div className="p-4 rounded-full bg-[#171717] border border-[#262626] text-[#4edea3]" style={{ boxShadow: '0 0 16px rgba(78,222,163,0.12)' }}>
            <LayoutGrid className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold label-caps text-[#f5f5f5]">
              Real-Time Dashboard Uninitialized
            </h3>
            <p className="text-xs text-[#737373] max-w-md font-mono mt-2 leading-relaxed">
              Use the AI Agent Chat sidebar on the right to prompt and synthesize real-time data center engineering dashboards.
            </p>
          </div>
          <button
            onClick={() => onLoadPreset("datacenter")}
            className="px-4 py-2 rounded-md text-xs font-mono text-[#003824] font-bold transition-all flex items-center gap-2 label-caps hover:shadow-[0_0_12px_rgba(78,222,163,0.40)] active:shadow-[inset_0_4px_4px_rgba(0,0,0,0.40)]"
            style={{ background: 'linear-gradient(to bottom, #6cf8bb, #4edea3)', borderTop: '1px solid rgba(255,255,255,0.30)' }}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Load Data Center Preset</span>
          </button>
        </div>
      )}
    </div>
  );
}
