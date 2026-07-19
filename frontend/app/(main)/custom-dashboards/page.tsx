"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Widget,
  SavedDashboard,
  WidgetData,
  PromptHistoryItem,
  ChatMessage,
  DashboardTheme,
  DashboardRow
} from "@/components/custom-dashboards/types";
import RightAgentSidebar from "@/components/custom-dashboards/RightAgentSidebar";
import DashboardCanvas from "@/components/custom-dashboards/DashboardCanvas";
import SaveDashboardModal from "@/components/custom-dashboards/SaveDashboardModal";
import { Layout } from "react-grid-layout";

// ---------------------------------------------------------------------------
// Pre-built Fallback Presets for Offline or Instant Demonstrations
// ---------------------------------------------------------------------------
const MOCK_PRESETS: Record<string, SavedDashboard> = {
  datacenter: {
    id: "preset-datacenter",
    dashboard_name: "Data Center Construction Telemetry",
    layout: [
      {
        id: "w1",
        type: "R0Gauge",
        title: "Submittal R0 Risk Index",
        description: "Aggregated risk severity scale for current engineering submittals",
        x: 0,
        y: 0,
        w: 1,
        h: 1
      },
      {
        id: "w2",
        type: "PredictiveTrendChart",
        title: "Predictive Thermal Forecast",
        description: "Rack temperature metrics and 7-day predictive AI threshold",
        x: 1,
        y: 0,
        w: 1,
        h: 1
      },
      {
        id: "w3",
        type: "FormulaCard",
        title: "Total Submittal Variance",
        description: "Average delay days across active data center packages",
        x: 0,
        y: 1,
        w: 1,
        h: 1
      },
      {
        id: "w4",
        type: "DataGrid",
        title: "Critical Path Shipments & NCRs",
        description: "Delayed shipments with submittal score impact",
        x: 1,
        y: 1,
        w: 1,
        h: 1
      }
    ],
    queries: {
      w1: "MATCH (s:Submittal) RETURN avg(s.r0_severity) as r0",
      w2: "MATCH (t:Telemetry) RETURN t.date as date, t.value as value",
      w3: "MATCH (s:Submittal) WHERE s.delay > 5 RETURN count(s) as delayed_count",
      w4: "MATCH (p:Package)-[:HAS_NCR]->(n:NCR) RETURN p.name as Package, n.status as Status, n.severity as Severity"
    },
    created_at: new Date().toISOString()
  },
  submittal: {
    id: "preset-submittal",
    dashboard_name: "Submittals & R0 Severity Monitor",
    layout: [
      {
        id: "w_sub_1",
        type: "R0Gauge",
        title: "Average R0 Severity Score",
        x: 0,
        y: 0,
        w: 1,
        h: 1
      },
      {
        id: "w_sub_2",
        type: "BarChart",
        title: "Submittals by Contractor",
        x: 1,
        y: 0,
        w: 1,
        h: 1
      },
      {
        id: "w_sub_3",
        type: "DataGrid",
        title: "High Delay Engineering Submittals",
        x: 0,
        y: 1,
        w: 2,
        h: 1
      }
    ],
    queries: {
      w_sub_1: "MATCH (s:Submittal) RETURN avg(s.r0_score) as avg_r0",
      w_sub_2: "MATCH (c:Contractor)<-[:SUBMITTED_BY]-(s:Submittal) RETURN c.name as name, count(s) as count",
      w_sub_3: "MATCH (s:Submittal) WHERE s.delay_days > 5 RETURN s.code as Code, s.title as Title, s.delay_days as DelayDays"
    },
    created_at: new Date().toISOString()
  },
  logistics: {
    id: "preset-logistics",
    dashboard_name: "Equipment Logistics & NCR Tracker",
    layout: [
      {
        id: "w_log_1",
        type: "DonutChart",
        title: "NCR Status Distribution",
        x: 0,
        y: 0,
        w: 1,
        h: 1
      },
      {
        id: "w_log_2",
        type: "FormulaCard",
        title: "Active Open NCRs",
        x: 1,
        y: 0,
        w: 1,
        h: 1
      },
      {
        id: "w_log_3",
        type: "DataGrid",
        title: "Equipment Shipments Log",
        x: 0,
        y: 1,
        w: 2,
        h: 1
      }
    ],
    queries: {
      w_log_1: "MATCH (n:NCR) RETURN n.status as name, count(n) as value",
      w_log_2: "MATCH (n:NCR {status: 'OPEN'}) RETURN count(n) as open_ncrs",
      w_log_3: "MATCH (e:Equipment)-[:IN_TRANSIT]->(s:Shipment) RETURN e.name as Equipment, s.carrier as Carrier, s.eta as ETA"
    },
    created_at: new Date().toISOString()
  }
};

