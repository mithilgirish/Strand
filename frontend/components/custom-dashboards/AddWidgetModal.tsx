"use client";

import React, { useState } from "react";
import { 
  Plus, 
  X, 
  Activity, 
  TrendingUp, 
  Zap, 
  Table as TableIcon, 
  Layers, 
  LayoutGrid, 
  Maximize2, 
  FileText, 
  Code, 
  List,
  Search,
  Sparkles,
  Check
} from "lucide-react";
import { Widget, WidgetType } from "./types";

interface WidgetCatalogItem {
  type: WidgetType;
  title: string;
  category: "kpi" | "charts" | "tables" | "text";
  description: string;
  defaultW: number;
  defaultH: number;
  icon: React.ComponentType<{ className?: string }>;
  defaultQuery: string;
  colorScheme: "emerald" | "cyan" | "amber" | "purple" | "rose" | "blue";
}

const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    type: "FormulaCard",
    title: "Formula KPI Metric",
    category: "kpi",
    description: "Big bold numeric summary with percentage variance and target baseline delta.",
    defaultW: 3,
    defaultH: 2,
    icon: Zap,
    defaultQuery: "MATCH (s:Submittal) WHERE s.delay_days > 5 RETURN count(s) as delayed_count",
    colorScheme: "emerald"
  },
  {
    type: "R0Gauge",
    title: "R0 Risk Severity Gauge",
    category: "kpi",
    description: "Circular epidemic contagion gauge with color-coded normal, moderate, and critical tiers.",
    defaultW: 3,
    defaultH: 2,
    icon: Activity,
    defaultQuery: "MATCH (s:Submittal) RETURN avg(s.r0_severity) as r0",
    colorScheme: "emerald"
  },
  {
    type: "PredictiveTrendChart",
    title: "Predictive Area Forecast",
    category: "charts",
    description: "Gradient area chart illustrating telemetry progression and predictive AI anomaly thresholds.",
    defaultW: 6,
    defaultH: 3,
    icon: TrendingUp,
    defaultQuery: "MATCH (t:Telemetry) RETURN t.date as date, t.value as value ORDER BY t.date ASC LIMIT 30",
    colorScheme: "cyan"
  },
  {
    type: "BarChart",
    title: "Categorical Bar Breakdown",
    category: "charts",
    description: "Comparative bar chart breaking down submittals, equipment, or delayed tasks by contractor.",
    defaultW: 6,
    defaultH: 3,
    icon: Layers,
    defaultQuery: "MATCH (c:Contractor)<-[:SUBMITTED_BY]-(s:Submittal) RETURN c.name as name, count(s) as count",
    colorScheme: "purple"
  },
  {
    type: "DonutChart",
    title: "Status Distribution Donut",
    category: "charts",
    description: "Ring chart showing proportion of open, under review, and closed NCRs or submittals.",
    defaultW: 6,
    defaultH: 3,
    icon: LayoutGrid,
    defaultQuery: "MATCH (n:NCR) RETURN n.status as name, count(n) as value",
    colorScheme: "amber"
  },
  {
    type: "LineChart",
    title: "Multi-Series Line Graph",
    category: "charts",
    description: "High-density timeline tracking voltage, chiller temps, or milestone progress.",
    defaultW: 6,
    defaultH: 3,
    icon: TrendingUp,
    defaultQuery: "MATCH (t:Telemetry) RETURN t.date as date, t.value as value LIMIT 30",
    colorScheme: "cyan"
  },
  {
    type: "DataGrid",
    title: "Filterable Data Table",
    category: "tables",
    description: "Interactive tabular log with real-time text filtering and numeric column alignment.",
    defaultW: 6,
    defaultH: 3,
    icon: TableIcon,
    defaultQuery: "MATCH (s:Submittal) RETURN s.code as Code, s.title as Title, s.delay_days as DelayDays, s.r0_severity as R0 LIMIT 25",
    colorScheme: "emerald"
  },
  {
    type: "StatusList",
    title: "Activity & Alert Feed",
    category: "tables",
    description: "Live list of equipment events, milestone handovers, and inspection flags.",
    defaultW: 6,
    defaultH: 3,
    icon: List,
    defaultQuery: "MATCH (e:Equipment)-[:HAS_EVENT]->(ev:Event) RETURN ev.title as Event, ev.severity as Status LIMIT 10",
    colorScheme: "rose"
  },
  {
    type: "RadarChart",
    title: "Multi-Axis Radar Matrix",
    category: "charts",
    description: "Radial chart comparing vendor performance across lead time, quality, cost, and compliance.",
    defaultW: 6,
    defaultH: 3,
    icon: Maximize2,
    defaultQuery: "MATCH (v:Vendor) RETURN v.name as subject, v.score as A LIMIT 6",
    colorScheme: "blue"
  },
  {
    type: "MarkdownCard",
    title: "Markdown Documentation",
    category: "text",
    description: "Rich text notes, facility operational checklists, or submittal review guidelines.",
    defaultW: 4,
    defaultH: 3,
    icon: FileText,
    defaultQuery: "RETURN '### Facility Operations Checklist\\n- Verify transformer grounding\\n- Confirm chiller coolant flow' as markdown",
    colorScheme: "emerald"
  },
  {
    type: "JSONViewer",
    title: "Raw Graph JSON Inspector",
    category: "text",
    description: "Direct JSON tree viewer for debugging Cypher payloads and raw node attributes.",
    defaultW: 6,
    defaultH: 3,
    icon: Code,
    defaultQuery: "MATCH (n:Submittal) RETURN n LIMIT 5",
    colorScheme: "cyan"
  }
];

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (widget: Partial<Widget>, defaultQuery?: string) => void;
}

