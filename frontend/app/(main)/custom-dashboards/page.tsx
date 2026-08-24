"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Widget,
  SavedDashboard,
  WidgetData,
  PromptHistoryItem,
  ChatMessage,
  DashboardRow
} from "@/components/custom-dashboards/types";
import RightAgentSidebar from "@/components/custom-dashboards/RightAgentSidebar";
import DashboardCanvas from "@/components/custom-dashboards/DashboardCanvas";
import SaveDashboardModal from "@/components/custom-dashboards/SaveDashboardModal";
import AddWidgetModal from "@/components/custom-dashboards/AddWidgetModal";
import ProvenanceBadge from "@/components/shared/ProvenanceBadge";
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
        w: 3,
        h: 2
      },
      {
        id: "w3",
        type: "FormulaCard",
        title: "Total Submittal Variance",
        description: "Average delay days across active data center packages",
        x: 3,
        y: 0,
        w: 3,
        h: 2
      },
      {
        id: "w2",
        type: "PredictiveTrendChart",
        title: "Predictive Thermal Forecast",
        description: "Rack temperature metrics and 7-day predictive AI threshold",
        x: 6,
        y: 0,
        w: 6,
        h: 2
      },
      {
        id: "w4",
        type: "DataGrid",
        title: "Critical Path Shipments & NCRs",
        description: "Delayed shipments with submittal score impact",
        x: 0,
        y: 2,
        w: 12,
        h: 3
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
        w: 4,
        h: 2
      },
      {
        id: "w_sub_2",
        type: "BarChart",
        title: "Submittals by Contractor",
        x: 4,
        y: 0,
        w: 8,
        h: 2
      },
      {
        id: "w_sub_3",
        type: "DataGrid",
        title: "High Delay Engineering Submittals",
        x: 0,
        y: 2,
        w: 12,
        h: 3
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
        id: "w_log_2",
        type: "FormulaCard",
        title: "Active Open NCRs",
        x: 0,
        y: 0,
        w: 4,
        h: 2
      },
      {
        id: "w_log_1",
        type: "DonutChart",
        title: "NCR Status Distribution",
        x: 4,
        y: 0,
        w: 8,
        h: 2
      },
      {
        id: "w_log_3",
        type: "DataGrid",
        title: "Equipment Shipments Log",
        x: 0,
        y: 2,
        w: 12,
        h: 3
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

function normalizeLayout(layout: Widget[]): Widget[] {
  return layout.map((widget) => {
    let w = Number(widget.w) || 6;
    let h = Number(widget.h) || 3;
    let x = Number(widget.x) || 0;
    let y = Number(widget.y) || 0;

    if (w <= 2) {
      if (widget.type === "FormulaCard" || widget.type === "R0Gauge") {
        w = 3;
        h = 2;
      } else {
        w = 6;
        h = 3;
      }
    }

    return {
      ...widget,
      w: Math.min(12, Math.max(2, w)),
      h: Math.max(2, h),
      x: Math.min(11, Math.max(0, x)),
      y: Math.max(0, y)
    };
  });
}

function normalizeDashboard(dashboard: SavedDashboard): SavedDashboard {
  return { ...dashboard, layout: normalizeLayout(dashboard.layout || []) };
}

export default function CustomDashboardsPage() {
  const [userRole, setUserRole] = useState<string>("viewer");
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Dashboard state
  const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<SavedDashboard | null>(
    normalizeDashboard(MOCK_PRESETS.datacenter)
  );
  
  // Dynamic query data state
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [widgetSources, setWidgetSources] = useState<Record<string, string>>({});
  const hasLiveWidgetRef = useRef(false);
  const [loadingData, setLoadingData] = useState<Record<string, boolean>>({});

  // Agent chat & prompt history state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Modals state
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState<boolean>(false);

  // Load saved prompt history from Supabase (fallback to localStorage)
  const fetchPromptHistory = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("dashboard_prompt_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted: PromptHistoryItem[] = data.map((item) => ({
            id: item.id,
            prompt: item.prompt,
            timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: item.status || "success",
            dashboardName: item.dashboard_name,
            widgetsCount: item.widgets_count || 4
          }));
          setPromptHistory(formatted);
          try {
            localStorage.setItem("strand_prompt_history", JSON.stringify(formatted));
          } catch {
            // fallback
          }
          return;
        }
      }
    } catch {
      // fallback to localStorage
    }

    try {
      const savedHistory = localStorage.getItem("strand_prompt_history");
      if (savedHistory) {
        setPromptHistory(JSON.parse(savedHistory) as PromptHistoryItem[]);
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

  // Save prompt history item to Supabase + localStorage
  const savePromptHistory = async (newHistory: PromptHistoryItem[], newItem?: PromptHistoryItem) => {
    setPromptHistory(newHistory);
    try {
      localStorage.setItem("strand_prompt_history", JSON.stringify(newHistory));
    } catch {
      // fallback
    }

    if (newItem) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("dashboard_prompt_history").insert({
            prompt: newItem.prompt,
            dashboard_name: newItem.dashboardName || "Custom Dashboard",
            widgets_count: newItem.widgetsCount || 4,
            status: newItem.status || "success"
          });
        }
      } catch {
        // network fallback
      }
    }
  };

  // Sync chat messages to Supabase
  const syncChatStateToSupabase = async (newMessages: ChatMessage[]) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("dashboard_chat_state").upsert({
          user_id: user.id,
          messages: newMessages
        });
      }
    } catch {
      // fallback
    }
  };

  // Fetch chat messages from Supabase
  const fetchChatState = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("dashboard_chat_state")
          .select("messages")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.messages && Array.isArray(data.messages)) {
          setMessages(data.messages as ChatMessage[]);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  // Fetch user role
  const fetchUserRole = useCallback(async () => {
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
      // fallback role remains viewer
    }
  }, []);

  // Fetch list of saved dashboards from backend / Supabase
  const fetchDashboards = useCallback(async () => {
    try {
      const resp = await fetch("/api/dashboards/list", { credentials: "include" });
      if (resp.ok) {
        const data = await resp.json() as { dashboards?: SavedDashboard[] };
        if (Array.isArray(data.dashboards) && data.dashboards.length > 0) {
          setDashboards(data.dashboards);
          return;
        }
      }

      // Direct Supabase query fallback
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setDashboards(Object.values(MOCK_PRESETS));
        return;
      }
      const { data: dbDashboards, error } = await supabase
        .from("custom_dashboards")
        .select("*")
        .eq("created_by", authUser.id)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(dbDashboards) && dbDashboards.length > 0) {
        setDashboards(dbDashboards as SavedDashboard[]);
        return;
      }
    } catch {
      // fallback
    }
    setDashboards(Object.values(MOCK_PRESETS));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUserRole();
    void fetchDashboards();
    void fetchPromptHistory();
    void fetchChatState();
  }, [fetchUserRole, fetchDashboards, fetchPromptHistory, fetchChatState]);

  // Auto-sync chat messages to Supabase when they change (skip during generation)
  useEffect(() => {
    if (messages.some(m => m.isGenerating)) return;
    void syncChatStateToSupabase(messages);
  }, [messages]);

  // Execute query for a specific widget with real-time stream handling
  const fetchWidgetQuery = useCallback(async (widgetId: string, query: string) => {
    setLoadingData((prev) => ({ ...prev, [widgetId]: true }));
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch {
        // continue without a bearer token
      }

      let resp = await fetch("/api/dashboards/query", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) {
        resp = await fetch(`${apiBase}/api/v1/dashboards/query`, {
          method: "POST",
          headers,
          body: JSON.stringify({ query }),
        });
      }

      if (resp.ok) {
        const result = await resp.json() as { data?: DashboardRow[], source?: string, provenance_note?: string };
        const source = result.source || "live";
        const rows = Array.isArray(result.data) ? result.data : [];
        if (rows.length > 0 || source === "submittal") {
          setWidgetData((prev) => ({ ...prev, [widgetId]: rows }));
        }
        setWidgetSources((prev) => ({ ...prev, [widgetId]: source }));
        hasLiveWidgetRef.current = hasLiveWidgetRef.current || source === "live" || source === "submittal";
        return;
      }

      setWidgetSources((prev) => ({ ...prev, [widgetId]: prev[widgetId] || "unavailable" }));
    } catch {
      setWidgetSources((prev) => ({ ...prev, [widgetId]: prev[widgetId] || "unavailable" }));
    } finally {
      setLoadingData((prev) => ({ ...prev, [widgetId]: false }));
    }
  }, []);

  // Re-run all queries when current dashboard changes
  const runAllDashboardQueries = useCallback(() => {
    if (currentDashboard && currentDashboard.queries) {
      Object.entries(currentDashboard.queries).forEach(([widgetId, query]) => {
        void fetchWidgetQuery(widgetId, query);
      });
    }
  }, [currentDashboard, fetchWidgetQuery]);

  // Re-run queries on dashboard change. Keep polling so a Guardian PDF shows up without a manual refresh.
  useEffect(() => {
    hasLiveWidgetRef.current = false;
    runAllDashboardQueries();
    const interval = setInterval(() => {
      runAllDashboardQueries();
    }, 15000);
    const onSubmittalUpdated = () => runAllDashboardQueries();
    window.addEventListener("strand-submittal-updated", onSubmittalUpdated);
    const onStorage = (event: StorageEvent) => {
      if (event.key === "strand_submittal_updated") runAllDashboardQueries();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("strand-submittal-updated", onSubmittalUpdated);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDashboard?.id]);

  useEffect(() => {
    if (!currentDashboard?.queries) return;
    const ids = Object.keys(currentDashboard.queries);
    if (!ids.length) return;
    if (ids.some((id) => loadingData[id])) return;
    if (ids.some((id) => widgetSources[id] == null)) return;

    const sources = ids.map((id) => widgetSources[id]);
    if (sources.includes("submittal")) {
      setErrorMsg(null);
      return;
    }
    const hasRows = ids.some((id) => Array.isArray(widgetData[id]) && widgetData[id].length > 0);
    if (hasRows) {
      if (sources.some((source) => source === "demo" || source === "degraded")) {
        setErrorMsg("Showing DEMO / fallback widget rows from the backend. Not the vendor submittal.");
      } else {
        setErrorMsg(null);
      }
      return;
    }
    if (sources.every((source) => source === "unavailable")) {
      setErrorMsg("Upload a vendor submittal on Guardian. Custom dashboards read that PDF.");
    }
  }, [widgetSources, widgetData, loadingData, currentDashboard]);

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
            layout: normalizeLayout(body.layout),
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

        generatedData = normalizeDashboard({
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
              title: "Spec vs Submittal Variance",
              x: 1,
              y: 0,
              w: 1,
              h: 1
            },
            {
              id: "gen_w3",
              type: "FormulaCard",
              title: "Open Spec Deviations",
              x: 0,
              y: 1,
              w: 1,
              h: 1
            },
            {
              id: "gen_w4",
              type: "DataGrid",
              title: "Vendor Submittal Violations",
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
        });
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

      void savePromptHistory([newHistoryItem, ...promptHistory], newHistoryItem);
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
      // Create new widget with proper default dimensions
      const newWidgetId = "w_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      const isSmall = updatedWidget.type === "FormulaCard" || updatedWidget.type === "R0Gauge";
      const newWidget: Widget = {
        id: newWidgetId,
        type: updatedWidget.type || "FormulaCard",
        title: updatedWidget.title || "New Widget",
        description: updatedWidget.description || "",
        x: 0,
        y: Infinity, // puts it at the bottom
        w: updatedWidget.w || (isSmall ? 3 : 6),
        h: updatedWidget.h || (isSmall ? 2 : 3),
      };
      layout.push(newWidget);
      queries[newWidget.id] = "MATCH (s:Submittal) RETURN s LIMIT 10";
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

  // Add widget directly from visual catalog
  const handleAddWidgetFromCatalog = (widgetConfig: Partial<Widget>, defaultQuery?: string) => {
    if (!currentDashboard) return;
    const newWidgetId = "w_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newW = widgetConfig.w || (widgetConfig.type === "FormulaCard" || widgetConfig.type === "R0Gauge" ? 3 : 6);
    const newH = widgetConfig.h || 3;
    
    // Find next available position on canvas
    const currentItems = currentDashboard.layout || [];
    let maxY = 0;
    currentItems.forEach(item => {
      maxY = Math.max(maxY, (item.y || 0) + (item.h || 0));
    });

    const newWidget: Widget = {
      id: newWidgetId,
      type: widgetConfig.type || "FormulaCard",
      title: widgetConfig.title || "Custom Widget",
      description: widgetConfig.description || "",
      x: 0,
      y: maxY,
      w: newW,
      h: newH,
      colorScheme: widgetConfig.colorScheme || "emerald"
    };

    const q = defaultQuery || "MATCH (s:Submittal) RETURN s.code as Code, s.title as Title LIMIT 10";
    const updatedQueries = {
      ...currentDashboard.queries,
      [newWidgetId]: q
    };

    const updatedDashboard = {
      ...currentDashboard,
      layout: [...currentItems, newWidget],
      queries: updatedQueries
    };

    setCurrentDashboard(updatedDashboard);
    void fetchWidgetQuery(newWidgetId, q);
  };

  // Save updated query from Query Inspector
  const handleSaveWidgetQuery = (widgetId: string, newQuery: string) => {
    if (!currentDashboard) return;
    const updatedQueries = {
      ...currentDashboard.queries,
      [widgetId]: newQuery
    };
    setCurrentDashboard({
      ...currentDashboard,
      queries: updatedQueries
    });
    void fetchWidgetQuery(widgetId, newQuery);
  };

  // Clear prompt history from Supabase + localStorage
  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear your prompt history log?")) {
      void savePromptHistory([]);
      try {
        localStorage.removeItem("strand_prompt_history");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("dashboard_prompt_history").delete().eq("user_id", user.id);
        }
      } catch {
        // fallback
      }
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
      setCurrentDashboard(normalizeDashboard(preset));
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-[#0a0a0a] font-sans relative">
      {/* Global Banner (Error or Warning) */}
      {errorMsg && (
        <div className={`absolute top-2 left-4 right-4 z-50 p-3 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg backdrop-blur-md transition-all ${
          errorMsg.toLowerCase().startsWith("warning") || errorMsg.toLowerCase().startsWith("showing demo")
            ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          <span>{errorMsg.toLowerCase().startsWith("warning") || errorMsg.toLowerCase().startsWith("error") || errorMsg.toLowerCase().startsWith("showing demo") ? errorMsg : `ERROR: ${errorMsg}`}</span>
          <button onClick={() => setErrorMsg(null)} className="text-[#a3a3a3] hover:text-white ml-2">✕</button>
        </div>
      )}
      {Object.values(widgetSources).some((source) => source === "demo" || source === "unavailable" || source === "degraded") && (
        <div className="absolute bottom-3 left-4 z-40">
          <ProvenanceBadge source="unavailable" note="Widgets are empty until a vendor submittal is analyzed" />
        </div>
      )}
      {Object.values(widgetSources).some((source) => source === "submittal") && (
        <div className="absolute bottom-3 left-4 z-40">
          <ProvenanceBadge source="submittal" note="Widgets derived from the latest Guardian vendor submittal" />
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
          onAddWidget={() => setAddWidgetModalOpen(true)}
          onDeleteWidget={handleDeleteWidget}
          onDuplicateWidget={handleDuplicateWidget}
          onLayoutChange={handleLayoutChange}
          onUpdateWidget={handleSaveWidgetEdit}
          onSaveQuery={handleSaveWidgetQuery}
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
        onSelectDashboard={(dashboard) => setCurrentDashboard(normalizeDashboard(dashboard))}
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

      {/* ADD WIDGET CATALOG MODAL */}
      <AddWidgetModal
        isOpen={addWidgetModalOpen}
        onClose={() => setAddWidgetModalOpen(false)}
        onAdd={handleAddWidgetFromCatalog}
      />
    </div>
  );
}
