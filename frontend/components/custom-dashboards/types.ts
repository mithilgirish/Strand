export type WidgetType =
  | "R0Gauge"
  | "PredictiveTrendChart"
  | "FormulaCard"
  | "DataGrid"
  | "BarChart"
  | "DonutChart"
  | "LineChart"
  | "RadarChart"
  | "ScatterChart"
  | "MarkdownCard"
  | "JSONViewer"
  | "StatusList";

export interface Widget {
  id: string;
  type: WidgetType;
  title?: string;
  description?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  colorScheme?: "emerald" | "cyan" | "amber" | "purple" | "rose" | "blue";
  metricKey?: string;
  subtitle?: string;
}

export interface SavedDashboard {
  id: string;
  dashboard_name: string;
  layout: Widget[];
  queries: Record<string, string>;
  created_at: string;
  prompt_used?: string;
}

export type DashboardCell = string | number | boolean | null | Record<string, unknown> | unknown[];
export type DashboardRow = Record<string, DashboardCell>;
export type WidgetData = DashboardRow[] | { error: string };

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
  status: "completed" | "failed" | "generating";
  dashboardName?: string;
  widgetsCount?: number;
}

export interface AgentStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "error";
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  promptText?: string;
  dashboardName?: string;
  widgets?: Widget[];
  steps?: AgentStep[];
  isGenerating?: boolean;
}

export type DashboardTheme = "obsidian" | "emerald" | "cyber" | "slate";
