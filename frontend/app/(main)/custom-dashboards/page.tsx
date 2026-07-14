"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
interface Widget {
  id: string;
  type: "R0Gauge" | "PredictiveTrendChart" | "FormulaCard" | "DataGrid";
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SavedDashboard {
  id: string;
  dashboard_name: string;
  layout: Widget[];
  queries: Record<string, string>;
  created_at: string;
}

type DashboardCell = string | number | boolean | null | Record<string, unknown> | unknown[];
type DashboardRow = Record<string, DashboardCell>;
type WidgetData = DashboardRow[] | { error: string };

interface DashboardListResponse {
  dashboards?: SavedDashboard[];
}

interface GeneratedDashboard {
  dashboard_name?: string;
  layout: Widget[];
  queries: Record<string, string>;
}

interface SaveDashboardResponse {
  dashboard: SavedDashboard;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function isWidgetError(data: WidgetData | undefined): data is { error: string } {
  return Boolean(data && !Array.isArray(data) && "error" in data);
}

function getRows(data: WidgetData | undefined): DashboardRow[] {
  return Array.isArray(data) ? data : [];
}

function firstValue(data: WidgetData | undefined): DashboardCell | null {
  const rows = getRows(data);
  if (!rows[0]) return null;
  return Object.values(rows[0])[0] ?? null;
}

function formatCell(value: DashboardCell) {
  if (value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// ---------------------------------------------------------------------------
// Core Custom Dashboards Component
// ---------------------------------------------------------------------------
export default function CustomDashboards() {
  const [userRole, setUserRole] = useState<string>("viewer");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<SavedDashboard | null>(null);
  
  // Dynamic data fetched for currently active widgets
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [loadingData, setLoadingData] = useState<Record<string, boolean>>({});

  // Fetch user role on load
  const fetchUserRole = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data) {
        setUserRole(data.role || "viewer");
      }
    }
  };

  // Fetch list of saved dashboards on load
  const fetchDashboards = async () => {
    try {
      const resp = await fetch("/api/dashboards/list", { credentials: "include" });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const data = await resp.json() as DashboardListResponse;
      setDashboards(data.dashboards || []);
    } catch (err: unknown) {
      setErrorMsg("Failed to load dashboards: " + errorMessage(err));
    }
  };

  useEffect(() => {
    void fetchUserRole();
    void fetchDashboards();
  }, []);

