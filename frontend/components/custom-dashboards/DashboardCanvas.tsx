"use client";

import React, { useState, useEffect, useRef } from "react";
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
  List,
  Download,
  Check,
  Sparkles,
  Database,
  Columns3,
  Rows3,
  Minus
} from "lucide-react";
import { Widget, SavedDashboard, WidgetData, DashboardRow } from "./types";
import QueryInspectorModal from "./QueryInspectorModal";
import ConfigureWidgetModal from "./ConfigureWidgetModal";

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
  onSaveQuery?: (widgetId: string, query: string) => void;
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

function exportRowsToCsv(rows: DashboardRow[], filename: string) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    )
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
  onUpdateWidget,
  onSaveQuery
}: DashboardCanvasProps) {
  const { width: hookWidth, containerRef, mounted } = useContainerWidth();
  const [dynamicWidth, setDynamicWidth] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [configuringWidget, setConfiguringWidget] = useState<Widget | null>(null);
  const [inspectorWidget, setInspectorWidget] = useState<Widget | null>(null);

  // ── Home-screen reveal choreography ──────────────────────────────────────
  // revealNonce bumps whenever the active dashboard changes, remounting the
  // tiles so the staggered spring-in entrance replays. `sweep` fires the emerald
  // light-rake + settle glow only when a layout just finished AI generation
  // (isGenerating T->F), i.e. the "materializing" flourish.
  const [revealNonce, setRevealNonce] = useState<number>(0);
  const [sweep, setSweep] = useState<boolean>(false);
  const prevGenerating = useRef<boolean>(isGenerating);

  useEffect(() => {
    setRevealNonce((n) => n + 1);
  }, [currentDashboard?.id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevGenerating.current && !isGenerating && currentDashboard) {
      setSweep(true);
      setRevealNonce((n) => n + 1);
      timer = setTimeout(() => setSweep(false), 1400);
    }
    prevGenerating.current = isGenerating;
    return () => { if (timer) clearTimeout(timer); };
  }, [isGenerating, currentDashboard]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDynamicWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  const activeWidth = dynamicWidth || hookWidth || 1000;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expandedWidgetId) setExpandedWidgetId(null);
        if (inspectorWidget) setInspectorWidget(null);
        if (configuringWidget) setConfiguringWidget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedWidgetId, inspectorWidget, configuringWidget]);

  const expandedWidget = currentDashboard?.layout.find((w) => w.id === expandedWidgetId) || null;

  const handleApplyPresetLayout = (layoutMode: "2col" | "3col" | "compact") => {
    if (!currentDashboard || !onLayoutChange) return;
    const items = [...currentDashboard.layout];
    let newLayout: Layout = [];

    if (layoutMode === "2col") {
      newLayout = items.map((w, idx) => ({
        i: w.id,
        x: (idx % 2) * 6,
        y: Math.floor(idx / 2) * 3,
        w: 6,
        h: w.type === "FormulaCard" || w.type === "R0Gauge" ? 2 : 3
      }));
    } else if (layoutMode === "3col") {
      newLayout = items.map((w, idx) => ({
        i: w.id,
        x: (idx % 3) * 4,
        y: Math.floor(idx / 3) * 3,
        w: 4,
        h: w.type === "FormulaCard" || w.type === "R0Gauge" ? 2 : 3
      }));
    } else {
      // Auto-Pack compact
      let currentY = 0;
      let currentX = 0;
      newLayout = items.map((w) => {
        const itemW = Math.min(12, Math.max(2, w.w || 6));
        const itemH = Math.max(2, w.h || 3);
        if (currentX + itemW > 12) {
          currentX = 0;
          currentY += itemH;
        }
        const res = { i: w.id, x: currentX, y: currentY, w: itemW, h: itemH };
        currentX += itemW;
        return res;
      });
    }

    onLayoutChange(newLayout);
  };

  return (
    <div className="space-y-5 bg-[#111111] min-h-full p-4 sm:p-6 rounded-xl transition-colors border border-[#262626] shadow-2xl relative">
      
      {/* Specular Highlight Strip */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/30 to-transparent pointer-events-none" />

      {/* CANVAS HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold font-sans tracking-tight text-[#f5f5f5]">
              {currentDashboard?.dashboard_name || "Telemetry & Risk Canvas"}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 shadow-[0_0_12px_rgba(78,222,163,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              Neo4j Live Thread
            </span>
          </div>
          <p className="text-xs text-[#a3a3a3] font-mono mt-1">
            Dynamic knowledge graph telemetry visualizer with submittal bindings.
          </p>
        </div>

        {/* Toolbar Action Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          
          {/* Preset templates menu */}
          <div className="relative group">
            <button className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#404040] rounded-md text-[#e5e5e5] flex items-center gap-1.5 transition-all text-[11px]">
              <LayoutGrid className="w-3.5 h-3.5 text-[#4edea3]" />
              <span>Presets</span>
              <ChevronDown className="w-3 h-3 text-[#737373]" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-60 bg-[#171717] border border-[#404040] rounded-lg shadow-2xl p-1.5 z-50 hidden group-hover:block backdrop-blur-xl">
              <button
                onClick={() => onLoadPreset("datacenter")}
                className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded-md transition-colors font-mono flex items-center justify-between"
              >
                <span>Data Center Telemetry</span>
                <span className="text-[10px] text-[#4edea3]">4 widgets</span>
              </button>
              <button
                onClick={() => onLoadPreset("submittal")}
                className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded-md transition-colors font-mono flex items-center justify-between"
              >
                <span>Submittals & R0 Score</span>
                <span className="text-[10px] text-[#4edea3]">3 widgets</span>
              </button>
              <button
                onClick={() => onLoadPreset("logistics")}
                className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded-md transition-colors font-mono flex items-center justify-between"
              >
                <span>Equipment Logistics & NCRs</span>
                <span className="text-[10px] text-[#4edea3]">3 widgets</span>
              </button>
            </div>
          </div>

          {/* Quick Layout Menu */}
          {editMode && (
            <div className="relative group">
              <button className="px-2.5 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#404040] rounded-md text-[#e5e5e5] flex items-center gap-1.5 transition-all text-[11px]">
                <Columns3 className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Auto-Layout</span>
                <ChevronDown className="w-3 h-3 text-[#737373]" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#171717] border border-[#404040] rounded-lg shadow-2xl p-1 z-50 hidden group-hover:block backdrop-blur-xl">
                <button
                  onClick={() => handleApplyPresetLayout("compact")}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded transition-colors font-mono"
                >
                  Auto-Pack Compact
                </button>
                <button
                  onClick={() => handleApplyPresetLayout("2col")}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded transition-colors font-mono"
                >
                  2-Column Split
                </button>
                <button
                  onClick={() => handleApplyPresetLayout("3col")}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#e5e5e5] hover:bg-[#262626] rounded transition-colors font-mono"
                >
                  3-Column Grid
                </button>
              </div>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefreshData}
            className="p-1.5 bg-[#171717] hover:bg-[#262626] border border-[#404040] rounded-md text-[#e5e5e5] transition-all relative hover:border-[#4edea3]/50"
            title="Sync Data Now"
          >
            <RefreshCw className="w-4 h-4 text-[#4edea3]" />
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            className="p-1.5 bg-[#171717] hover:bg-[#262626] border border-[#404040] rounded-md text-[#a3a3a3] hover:text-[#4edea3] transition-all"
            title="Export Layout Config JSON"
          >
            <FileCode className="w-4 h-4" />
          </button>

          {/* Toggle Rearrange Edit Mode */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 rounded-md border transition-all flex items-center gap-1.5 text-[11px] ${
              editMode
                ? "bg-[#4edea3]/15 border-[#4edea3] text-[#4edea3] font-bold shadow-[0_0_12px_rgba(78,222,163,0.2)]"
                : "bg-[#171717] border-[#404040] text-[#a3a3a3] hover:text-[#e5e5e5]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{editMode ? "Lock Layout" : "Edit Layout"}</span>
          </button>

          {/* Add Custom Widget */}
          <button
            onClick={onAddWidget}
            className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#4edea3]/40 rounded-md text-[#4edea3] flex items-center gap-1.5 transition-all text-[11px] font-bold shadow-[0_0_12px_rgba(78,222,163,0.1)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Widget</span>
          </button>

          {/* Save Dashboard Option */}
          <button
            onClick={onOpenSaveModal}
            className="px-3.5 py-1.5 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded-md flex items-center gap-1.5 transition-all shadow-[0_0_14px_rgba(78,222,163,0.30)] text-[11px]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Dashboard</span>
          </button>
        </div>
      </div>

      {/* FILTER & QUICK SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#1c1c1c] border border-[#262626] rounded-lg font-mono text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-[#0a0a0a] px-3 py-1.5 rounded-md border border-[#262626] focus-within:border-[#4edea3]/60 transition-all">
          <Search className="w-3.5 h-3.5 text-[#737373]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter widget parameters & values..."
            className="w-full bg-transparent border-none outline-none text-[#e5e5e5] placeholder-[#737373] text-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[#a3a3a3] text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            <span>Timeframe:</span>
          </div>
          {(["7d", "30d", "90d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded text-[11px] transition-all uppercase font-bold ${
                timeRange === r ? "bg-[#4edea3] text-[#003824] shadow-sm" : "text-[#a3a3a3] hover:text-[#e5e5e5]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* REAL-TIME GENERATING LAZY LOADING OVERLAY */}
      {isGenerating && (
        <div className="p-6 rounded-lg border border-[#4edea3]/40 bg-[#1c1c1c] relative overflow-hidden space-y-4 animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4edea3] via-[#38bdf8] to-[#a855f7] animate-pulse" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[#4edea3]/10 border border-[#4edea3]/40 text-[#4edea3]">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#f5f5f5] flex items-center gap-2">
                  Synthesizing Real-Time Dashboard...
                </h3>
                <p className="text-xs text-[#a3a3a3] font-mono">
                  Assembling data visualizers and binding knowledge graph query engines.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#4edea3]/10 text-[#4edea3] font-mono text-xs border border-[#4edea3]/30 uppercase tracking-widest animate-pulse font-bold">
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
                  <span>● Node #{i} AST Cypher Verified</span>
                  <span>Compiling Visualizer...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit-mode hint — reads like an iOS "wiggle to rearrange" cue */}
      {editMode && currentDashboard && currentDashboard.layout.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#4edea3] animate-in fade-in duration-300">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Drag to rearrange · resize from the corners · tap the red badge to remove</span>
        </div>
      )}

      {/* DASHBOARD WIDGETS GRID */}
      {currentDashboard && currentDashboard.layout.length > 0 ? (
        <div ref={containerRef} className="relative w-full">
          {/* Generation reveal: emerald light rakes across the freshly built canvas */}
          {sweep && <div className="generate-sweep" aria-hidden="true" />}
          {mounted && (
            <ResponsiveGridLayout
              width={activeWidth}
              className="layout"
              layouts={{
                lg: currentDashboard.layout.map(w => ({ 
                  i: w.id, 
                  x: Number(w.x) || 0, 
                  y: Number(w.y) || 0, 
                  w: Math.min(12, Math.max(2, Number(w.w) || 6)), 
                  h: Math.max(2, Number(w.h) || 3),
                  minW: w.type === "FormulaCard" || w.type === "R0Gauge" ? 2 : 3,
                  minH: 2
                })),
                md: currentDashboard.layout.map(w => ({ 
                  i: w.id, 
                  x: Number(w.x) || 0, 
                  y: Number(w.y) || 0, 
                  w: Math.min(12, Math.max(2, Number(w.w) || 6)), 
                  h: Math.max(2, Number(w.h) || 3),
                  minW: 2,
                  minH: 2
                })),
                sm: currentDashboard.layout.map((w, idx) => {
                  const isSmall = w.type === "FormulaCard" || w.type === "R0Gauge";
                  return { 
                    i: w.id, 
                    x: isSmall ? (idx % 2) * 3 : 0, 
                    y: Math.floor(idx / 2) * 3, 
                    w: isSmall ? 3 : 6, 
                    h: Math.max(2, Number(w.h) || 3) 
                  };
                }),
                xs: currentDashboard.layout.map((w, idx) => ({ 
                  i: w.id, 
                  x: 0, 
                  y: idx * 3, 
                  w: 4, 
                  h: Math.max(2, Number(w.h) || 3) 
                })),
                xxs: currentDashboard.layout.map((w, idx) => ({ 
                  i: w.id, 
                  x: 0, 
                  y: idx * 3, 
                  w: 2, 
                  h: Math.max(2, Number(w.h) || 3) 
                }))
              }}
              cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={115}
              onLayoutChange={(layout) => {
                if (onLayoutChange) onLayoutChange(layout);
              }}
              dragConfig={{ enabled: editMode, handle: ".drag-handle" }}
              resizeConfig={{ enabled: editMode }}
              margin={[20, 20]}
            >
          {currentDashboard.layout.map((widget, idx) => {
            const data = widgetData[widget.id];
            const isLoading = loadingData[widget.id];
            const rows = getRows(data);
            const val = firstValue(data);
            const primaryNumber = typeof val === "number" ? val : parseFloat(String(val ?? 0)) || 0;
            // Desync the jiggle per-tile so the grid feels organic, not robotic.
            const jiggleClass = idx % 3 === 0 ? "edit-jiggle" : idx % 3 === 1 ? "edit-jiggle-1" : "edit-jiggle-2";

            return (
              // Outer cell: react-grid-layout owns its transform/position — never
              // animate transform here. The inner wrapper carries all motion.
              <div key={widget.id} className="relative" style={{ width: "100%", height: "100%" }}>
                {/* iOS-style quick-delete badge — on the outer cell so it isn't
                    clipped by the tile's overflow-hidden. */}
                {editMode && (
                  <button
                    onClick={() => onDeleteWidget(widget.id)}
                    className="badge-pop absolute -top-2 -left-2 z-30 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-2 ring-[#111111] hover:bg-red-400 transition-colors"
                    title="Remove widget"
                    aria-label="Remove widget"
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                )}
                <div
                  // Remounts on dashboard change (revealNonce) so the spring-in replays.
                  key={`${revealNonce}-${widget.id}`}
                  style={{ animationDelay: editMode ? "0ms" : `${Math.min(idx, 12) * 60}ms`, width: "100%", height: "100%" }}
                  className={`group relative rounded-xl bg-[#1c1c1c] border border-[#262626] flex flex-col justify-between overflow-hidden transition-shadow duration-200 hover:border-[#4edea3]/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3.5 sm:p-4 ${sweep ? "widget-enter-glow" : "widget-enter"} ${editMode ? jiggleClass : ""}`}
                >
                {/* Specular Milled Edge Highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

                {/* Widget Header Bar */}
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#262626] shrink-0">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="p-1.5 rounded-lg bg-[#0a0a0a] border border-[#262626] text-[#4edea3] shrink-0">
                      {widget.type === "R0Gauge" && <Activity className="w-3.5 h-3.5" />}
                      {widget.type === "PredictiveTrendChart" && <TrendingUp className="w-3.5 h-3.5" />}
                      {widget.type === "FormulaCard" && <Zap className="w-3.5 h-3.5" />}
                      {widget.type === "DataGrid" && <TableIcon className="w-3.5 h-3.5" />}
                      {widget.type === "BarChart" && <Layers className="w-3.5 h-3.5" />}
                      {widget.type === "DonutChart" && <LayoutGrid className="w-3.5 h-3.5" />}
                      {widget.type === "LineChart" && <TrendingUp className="w-3.5 h-3.5" />}
                      {widget.type === "RadarChart" && <Maximize2 className="w-3.5 h-3.5" />}
                      {widget.type === "ScatterChart" && <LayoutGrid className="w-3.5 h-3.5" />}
                      {widget.type === "MarkdownCard" && <FileText className="w-3.5 h-3.5" />}
                      {widget.type === "JSONViewer" && <Code className="w-3.5 h-3.5" />}
                      {widget.type === "StatusList" && <List className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#f5f5f5] font-sans truncate">
                        {widget.title || widget.type}
                      </h3>
                      {widget.description && (
                        <p className="text-[10px] text-[#a3a3a3] font-mono truncate">{widget.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Widget Action Toolbar */}
                  <div className="flex items-center gap-1 shrink-0">
                    
                    {/* Inspect Cypher Query */}
                    <button
                      onClick={() => setInspectorWidget(widget)}
                      className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#4edea3] transition-colors"
                      title="Inspect Cypher Query"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>

                    {/* Full Screen View */}
                    <button
                      onClick={() => setExpandedWidgetId(widget.id)}
                      className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
                      title="Full Screen View"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* CSV Export on Tables */}
                    {widget.type === "DataGrid" && rows.length > 0 && (
                      <button
                        onClick={() => exportRowsToCsv(rows, widget.title || "grid_export")}
                        className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#4edea3] transition-colors"
                        title="Download CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {editMode && (
                      <>
                        <div className="drag-handle cursor-move p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#4edea3]">
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </div>
                        <button
                          onClick={() => onDuplicateWidget(widget)}
                          className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#f5f5f5]"
                          title="Duplicate Widget"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfiguringWidget(widget)}
                          className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#4edea3]"
                          title="Configure Widget"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteWidget(widget.id)}
                          className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-red-400"
                          title="Delete Widget"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Widget Dynamic Content Render */}
                <div className="flex-1 min-h-0 w-full h-full flex flex-col justify-center relative overflow-hidden">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-xs font-mono text-[#a3a3a3] space-y-2">
                      <RefreshCw className="w-5 h-5 text-[#4edea3] animate-spin" />
                      <span>Traversing Graph DB...</span>
                    </div>
                  ) : data && "error" in data ? (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Query Error</span>
                        <span className="text-[10px] text-red-300">{data.error}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* FORMULA CARD */}
                      {widget.type === "FormulaCard" && (
                        <div className="py-2 font-mono text-center flex flex-col items-center justify-center h-full space-y-1.5">
                          <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#f5f5f5] truncate max-w-full" style={{ fontFamily: 'var(--font-mono)' }}>
                            {val !== null ? formatCellValue(val) : "—"}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 text-xs">
                            <span className="px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] font-bold flex items-center gap-1 text-[10px]">
                              <TrendingUp className="w-3 h-3" /> Nominal
                            </span>
                            <span className="text-[#a3a3a3] text-[10px] hidden sm:inline">active baseline</span>
                          </div>
                        </div>
                      )}

                      {/* R0 SEVERITY GAUGE */}
                      {widget.type === "R0Gauge" && (
                        <div className="py-1 font-mono text-center flex flex-col items-center justify-center h-full space-y-1.5">
                          <div className="relative inline-flex flex-col items-center justify-center">
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] flex items-center justify-center relative bg-black/40 ${
                              primaryNumber > 4 ? "border-red-500/60 shadow-[0_0_14px_rgba(239,68,68,0.3)]" :
                              primaryNumber >= 2 ? "border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.3)]" :
                              "border-[#4edea3]/60 shadow-[0_0_14px_rgba(78,222,163,0.3)]"
                            }`}>
                              <span className={`text-2xl sm:text-3xl font-extrabold ${
                                primaryNumber > 4 ? "text-red-400" :
                                primaryNumber >= 2 ? "text-amber-400" :
                                "text-[#4edea3]"
                              }`} style={{ fontFamily: 'var(--font-mono)' }}>
                                {Number.isFinite(primaryNumber) && rows.length > 0 ? primaryNumber.toFixed(1) : "—"}
                              </span>
                            </div>
                            <span className="mt-1 text-[9px] uppercase tracking-widest text-[#a3a3a3] font-bold">
                              R0 Risk Index
                            </span>
                          </div>
                          <div className="flex justify-center gap-2.5 text-[9px] font-mono">
                            <span className="text-[#4edea3]">● &lt;2.0</span>
                            <span className="text-amber-400">● 2-4</span>
                            <span className="text-red-400">● &gt;4.0</span>
                          </div>
                        </div>
                      )}

                      {/* DATA GRID */}
                      {widget.type === "DataGrid" && (
                        <div className="h-full w-full overflow-auto font-mono text-xs custom-scrollbar">
                          {rows.length > 0 ? (
                            <table className="w-full text-left text-[11px]">
                              <thead className="sticky top-0 bg-[#1c1c1c]">
                                <tr className="border-b border-[#262626] text-[#a3a3a3]">
                                  {Object.keys(rows[0]).map((key) => (
                                    <th key={key} className="pb-1.5 pr-3 font-bold uppercase tracking-wider">{key}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#262626]">
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
                                          <td key={j} className={`py-1.5 pr-3 truncate max-w-[140px] ${isNumeric ? 'font-mono text-[#4edea3]' : 'text-[#d4d4d4]'}`}>
                                            {formatCellValue(cellVal)}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[#737373]">No grid records returned.</div>
                          )}
                        </div>
                      )}

                      {/* PREDICTIVE TREND CHART */}
                      {widget.type === "PredictiveTrendChart" && (
                        <div className="h-full w-full min-h-[120px]">
                          {rows.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={rows} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={`grad_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4edea3" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#4edea3" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="date" stroke="#737373" fontSize={9} />
                                <YAxis stroke="#737373" fontSize={9} />
                                <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8, fontSize: 10 }} />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#4edea3"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill={`url(#grad_${widget.id})`}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[#737373] font-mono text-xs">
                              Insufficient time-series payload.
                            </div>
                          )}
                        </div>
                      )}

                      {/* BAR CHART */}
                      {widget.type === "BarChart" && (
                        <div className="h-full w-full min-h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={rows} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis dataKey={Object.keys(rows[0] || {name:""})[0] || "name"} stroke="#737373" fontSize={9} />
                              <YAxis stroke="#737373" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8, fontSize: 10 }} />
                              <Bar dataKey={Object.keys(rows[0] || {count:""})[1] || "count"} fill="#4edea3" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* DONUT CHART */}
                      {widget.type === "DonutChart" && (
                        <div className="h-full w-full min-h-[120px] flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={rows}
                                innerRadius={35}
                                outerRadius={55}
                                paddingAngle={4}
                                dataKey={Object.keys(rows[0] || {value:""})[1] || "value"}
                                nameKey={Object.keys(rows[0] || {name:""})[0] || "name"}
                              >
                                {CHART_COLORS.map((col, idx) => (
                                  <Cell key={`cell-${idx}`} fill={col} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8, fontSize: 10 }} />
                              <Legend wrapperStyle={{ fontSize: 9 }} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* LINE CHART */}
                      {widget.type === "LineChart" && (
                        <div className="h-full w-full min-h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={rows} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis dataKey={Object.keys(rows[0] || {date:""})[0]} stroke="#737373" fontSize={9} />
                              <YAxis stroke="#737373" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8, fontSize: 10 }} />
                              <Line type="monotone" dataKey={Object.keys(rows[0] || {value:""})[1] || "value"} stroke="#38bdf8" strokeWidth={2} dot={{ r: 2.5, fill: "#38bdf8" }} />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* RADAR CHART */}
                      {widget.type === "RadarChart" && (
                        <div className="h-full w-full min-h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsRadarChart data={rows} outerRadius="70%">
                              <PolarGrid stroke="#262626" />
                              <PolarAngleAxis dataKey={Object.keys(rows[0] || {subject:""})[0]} tick={{ fill: "#a3a3a3", fontSize: 9 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: "#737373", fontSize: 9 }} />
                              <Radar name="Metric" dataKey={Object.keys(rows[0] || {A:""})[1] || "A"} stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
                              <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8, fontSize: 10 }} />
                            </RechartsRadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* SCATTER CHART */}
                      {widget.type === "ScatterChart" && (
                        <div className="h-full w-full min-h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsScatterChart margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis dataKey={Object.keys(rows[0] || {x:""})[0]} type="number" stroke="#737373" fontSize={9} name="X Axis" />
                              <YAxis dataKey={Object.keys(rows[0] || {y:""})[1] || "y"} type="number" stroke="#737373" fontSize={9} name="Y Axis" />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8, fontSize: 10 }} />
                              <Scatter name="Data" data={rows} fill="#f59e0b" />
                            </RechartsScatterChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* MARKDOWN / TEXT CARD */}
                      {widget.type === "MarkdownCard" && (
                        <div className="overflow-y-auto h-full p-2 text-xs text-[#d4d4d4] font-sans leading-relaxed custom-scrollbar whitespace-pre-wrap">
                          {rows.length > 0 && typeof Object.values(rows[0])[0] === 'string'
                            ? String(Object.values(rows[0])[0])
                            : "No markdown notes configured."}
                        </div>
                      )}

                      {/* JSON VIEWER */}
                      {widget.type === "JSONViewer" && (
                        <div className="overflow-y-auto h-full p-3 bg-[#0a0a0a] rounded border border-[#262626] font-mono text-[10px] text-[#4edea3] custom-scrollbar">
                          <pre>{JSON.stringify(rows, null, 2)}</pre>
                        </div>
                      )}

                      {/* STATUS LIST */}
                      {widget.type === "StatusList" && (
                        <div className="overflow-y-auto h-full custom-scrollbar font-mono text-xs space-y-1.5">
                          {rows.length > 0 ? (
                            rows.map((r, i) => {
                              const vals = Object.values(r);
                              const label = formatCellValue(vals[0]);
                              const status = vals.length > 1 ? String(vals[1]).toLowerCase() : 'unknown';
                              let statusColor = "bg-[#262626] text-[#a3a3a3]";
                              if (status.includes('ok') || status.includes('active') || status.includes('normal')) statusColor = "bg-[#4edea3]/20 text-[#4edea3]";
                              else if (status.includes('warn') || status.includes('moderate')) statusColor = "bg-amber-400/20 text-amber-400";
                              else if (status.includes('crit') || status.includes('err') || status.includes('fail')) statusColor = "bg-red-400/20 text-red-400";

                              return (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-[#0a0a0a] border border-[#262626]">
                                  <span className="text-[#e5e5e5] truncate pr-2">{label}</span>
                                  {vals.length > 1 && (
                                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold shrink-0 ${statusColor}`}>
                                      {formatCellValue(vals[1])}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex items-center justify-center h-full text-[#737373]">No list items returned.</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl h-[420px] text-center p-8 space-y-4 bg-[#1c1c1c] border border-[#262626] relative overflow-hidden">
          <div className="p-4 rounded-full bg-[#1c1c1c] border border-[#262626] text-[#4edea3] shadow-[0_0_20px_rgba(78,222,163,0.15)]">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#f5f5f5] font-sans">
              Custom Dashboard Canvas Uninitialized
            </h3>
            <p className="text-xs text-[#a3a3a3] max-w-md font-mono mt-1 leading-relaxed">
              Use the AI Agent Chat sidebar on the right or choose a preset to assemble data visualizers.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onLoadPreset("datacenter")}
              className="px-4 py-2 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded-md text-xs font-mono transition-all shadow-[0_0_12px_rgba(78,222,163,0.30)] cursor-pointer"
            >
              Load Data Center Preset
            </button>
            <button
              onClick={onAddWidget}
              className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#404040] text-[#e5e5e5] rounded-md text-xs font-mono transition-all cursor-pointer"
            >
              Add Custom Widget
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN WIDGET OVERLAY MODAL */}
      {expandedWidget && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0a]/95 backdrop-blur-2xl p-4 sm:p-8 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-[#111111] border border-[#4edea3]/40 text-[#4edea3]">
                {expandedWidget.type === "R0Gauge" && <Activity className="w-5 h-5" />}
                {expandedWidget.type === "PredictiveTrendChart" && <TrendingUp className="w-5 h-5" />}
                {expandedWidget.type === "FormulaCard" && <Zap className="w-5 h-5" />}
                {expandedWidget.type === "DataGrid" && <TableIcon className="w-5 h-5" />}
                {expandedWidget.type === "BarChart" && <Layers className="w-5 h-5" />}
                {expandedWidget.type === "DonutChart" && <LayoutGrid className="w-5 h-5" />}
                {expandedWidget.type === "LineChart" && <TrendingUp className="w-5 h-5" />}
                {expandedWidget.type === "RadarChart" && <Maximize2 className="w-5 h-5" />}
                {expandedWidget.type === "ScatterChart" && <LayoutGrid className="w-5 h-5" />}
                {expandedWidget.type === "MarkdownCard" && <FileText className="w-5 h-5" />}
                {expandedWidget.type === "JSONViewer" && <Code className="w-5 h-5" />}
                {expandedWidget.type === "StatusList" && <List className="w-5 h-5" />}
              </span>
              <div>
                <h2 className="text-base font-bold text-[#f5f5f5] font-sans">
                  {expandedWidget.title || expandedWidget.type}
                </h2>
                {expandedWidget.description && (
                  <p className="text-xs text-[#a3a3a3] font-mono">{expandedWidget.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono">
              <span className="px-3 py-1 rounded bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 uppercase tracking-widest text-[10px] font-bold hidden sm:inline-block">
                Full Screen View (ESC to exit)
              </span>
              <button
                onClick={() => setExpandedWidgetId(null)}
                className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#404040] rounded-md text-white hover:text-[#4edea3] transition-all text-xs flex items-center gap-2"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Full Screen</span>
              </button>
            </div>
          </div>

          {/* Expanded Visualization Content */}
          <div className="flex-1 bg-[#111111] border border-[#262626] rounded-xl p-6 overflow-hidden flex flex-col justify-center relative">
            {(() => {
              const data = widgetData[expandedWidget.id];
              const isLoading = loadingData[expandedWidget.id];
              const rows = getRows(data);
              const val = firstValue(data);
              const primaryNumber = typeof val === "number" ? val : parseFloat(String(val ?? 0)) || 0;

              if (isLoading) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-sm font-mono text-[#a3a3a3] space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#4edea3] animate-spin" />
                    <span>Executing Graph Query in Full Screen...</span>
                  </div>
                );
              }

              if (data && "error" in data) {
                return (
                  <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <span>{data.error}</span>
                  </div>
                );
              }

              return (
                <div className="w-full h-full flex flex-col justify-center">
                  {expandedWidget.type === "FormulaCard" && (
                    <div className="py-12 font-mono text-center space-y-6">
                      <div className="text-7xl sm:text-8xl font-extrabold tracking-tight text-[#f5f5f5]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {val !== null ? formatCellValue(val) : "—"}
                      </div>
                      <div className="flex items-center justify-center gap-3 text-base">
                        <span className="px-3 py-1 rounded bg-[#4edea3]/20 text-[#4edea3] font-bold flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> Baseline Verified
                        </span>
                        <span className="text-[#a3a3a3]">Submittal Telemetry</span>
                      </div>
                    </div>
                  )}

                  {expandedWidget.type === "R0Gauge" && (
                    <div className="py-8 font-mono text-center space-y-6">
                      <div className="relative inline-flex flex-col items-center justify-center">
                        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[4px] border-[#4edea3]/50 flex items-center justify-center relative bg-black/40 shadow-[0_0_30px_rgba(78,222,163,0.30)]">
                          <span className="text-6xl font-extrabold text-[#4edea3]" style={{ fontFamily: 'var(--font-mono)' }}>
                            {Number.isFinite(primaryNumber) && rows.length > 0 ? primaryNumber.toFixed(1) : "—"}
                          </span>
                        </div>
                        <span className="mt-4 text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
                          R0 Risk Severity Index
                        </span>
                      </div>
                      <div className="flex justify-center gap-6 text-xs font-mono">
                        <span className="text-[#4edea3]">● Nominal (&lt;2.0)</span>
                        <span className="text-amber-400">● Moderate (2-4)</span>
                        <span className="text-red-400">● Critical (&gt;4.0)</span>
                      </div>
                    </div>
                  )}

                  {expandedWidget.type === "DataGrid" && (
                    <div className="overflow-auto max-h-[calc(100vh-220px)] font-mono text-sm custom-scrollbar">
                      {rows.length > 0 ? (
                        <table className="w-full text-left">
                          <thead className="sticky top-0 bg-[#111111]">
                            <tr className="text-[#a3a3a3] border-b border-[#262626] text-xs">
                              {Object.keys(rows[0]).map((key) => (
                                <th key={key} className="pb-3 pr-6 font-bold uppercase tracking-wider">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1c1c1c]">
                            {rows.map((row, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                {Object.entries(row).map(([, cellVal], j) => {
                                  const isNumeric = typeof cellVal === 'number' || /^-?[\d.]+$/.test(String(cellVal));
                                  return (
                                    <td key={j} className={`py-3 pr-6 truncate ${isNumeric ? 'font-mono text-[#4edea3]' : 'text-[#e5e5e5]'}`}>
                                      {formatCellValue(cellVal)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-16 text-[#737373]">No grid records returned.</div>
                      )}
                    </div>
                  )}

                  {(expandedWidget.type === "PredictiveTrendChart" || expandedWidget.type === "LineChart") && (
                    <div className="h-[calc(100vh-240px)] w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={rows}>
                          <defs>
                            <linearGradient id="full_chart_grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4edea3" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#4edea3" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                          <XAxis dataKey="date" stroke="#a3a3a3" fontSize={12} />
                          <YAxis stroke="#a3a3a3" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8 }} />
                          <Area type="monotone" dataKey="value" stroke="#4edea3" strokeWidth={3} fillOpacity={1} fill="url(#full_chart_grad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {expandedWidget.type === "BarChart" && (
                    <div className="h-[calc(100vh-240px)] w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={rows}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                          <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
                          <YAxis stroke="#a3a3a3" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#4edea3" radius={[6, 6, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {expandedWidget.type === "DonutChart" && (
                    <div className="h-[calc(100vh-240px)] w-full pt-4 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={rows}
                            innerRadius={90}
                            outerRadius={140}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {CHART_COLORS.map((col, idx) => (
                              <Cell key={`full-cell-${idx}`} fill={col} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333333", borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 14 }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {expandedWidget.type === "JSONViewer" && (
                    <div className="overflow-y-auto max-h-[calc(100vh-240px)] p-4 bg-[#0a0a0a] rounded-lg border border-[#262626] font-mono text-xs text-[#4edea3] custom-scrollbar">
                      <pre>{JSON.stringify(rows, null, 2)}</pre>
                    </div>
                  )}

                  {expandedWidget.type === "MarkdownCard" && (
                    <div className="overflow-y-auto max-h-[calc(100vh-240px)] p-4 text-base text-[#e5e5e5] font-sans leading-relaxed custom-scrollbar whitespace-pre-wrap">
                      {rows.length > 0 && typeof Object.values(rows[0])[0] === 'string'
                        ? String(Object.values(rows[0])[0])
                        : "No text payload provided for full screen markdown view."}
                    </div>
                  )}

                  {expandedWidget.type === "StatusList" && (
                    <div className="overflow-y-auto max-h-[calc(100vh-240px)] custom-scrollbar font-mono text-sm space-y-3">
                      {rows.length > 0 ? (
                        <ul className="space-y-3">
                          {rows.map((r, i) => {
                            const vals = Object.values(r);
                            const label = formatCellValue(vals[0]);
                            const status = vals.length > 1 ? String(vals[1]).toLowerCase() : 'unknown';
                            let statusColor = "bg-[#262626] text-[#a3a3a3]";
                            if (status.includes('ok') || status.includes('active') || status.includes('normal')) statusColor = "bg-[#4edea3]/20 text-[#4edea3]";
                            else if (status.includes('warn') || status.includes('moderate')) statusColor = "bg-amber-400/20 text-amber-400";
                            else if (status.includes('crit') || status.includes('err') || status.includes('fail')) statusColor = "bg-red-400/20 text-red-400";

                            return (
                              <li key={i} className="flex items-center justify-between p-3.5 rounded-lg bg-[#0a0a0a] border border-[#262626]">
                                <span className="text-[#e5e5e5] font-bold">{label}</span>
                                {vals.length > 1 && (
                                  <span className={`px-3 py-1 rounded text-xs uppercase tracking-wider font-bold ${statusColor}`}>
                                    {formatCellValue(vals[1])}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="text-center py-16 text-[#737373]">No list items returned.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* QUERY INSPECTOR MODAL */}
      <QueryInspectorModal
        isOpen={Boolean(inspectorWidget)}
        widget={inspectorWidget}
        currentQuery={inspectorWidget ? (currentDashboard?.queries?.[inspectorWidget.id] || "") : ""}
        onClose={() => setInspectorWidget(null)}
        onSaveQuery={(widgetId, newQuery) => {
          if (onSaveQuery) {
            onSaveQuery(widgetId, newQuery);
          }
        }}
      />

      {/* CONFIGURE WIDGET MODAL */}
      <ConfigureWidgetModal
        isOpen={Boolean(configuringWidget)}
        widget={configuringWidget}
        onClose={() => setConfiguringWidget(null)}
        onSave={(updated) => {
          if (onUpdateWidget) {
            onUpdateWidget(updated);
          }
        }}
      />

    </div>
  );
}