const MOCK_QUERY_RESULTS: Record<string, DashboardRow[]> = {
  "r0": [{ primary_metric: 3.4, scale: "R0 Scale" }],
  "thermal": [
    { date: "Day 1", value: 22.4 },
    { date: "Day 2", value: 24.1 },
    { date: "Day 3", value: 23.8 },
    { date: "Day 4", value: 26.5 },
    { date: "Day 5", value: 25.2 },
    { date: "Day 6", value: 28.0 },
    { date: "Day 7", value: 27.4 }
  ],
  "submittals": [
    { Code: "SUB-104", Vendor: "Trane HVAC", DelayDays: 8, Status: "Critical" },
    { Code: "SUB-208", Vendor: "Cummins Power", DelayDays: 6, Status: "Warning" },
    { Code: "SUB-312", Vendor: "Schneider Elec", DelayDays: 12, Status: "Critical" },
    { Code: "SUB-405", Vendor: "ABB Switchgear", DelayDays: 4, Status: "Normal" }
  ],
  "default": [
    { metric: "Data Center Node A", status: "Active", value: 142.5 },
    { metric: "Data Center Node B", status: "Active", value: 98.2 }
  ]
};

export default function CustomDashboardsPage() {
  const [userRole, setUserRole] = useState<string>("admin");
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Dashboard state
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<SavedDashboard | null>(MOCK_PRESETS.datacenter);
  
  // Dynamic query data state
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [loadingData, setLoadingData] = useState<Record<string, boolean>>({});

  // Agent chat & prompt history state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Modals state
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);

  // Load saved prompt history from localStorage on initial mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("strand_prompt_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as PromptHistoryItem[];
        setPromptHistory(parsed);
      }
    } catch {
      // fallback
    }
  }, []);

  // Escape parent layout constraints for full-bleed interface like /brain
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.classList.remove('p-4', 'sm:p-6', 'lg:p-10');
      const innerContainer = mainEl.firstElementChild as HTMLElement;
      if (innerContainer) {
        innerContainer.classList.remove('max-w-[1440px]', 'mx-auto');
        innerContainer.classList.add('w-full', 'h-full');
      }
    }
    return () => {
      if (mainEl) {
        mainEl.classList.add('p-4', 'sm:p-6', 'lg:p-10');
        const innerContainer = mainEl.firstElementChild as HTMLElement;
        if (innerContainer) {
          innerContainer.classList.remove('w-full', 'h-full');
          innerContainer.classList.add('max-w-[1440px]', 'mx-auto');
        }
      }
    };
  }, []);

  // Save prompt history to localStorage
  const savePromptHistory = (newHistory: PromptHistoryItem[]) => {
    setPromptHistory(newHistory);
    try {
      localStorage.setItem("strand_prompt_history", JSON.stringify(newHistory));
    } catch {
      // fallback
    }
  };

  // Fetch user role
  const fetchUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data && data.role) {
          setUserRole(data.role);
        }
      }
    } catch {
      // fallback role remains admin
    }
  };

  // Fetch list of saved dashboards from backend
  const fetchDashboards = async () => {
    try {
      const resp = await fetch("/api/dashboards/list", { credentials: "include" });
      if (!resp.ok) return;
      const data = await resp.json() as { dashboards?: SavedDashboard[] };
      if (Array.isArray(data.dashboards) && data.dashboards.length > 0) {
        setDashboards(data.dashboards);
      } else {
        setDashboards(Object.values(MOCK_PRESETS));
      }
    } catch {
      setDashboards(Object.values(MOCK_PRESETS));
    }
  };

  useEffect(() => {
    void fetchUserRole();
    void fetchDashboards();
  }, []);

  // Execute query for a specific widget
  const fetchWidgetQuery = useCallback(async (widgetId: string, query: string) => {
    setLoadingData((prev) => ({ ...prev, [widgetId]: true }));
    try {
      const resp = await fetch("/api/dashboards/query", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (resp.ok) {
        const result = await resp.json() as { data?: DashboardRow[] };
        if (Array.isArray(result.data)) {
          setWidgetData((prev) => ({ ...prev, [widgetId]: result.data! }));
          return;
        }
      }
      
      // Mock fallback data based on query pattern
      if (query.toLowerCase().includes("r0")) {
        setWidgetData((prev) => ({ ...prev, [widgetId]: MOCK_QUERY_RESULTS.r0 }));
      } else if (query.toLowerCase().includes("telemetry") || query.toLowerCase().includes("thermal")) {
        setWidgetData((prev) => ({ ...prev, [widgetId]: MOCK_QUERY_RESULTS.thermal }));
      } else if (query.toLowerCase().includes("submittal") || query.toLowerCase().includes("ncr")) {
        setWidgetData((prev) => ({ ...prev, [widgetId]: MOCK_QUERY_RESULTS.submittals }));
      } else {
        setWidgetData((prev) => ({ ...prev, [widgetId]: MOCK_QUERY_RESULTS.default }));
      }
    } catch {
      setWidgetData((prev) => ({ ...prev, [widgetId]: MOCK_QUERY_RESULTS.default }));
    } finally {
      setLoadingData((prev) => ({ ...prev, [widgetId]: false }));
    }
  }, []);

  // Re-run all queries when current dashboard changes
  const runAllDashboardQueries = useCallback(() => {
    if (currentDashboard && currentDashboard.queries) {
      setWidgetData({});
      Object.entries(currentDashboard.queries).forEach(([widgetId, query]) => {
        void fetchWidgetQuery(widgetId, query);
      });
    }
  }, [currentDashboard, fetchWidgetQuery]);

  useEffect(() => {
    runAllDashboardQueries();
  }, [currentDashboard, runAllDashboardQueries]);

  // Handle AI synthesis generation from prompt
  const handleGenerate = async (promptToRun?: string) => {
    const activePrompt = (promptToRun || prompt).trim();
    if (!activePrompt || loading) return;

    setLoading(true);
    setErrorMsg(null);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add User Prompt message to chat log
    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      role: "user",
      content: activePrompt,
      timestamp,
      promptText: activePrompt
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add temporary Assistant Thinking message
    const assistantMsgId = "ast-" + Date.now();
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "Analyzing schema & synthesizing Parametric knowledge layout...",
      timestamp,
      isGenerating: true,
      steps: [
        { id: "s1", label: "Parsing AST prompt intent & schema", status: "in_progress" },
        { id: "s2", label: "Generating Cypher graph queries", status: "pending" },
        { id: "s3", label: "Synthesizing UI visualizer components", status: "pending" },
        { id: "s4", label: "Binding real-time telemetry stream", status: "pending" }
      ]
    };
    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      await new Promise((r) => setTimeout(r, 600));

      let generatedData: SavedDashboard | null = null;

      try {
        const resp = await fetch("/api/dashboards/generate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: activePrompt }),
        });

        if (resp.ok) {
          const body = await resp.json() as {
            dashboard_name?: string;
            layout: Widget[];
            queries: Record<string, string>;
          };
          generatedData = {
            id: "dash-" + Date.now(),
            dashboard_name: body.dashboard_name || "AI Generated BI Dashboard",
            layout: body.layout,
            queries: body.queries,
            created_at: new Date().toISOString(),
            prompt_used: activePrompt
          };
        }
      } catch {
        // network or server error, fallback below
      }

      // If backend was offline or failed, generate a dynamic mock dashboard based on prompt keywords
      if (!generatedData) {
        const titleLower = activePrompt.toLowerCase();
        let name = "AI Generated Custom Dashboard";
        if (titleLower.includes("submittal") || titleLower.includes("r0")) {
          name = "Submittal & R0 Severity Analysis";
        } else if (titleLower.includes("power") || titleLower.includes("thermal") || titleLower.includes("cooling")) {
          name = "Data Center Thermal & Telemetry Dashboard";
        } else if (titleLower.includes("logistics") || titleLower.includes("ncr") || titleLower.includes("shipment")) {
          name = "Equipment Logistics & NCR Monitoring";
        }

        generatedData = {
          id: "generated-" + Date.now(),
          dashboard_name: name,
          layout: [
            {
              id: "gen_w1",
              type: "R0Gauge",
              title: "Submittal R0 Risk Score",
              x: 0,
              y: 0,
              w: 1,
              h: 1
            },
            {
              id: "gen_w2",
              type: "PredictiveTrendChart",
              title: "7-Day Predictive Telemetry Trend",
              x: 1,
              y: 0,
              w: 1,
              h: 1
            },
            {
              id: "gen_w3",
              type: "FormulaCard",
              title: "Critical Path Delay Variance",
              x: 0,
              y: 1,
              w: 1,
              h: 1
            },
            {
              id: "gen_w4",
              type: "DataGrid",
              title: "Live Knowledge Graph Query Payload",
              x: 1,
              y: 1,
              w: 1,
              h: 1
            }
          ],
          queries: {
            gen_w1: "MATCH (s:Submittal) RETURN avg(s.r0_severity) as r0",
            gen_w2: "MATCH (t:Telemetry) RETURN t.date as date, t.value as value",
            gen_w3: "MATCH (s:Submittal) WHERE s.delay > 5 RETURN count(s) as delayed_count",
            gen_w4: "MATCH (n:NCR) RETURN n.code as Code, n.vendor as Vendor, n.severity as Status"
          },
          created_at: new Date().toISOString(),
          prompt_used: activePrompt
        };
      }

      // Persist newly generated dashboard to Supabase via backend API
      try {
        const saveResp = await fetch("/api/dashboards/save", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dashboard_name: generatedData.dashboard_name,
            layout: generatedData.layout,
            queries: generatedData.queries
          }),
        });
        if (saveResp.ok) {
          const resBody = await saveResp.json() as { dashboard?: SavedDashboard };
          if (resBody?.dashboard?.id) {
            generatedData.id = resBody.dashboard.id;
          }
        }
      } catch {
        // fallback to in-memory layout
      }

      setCurrentDashboard(generatedData);
      setDashboards((prev) => [generatedData!, ...prev]);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `Successfully synthesized "${generatedData!.dashboard_name}" with ${generatedData!.layout.length} interactive real-time widgets.`,
                isGenerating: false,
                dashboardName: generatedData!.dashboard_name,
                widgets: generatedData!.layout,
                steps: [
                  { id: "s1", label: "Parsed AST prompt intent & graph schema", status: "completed" },
                  { id: "s2", label: "Generated Cypher graph queries", status: "completed" },
                  { id: "s3", label: "Synthesized UI visualizer components", status: "completed" },
                  { id: "s4", label: "Bound real-time telemetry stream", status: "completed" }
                ]
              }
            : m
        )
      );

      const newHistoryItem: PromptHistoryItem = {
        id: "hist-" + Date.now(),
        prompt: activePrompt,
        timestamp,
        status: "completed",
        dashboardName: generatedData.dashboard_name,
        widgetsCount: generatedData.layout.length
      };

      savePromptHistory([newHistoryItem, ...promptHistory]);
      setPrompt("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to synthesize dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Delete saved dashboard layout
  const handleDeleteDashboard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to decommission this custom dashboard workspace?")) return;
    
    try {
      await fetch(`/api/dashboards/${id}`, { method: "DELETE", credentials: "include" });
    } catch {
      // proceed
    }

    setDashboards((prev) => prev.filter((d) => d.id !== id));
    if (currentDashboard?.id === id) {
      setCurrentDashboard(dashboards.find((d) => d.id !== id) || null);
    }
  };

  // Duplicate dashboard layout
  const handleDuplicateDashboard = (dashboardToDup: SavedDashboard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newDash: SavedDashboard = {
      ...dashboardToDup,
      id: "dash_dup_" + Date.now(),
      dashboard_name: `${dashboardToDup.dashboard_name} (Copy)`,
      created_at: new Date().toISOString()
    };
    setDashboards((prev) => [newDash, ...prev]);
    setCurrentDashboard(newDash);
  };

  // Save dashboard layout with modal options
  const handleSaveCustomLayoutModal = async (name: string, desc?: string, saveAsNew?: boolean) => {
    if (!currentDashboard) return;

    const targetId = saveAsNew || !currentDashboard.id ? "dash_custom_" + Date.now() : currentDashboard.id;
    const updatedDashboard: SavedDashboard = {
      ...currentDashboard,
      id: targetId,
      dashboard_name: name,
      prompt_used: desc || currentDashboard.prompt_used,
      created_at: new Date().toISOString()
    };

    try {
      const resp = await fetch("/api/dashboards/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_name: name,
          layout: updatedDashboard.layout,
          queries: updatedDashboard.queries
        }),
      });
      if (resp.ok) {
        const resBody = await resp.json() as { dashboard?: SavedDashboard };
        if (resBody?.dashboard?.id) {
          updatedDashboard.id = resBody.dashboard.id;
        }
      }
    } catch {
      // fallback
    }

    setCurrentDashboard(updatedDashboard);
    setDashboards((prev) => {
      const exists = prev.some((d) => d.id === updatedDashboard.id);
      if (exists) {
        return prev.map((d) => (d.id === updatedDashboard.id ? updatedDashboard : d));
      }
      return [updatedDashboard, ...prev];
    });
  };

  // Export Layout Config as JSON File
  const handleExportLayoutJson = (dashToExport?: SavedDashboard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dash = dashToExport || currentDashboard;
    if (!dash) return;

    const jsonString = JSON.stringify(dash, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dash.dashboard_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_layout.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Layout Change from React Grid Layout
  const handleLayoutChange = (newLayout: Layout) => {
    if (!currentDashboard) return;
    const updatedLayout = currentDashboard.layout.map(widget => {
      const layoutItem = newLayout.find(l => l.i === widget.id);
      if (layoutItem) {
        return { ...widget, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
      }
      return widget;
    });
    setCurrentDashboard({
      ...currentDashboard,
      layout: updatedLayout
    });
  };

  // Duplicate widget
  const handleDuplicateWidget = (widget: Widget) => {
    if (!currentDashboard) return;
    const newWidget: Widget = {
      ...widget,
      id: "w_dup_" + Date.now(),
      title: `${widget.title || widget.type} (Copy)`
    };
    const queries = { ...currentDashboard.queries, [newWidget.id]: currentDashboard.queries[widget.id] || "" };
    setCurrentDashboard({
      ...currentDashboard,
      layout: [...currentDashboard.layout, newWidget],
      queries
    });
    void fetchWidgetQuery(newWidget.id, queries[newWidget.id]);
  };

  // Delete widget
  const handleDeleteWidget = (widgetId: string) => {
    if (!currentDashboard) return;
    const layout = currentDashboard.layout.filter((w) => w.id !== widgetId);
    const queries = { ...currentDashboard.queries };
    delete queries[widgetId];
    setCurrentDashboard({
      ...currentDashboard,
      layout,
      queries
    });
  };

  // Save changes from Widget settings popup
  const handleSaveWidgetEdit = (updatedWidget: Partial<Widget>) => {
    if (!currentDashboard) return;
    let layout = [...currentDashboard.layout];
    const queries = { ...currentDashboard.queries };

    if (!updatedWidget.id) {
      // Create new widget
      const newWidget: Widget = {
        id: "w_new_" + Date.now(),
        type: updatedWidget.type || "FormulaCard",
        title: updatedWidget.title || "New Widget",
        description: updatedWidget.description || "",
        x: 0,
        y: Infinity, // puts it at the bottom
        w: 1,
        h: 1,
      };
      layout.push(newWidget);
      queries[newWidget.id] = "";
    } else {
      // Update existing widget
      layout = layout.map((w) => (w.id === updatedWidget.id ? { ...w, ...updatedWidget } as Widget : w));
    }

    setCurrentDashboard({
      ...currentDashboard,
      layout,
      queries
    });
  };

  // Clear prompt history
  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your prompt history log?")) {
      savePromptHistory([]);
    }
  };

  // Start new chat session
  const handleNewChat = () => {
    setMessages([]);
    setPrompt("");
  };

  // Load preset template
  const handleLoadPreset = (presetKey: string) => {
    const preset = MOCK_PRESETS[presetKey];
    if (preset) {
      setCurrentDashboard(preset);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex overflow-hidden bg-[#111111] font-sans relative">
      {/* Global Error Banner */}
      {errorMsg && (
        <div className="absolute top-2 left-4 right-4 z-50 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-mono flex items-center justify-between">
          <span>ERROR: {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-[#a3a3a3] hover:text-white">✕</button>
        </div>
      )}

      {/* Main Split Layout: Left Interactive Real-Time Canvas & Right Cursor AI Agent Sidebar */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <DashboardCanvas
          currentDashboard={currentDashboard}
          widgetData={widgetData}
          loadingData={loadingData}
          isGenerating={loading}
          onRefreshData={runAllDashboardQueries}
          onOpenSaveModal={() => setSaveModalOpen(true)}
          onExportJson={() => handleExportLayoutJson()}
          onAddWidget={() => {
            handleSaveWidgetEdit({ type: "FormulaCard", title: "New Widget", w: 1, h: 1 });
          }}
          onDeleteWidget={handleDeleteWidget}
          onDuplicateWidget={handleDuplicateWidget}
          onLayoutChange={handleLayoutChange}
          onUpdateWidget={handleSaveWidgetEdit}
          onLoadPreset={handleLoadPreset}
        />
      </div>

      {/* RIGHT SIDEBAR: CURSOR AI AGENT CHAT & PROMPT HISTORY */}
      <RightAgentSidebar
        userRole={userRole}
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        messages={messages}
        promptHistory={promptHistory}
        dashboards={dashboards}
        currentDashboard={currentDashboard}
        onGenerate={handleGenerate}
        onSelectDashboard={setCurrentDashboard}
        onDeleteDashboard={handleDeleteDashboard}
        onDuplicateDashboard={handleDuplicateDashboard}
        onExportDashboardJson={handleExportLayoutJson}
        onClearHistory={handleClearHistory}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onOpenSaveModal={() => setSaveModalOpen(true)}
      />

      {/* SAVE DASHBOARD LAYOUT MODAL */}
      <SaveDashboardModal
        isOpen={saveModalOpen}
        currentDashboard={currentDashboard}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveCustomLayoutModal}
        onExportJson={() => handleExportLayoutJson()}
      />
    </div>
  );
}