export default function AddWidgetModal({ isOpen, onClose, onAdd }: AddWidgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "kpi" | "charts" | "tables" | "text">("all");
  const [search, setSearch] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<WidgetCatalogItem | null>(WIDGET_CATALOG[0]);
  const [customTitle, setCustomTitle] = useState<string>("");

  if (!isOpen) return null;

  const filteredItems = WIDGET_CATALOG.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = !search || 
      item.title.toLowerCase().includes(search.toLowerCase()) || 
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCreate = () => {
    if (!selectedItem) return;
    onAdd(
      {
        type: selectedItem.type,
        title: customTitle.trim() || selectedItem.title,
        description: selectedItem.description,
        w: selectedItem.defaultW,
        h: selectedItem.defaultH,
        colorScheme: selectedItem.colorScheme
      },
      selectedItem.defaultQuery
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#111111] border border-[#333333] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Specular Edge */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f5f5f5] font-sans">
                Add Visualizer Widget to Dashboard
              </h2>
              <p className="text-xs text-[#a3a3a3] font-mono mt-0.5">
                Select from 11 specialized enterprise widgets pre-configured for Neo4j telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#333333] rounded-md text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-[#262626] bg-[#0a0a0a]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#171717] p-1 rounded-lg border border-[#333333] text-xs font-mono">
            {(["all", "kpi", "charts", "tables", "text"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md transition-all uppercase tracking-wider text-[10px] font-bold ${
                  selectedCategory === cat
                    ? "bg-[#4edea3] text-[#003824] shadow-sm"
                    : "text-[#a3a3a3] hover:text-[#f5f5f5]"
                }`}
              >
                {cat === "all" ? "All Visualizers" : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[#171717] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-[#e5e5e5] w-64">
            <Search className="w-3.5 h-3.5 text-[#737373]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visualizers..."
              className="bg-transparent border-none outline-none w-full placeholder:text-[#737373]"
            />
          </div>
        </div>

        {/* Catalog Grid & Inspector Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          
          {/* Left List (2 cols) */}
          <div className="md:col-span-2 p-6 overflow-y-auto space-y-3 custom-scrollbar border-r border-[#262626]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.type === item.type;
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    onClick={() => {
                      setSelectedItem(item);
                      setCustomTitle(item.title);
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? "bg-[#4edea3]/10 border-[#4edea3] shadow-[0_0_16px_rgba(78,222,163,0.15)]"
                        : "bg-[#171717]/80 hover:bg-[#1c1c1c] border-[#333333] hover:border-[#404040]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-md ${
                          isSelected ? "bg-[#4edea3] text-[#003824]" : "bg-[#262626] text-[#4edea3]"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#f5f5f5] font-sans">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider">
                            {item.defaultW}x{item.defaultH} Grid Units
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a3a3a3] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Preview Panel (1 col) */}
          <div className="p-6 bg-[#0a0a0a] flex flex-col justify-between space-y-4 overflow-y-auto custom-scrollbar">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#4edea3] font-bold">
                    Configuration Preview
                  </span>
                  <h3 className="text-sm font-bold text-[#f5f5f5]">{selectedItem.title}</h3>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <label className="text-[#a3a3a3] text-[11px]">Widget Display Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={selectedItem.title}
                    className="w-full bg-[#171717] border border-[#333333] rounded-md px-3 py-2 text-xs text-[#e5e5e5] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>

                <div className="p-3 rounded-lg bg-[#171717] border border-[#333333] space-y-2 font-mono text-xs">
                  <span className="text-[10px] text-[#a3a3a3] uppercase tracking-wider block font-bold">
                    Default Cypher Query
                  </span>
                  <pre className="text-[10px] text-[#4edea3] whitespace-pre-wrap bg-[#0a0a0a] p-2 rounded border border-[#1c1c1c]">
                    {selectedItem.defaultQuery}
                  </pre>
                </div>

                <div className="p-3 rounded-lg bg-[#171717]/60 border border-[#262626] space-y-1 text-xs text-[#a3a3a3]">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span>Default Width:</span>
                    <span className="text-[#f5f5f5] font-bold">{selectedItem.defaultW} Columns</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span>Default Height:</span>
                    <span className="text-[#f5f5f5] font-bold">{selectedItem.defaultH} Rows</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#525252] text-xs font-mono">
                Select a visualizer from the left catalog.
              </div>
            )}

            <div className="pt-4 border-t border-[#262626] flex gap-2">
              <button
                onClick={onClose}
                className="w-1/3 py-2 bg-[#1c1c1c] hover:bg-[#333333] border border-[#333333] rounded-md text-xs font-mono text-[#e5e5e5] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedItem}
                className="w-2/3 py-2 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded-md text-xs font-mono flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(78,222,163,0.30)] cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Place Widget</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