  // Fetch query data for a specific widget query
  const fetchWidgetQuery = async (widgetId: string, query: string) => {
    setLoadingData((prev) => ({ ...prev, [widgetId]: true }));
    try {
      const resp = await fetch("/api/dashboards/query", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const result = await resp.json() as { data?: DashboardRow[] };
      setWidgetData((prev) => ({ ...prev, [widgetId]: Array.isArray(result.data) ? result.data : [] }));
    } catch (err: unknown) {
      setWidgetData((prev) => ({ ...prev, [widgetId]: { error: errorMessage(err) } }));
    } finally {
      setLoadingData((prev) => ({ ...prev, [widgetId]: false }));
    }
  };

  // Run all queries for the current dashboard
  useEffect(() => {
    if (currentDashboard) {
      setWidgetData({});
      Object.entries(currentDashboard.queries).forEach(([widgetId, query]) => {
        void fetchWidgetQuery(widgetId, query);
      });
    }
  }, [currentDashboard]);

  // Handle AI generation of a new dashboard config
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch("/api/dashboards/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail || resp.statusText);
      }
      const data = await resp.json() as GeneratedDashboard;
      
      // Auto-save the generated dashboard
      const saveResp = await fetch("/api/dashboards/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_name: data.dashboard_name || "AI Generated Dashboard",
          layout: data.layout,
          queries: data.queries,
        }),
      });
      if (!saveResp.ok) throw new Error("Generated successfully but failed to save to workspace.");
      const savedData = await saveResp.json() as SaveDashboardResponse;

      setPrompt("");
      void fetchDashboards();
      setCurrentDashboard(savedData.dashboard);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to decommission this custom dashboard?")) return;
    try {
      const resp = await fetch(`/api/dashboards/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      if (currentDashboard?.id === id) {
        setCurrentDashboard(null);
      }
      void fetchDashboards();
    } catch (err: unknown) {
      setErrorMsg("Decommission failed: " + errorMessage(err));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-[#e5e5e5] p-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#333333] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#f5f5f5] via-[#a3a3a3] to-[#525252] bg-clip-text text-transparent">
            AI Data Center Dashboard Builder
          </h1>
          <p className="text-sm text-[#a3a3a3] mt-1 font-mono">
            Orchestrate dynamic Parametric Knowledge Graph widgets for data center construction & engineering metrics.
          </p>
        </div>
        <span className="font-mono text-[9px] px-2 py-1 bg-[#171717] border border-[#404040] rounded text-[#4edea3] uppercase tracking-widest">
          ● Beta // AST Sandbox
        </span>
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar / Left Column: Prompter and Saved List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Prompt Box */}
          {(userRole === "super-admin" || userRole === "admin" || userRole === "manager") && (
            <div className="p-5 border border-[#333333] rounded-xl bg-[#171717]/60 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/40 to-transparent" />
              <h3 className="text-xs font-bold font-mono tracking-widest text-[#a3a3a3] uppercase mb-4">Prompt Dashboard Agent</h3>
              <form onSubmit={handleGenerate} className="space-y-3">
                <textarea
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Show me a list of all shipments with delay greater than 5 days, along with a formula card of our average submittal R0 score."
                  className="w-full h-32 px-3 py-2 bg-black/40 border border-[#404040] rounded-lg text-sm outline-none placeholder-[#525252] focus:border-[#4edea3]/40 transition-all font-mono resize-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#4edea3] hover:bg-[#6cf8bb] text-[#003824] font-bold rounded-lg uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                >
                  {loading ? "Generating Configuration..." : "Synthesize Dashboard"}
                </button>
              </form>
            </div>
          )}

          {/* Saved Dashboards List */}
          <div className="p-5 border border-[#333333] rounded-xl bg-[#171717]/60 backdrop-blur-md">
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#a3a3a3] uppercase mb-4">Custom Workspaces</h3>
            <div className="space-y-2">
              {dashboards.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#525252] font-mono">No workspaces found.</div>
              ) : (
                dashboards.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setCurrentDashboard(d)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm font-mono cursor-pointer transition-all ${
                      currentDashboard?.id === d.id
                        ? "border-[#4edea3]/40 bg-[#4edea3]/5 text-[#4edea3]"
                        : "border-[#404040]/40 bg-black/20 hover:bg-black/40 text-[#a3a3a3]"
                    }`}
                  >
                    <span className="truncate max-w-[120px]">{d.dashboard_name}</span>
                    {(userRole === "super-admin" || userRole === "admin" || userRole === "manager") && (
                      <button
                        onClick={(e) => handleDelete(d.id, e)}
                        className="text-[#525252] hover:text-red-400 font-mono text-[9px] uppercase tracking-wider transition-colors ml-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Canvas / Right Column */}
        <div className="lg:col-span-3">
          {errorMsg && (
            <div className="mb-6 p-4 border border-red-500/20 bg-red-500/10 text-red-400 rounded-lg font-mono text-xs">
              ERROR: {errorMsg}
            </div>
          )}

          {currentDashboard ? (
            <div className="space-y-6">
              {/* Active Workspace Header */}
              <div className="flex items-center justify-between border-b border-[#333333]/80 pb-3">
                <h2 className="text-xl font-bold font-mono text-[#f5f5f5]">{currentDashboard.dashboard_name}</h2>
                <button
                  onClick={() => {
                    // Re-run queries
                    setWidgetData({});
                    Object.entries(currentDashboard.queries).forEach(([widgetId, query]) => {
                      void fetchWidgetQuery(widgetId, query);
                    });
                  }}
                  className="px-3 py-1 border border-[#404040] rounded text-[10px] font-mono text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                >
                  Sync Data
                </button>
              </div>

              {/* Render dynamic widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentDashboard.layout.map((widget) => {
                  const data = widgetData[widget.id];
                  const isLoading = loadingData[widget.id];
                  const rows = getRows(data);
                  const primaryValue = firstValue(data);
                  const primaryNumber = typeof primaryValue === "number" ? primaryValue : Number(primaryValue ?? 0);
                  
                  return (
                    <div
                      key={widget.id}
                      className="p-5 border border-[#333333] rounded-xl bg-black/40 min-h-[250px] flex flex-col relative overflow-hidden"
                    >
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#a3a3a3] border-b border-[#333333] pb-2 mb-4">
                        {widget.title || widget.type}
                      </h4>

                      {isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-xs font-mono text-[#525252]">
                          Executing Cypher transaction...
                        </div>
                      ) : isWidgetError(data) ? (
                        <div className="flex-1 flex items-center justify-center text-xs font-mono text-red-400 p-4 text-center">
                          GraphQL Error: {data.error}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-center">
                          {widget.type === "FormulaCard" && (
                            <div className="text-center font-mono py-8">
                              <span className="text-5xl font-extrabold text-[#f5f5f5]">
                                {primaryValue !== null && typeof primaryValue !== "object" ? primaryValue.toLocaleString() : "—"}
                              </span>
                            </div>
                          )}

                          {widget.type === "R0Gauge" && (
                            <div className="text-center font-mono py-6">
                              <div className="relative inline-flex flex-col items-center justify-center">
                                <span className="text-6xl font-black text-[#4edea3]">
                                  {Number.isFinite(primaryNumber) ? primaryNumber.toFixed(1) : "0.0"}
                                </span>
                                <span className="text-[9px] uppercase tracking-widest text-[#525252] mt-1">R0 Severity Scale</span>
                              </div>
                            </div>
                          )}

                          {widget.type === "DataGrid" && (
                            <div className="overflow-x-auto w-full max-h-[200px] overflow-y-auto font-mono text-xs">
                              {rows.length > 0 ? (
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-[#333333] text-[#525252] uppercase text-[9px] tracking-wider">
                                      {Object.keys(rows[0]).map((key) => (
                                        <th key={key} className="pb-2 pr-4">{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#333333]/40 text-[#a3a3a3]">
                                    {rows.map((row, i) => (
                                      <tr key={i} className="hover:bg-white/5">
                                        {Object.values(row).map((val, j) => (
                                          <td key={j} className="py-2 pr-4 truncate max-w-[150px]">
                                            {formatCell(val)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-center py-4 text-[#525252]">Empty query response payload.</div>
                              )}
                            </div>
                          )}

                          {widget.type === "PredictiveTrendChart" && (
                            <div className="h-44 w-full">
                              {rows.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={rows}>
                                    <defs>
                                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4edea3" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4edea3" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                                    <XAxis dataKey="date" stroke="#525252" fontSize={10} />
                                    <YAxis stroke="#525252" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #404040" }} />
                                    <Area type="monotone" dataKey="value" stroke="#4edea3" fillOpacity={1} fill="url(#colorValue)" />
                                    <Area type="monotone" dataKey="predicted" stroke="#ffb3ad" strokeDasharray="5 5" fill="none" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="text-center py-4 text-[#525252]">Insufficient time-series payload.</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed border-[#333333] rounded-xl h-[450px] text-center p-6 bg-black/20">
              <svg className="w-12 h-12 text-[#525252] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <h3 className="text-lg font-bold font-mono text-[#f5f5f5] mb-1">Canvas Uninitialized</h3>
              <p className="text-xs text-[#525252] max-w-sm font-mono">
                Instruct the AI agent in the prompt pane to synthesize a customized business intelligence dashboard workspace.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
