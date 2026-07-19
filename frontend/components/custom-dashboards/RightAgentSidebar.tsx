"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  User, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  History, 
  FolderKanban, 
  ChevronRight, 
  Trash2, 
  Play, 
  Plus,
  Zap,
  Layout,
  MessageSquare,
  FileCode,
  Copy
} from "lucide-react";
import { SavedDashboard, PromptHistoryItem, ChatMessage } from "./types";

interface RightAgentSidebarProps {
  userRole: string;
  prompt: string;
  setPrompt: (p: string) => void;
  loading: boolean;
  messages: ChatMessage[];
  promptHistory: PromptHistoryItem[];
  dashboards: SavedDashboard[];
  currentDashboard: SavedDashboard | null;
  onGenerate: (promptToRun?: string) => Promise<void>;
  onSelectDashboard: (dashboard: SavedDashboard) => void;
  onDeleteDashboard: (id: string, e: React.MouseEvent) => void;
  onDuplicateDashboard?: (dashboard: SavedDashboard, e: React.MouseEvent) => void;
  onExportDashboardJson?: (dashboard: SavedDashboard, e: React.MouseEvent) => void;
  onClearHistory: () => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenSaveModal: () => void;
}

const QUICK_PROMPTS = [
  {
    title: "Submittals & R0 Severity",
    prompt: "Show me a list of all submittals with delay greater than 5 days, along with a formula card of average submittal R0 severity score and a trend chart."
  },
  {
    title: "Equipment Logistics & NCRs",
    prompt: "Generate a dashboard tracking data center cooling unit shipments, active non-conformance reports (NCRs), and delivery status timelines."
  },
  {
    title: "Thermal & Power Telemetry",
    prompt: "Build an executive thermal monitoring dashboard with R0 severity gauge, power utilization trend chart, and high-temp server rack data grid."
  },
  {
    title: "Budget & Milestone Risk",
    prompt: "Synthesize a cost variance dashboard displaying milestone progress gauges, total financial risk formula card, and budget line item breakdown."
  }
];

export default function RightAgentSidebar({
  userRole,
  prompt,
  setPrompt,
  loading,
  messages,
  promptHistory,
  dashboards,
  currentDashboard,
  onGenerate,
  onSelectDashboard,
  onDeleteDashboard,
  onDuplicateDashboard,
  onExportDashboardJson,
  onClearHistory,
  onNewChat,
  isOpen,
  onToggleOpen,
  onOpenSaveModal
}: RightAgentSidebarProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "history" | "dashboards">("chat");
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(420);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = 'none'; // prevent text selection while dragging
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Auto scroll to bottom of chat on new messages
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    void onGenerate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !loading) {
        void onGenerate();
      }
    }
  };

  const filteredHistory = promptHistory.filter((item) =>
    item.prompt.toLowerCase().includes(searchHistoryQuery.toLowerCase())
  );

  return (
    <>
      {/* Main Sidebar Container - In-Flow Flex Sidebar */}
      <div
        style={{ width: isOpen ? (isMobile ? "100%" : `${sidebarWidth}px`) : undefined }}
        className={`h-full bg-[#111111]/95 backdrop-blur-xl border-l border-[#262626] flex flex-col shrink-0 relative ${
          !isOpen && "w-14"
        } ${!isResizing && "transition-all duration-300"}`}
      >
        {/* Resizer Handle */}
        {isOpen && !isMobile && (
          <div
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
            className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors ${
              isResizing ? "bg-[#4edea3]" : "hover:bg-[#4edea3]/50"
            }`}
          />
        )}
        {!isOpen ? (
          <div className="flex-1 flex flex-col items-center py-4 space-y-4 overflow-hidden">
            <button
              onClick={onToggleOpen}
              className="w-10 h-10 rounded-lg bg-[#171717] border border-[#262626] hover:border-[#4edea3]/50 flex items-center justify-center text-[#4edea3] shadow-md transition-all group"
              title="Open BI Agent"
            >
              <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
            
            <div className="w-6 h-px bg-[#262626] my-2" />

            <button
              onClick={() => { setActiveTab("chat"); onToggleOpen(); }}
              className="p-2.5 text-[#a3a3a3] hover:text-[#4edea3] transition-colors rounded-md hover:bg-[#262626]"
              title="Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => { setActiveTab("history"); onToggleOpen(); }}
              className="p-2.5 text-[#a3a3a3] hover:text-[#4edea3] transition-colors rounded-md hover:bg-[#262626]"
              title="Prompt History"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => { setActiveTab("dashboards"); onToggleOpen(); }}
              className="p-2.5 text-[#a3a3a3] hover:text-[#4edea3] transition-colors rounded-md hover:bg-[#262626]"
              title="Saved Layouts"
            >
              <FolderKanban className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
            {/* Header Bar */}
            <div className="p-3.5 border-b border-[#262626] bg-[#171717]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-md bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
                <Bot className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4edea3] ring-2 ring-[#111111] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="label-caps text-[#f5f5f5] tracking-wider text-xs">
                  BI Agent
                </span>
                
              </div>
              <span className="text-[10px] font-mono text-[#a3a3a3] block">
                Industrial Parametric BI Synthesizer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-1.5 hover:bg-[#262626] rounded-md text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
              title="New Chat Session"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleOpen}
              className="p-1.5 hover:bg-[#262626] rounded-md text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector - Label Caps */}
        <div className="grid grid-cols-3 border-b border-[#262626] bg-[#171717]/60 p-1 font-sans text-xs">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all label-caps text-[10px] ${
              activeTab === "chat"
                ? "bg-[#262626] text-[#4edea3] font-bold shadow"
                : "text-[#a3a3a3] hover:text-[#e5e5e5]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="truncate">Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all label-caps text-[10px] ${
              activeTab === "history"
                ? "bg-[#262626] text-[#4edea3] font-bold shadow"
                : "text-[#a3a3a3] hover:text-[#e5e5e5]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="truncate">Prompts ({promptHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("dashboards")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all label-caps text-[10px] ${
              activeTab === "dashboards"
                ? "bg-[#262626] text-[#4edea3] font-bold shadow"
                : "text-[#a3a3a3] hover:text-[#e5e5e5]"
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span className="truncate">Saved ({dashboards.length})</span>
          </button>
        </div>

        {/* TAB CONTENT 1: CHAT AGENT */}
        {activeTab === "chat" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs custom-scrollbar min-h-0">
            {messages.length === 0 && (
              <div className="p-4 rounded-lg border border-[#262626] bg-[#1c1c1c]/40 space-y-3 glass-panel">
                <div className="flex items-center gap-2 text-[#4edea3] label-caps text-xs">

                  <span>Real-Time Dashboard Synthesizer</span>
                </div>
                <p className="text-[#a3a3a3] text-xs leading-relaxed">
                  Enter a prompt below to synthesize custom business intelligence dashboards with live graph metrics, R0 severity gauges, and predictive trend charts.
                </p>
                
                {/* Quick Prompt Suggestions */}
                <div className="space-y-1.5 pt-2">
                  <span className="label-caps text-[10px] text-[#737373] block">
                    Suggested Prompts:
                  </span>
                  {QUICK_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(qp.prompt)}
                      className="w-full text-left p-2.5 rounded-md border border-[#262626] bg-[#171717]/60 hover:bg-[#262626] hover:border-[#4edea3]/40 transition-all text-xs text-[#e5e5e5] font-mono flex items-center justify-between group"
                      style={{ boxShadow: i < QUICK_PROMPTS.length - 1 ? undefined : undefined, borderBottom: '1px solid #1a1a1a' }}
                    >
                      <span className="truncate">{qp.title}</span>
                      <ChevronRight className="w-3 h-3 text-[#525252] group-hover:text-[#4edea3] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Chat Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {msg.role === "user" ? (
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="max-w-[85%] rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 p-3 text-[#e5e5e5] font-mono text-xs space-y-1 shadow-md">
                      <div className="flex items-center justify-between text-[10px] text-[#4edea3]/80 pb-1 border-b border-[#4edea3]/20">
                        <span className="label-caps flex items-center gap-1">
                          <User className="w-3 h-3" /> You
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-[12px]">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#262626] border border-[#404040] flex items-center justify-center text-[#4edea3] shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 rounded-lg bg-[#1c1c1c] border border-[#262626] p-3 text-[#d4d4d4] space-y-3 shadow-md font-mono text-xs glass-panel">
                      <div className="flex items-center justify-between text-[10px] text-[#737373] pb-1 border-b border-[#262626]">
                        <span className="label-caps text-[#4edea3] flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Agent Response
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Step process visualization */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="space-y-1.5 bg-black/40 p-2.5 rounded-md border border-[#262626]">
                          {msg.steps.map((step) => (
                            <div key={step.id} className="flex items-center gap-2 text-[11px]">
                              {step.status === "completed" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3] shrink-0" />
                              ) : step.status === "in_progress" ? (
                                <Loader2 className="w-3.5 h-3.5 text-[#4edea3] animate-spin shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-[#404040] shrink-0" />
                              )}
                              <span className={step.status === "completed" ? "text-[#e5e5e5]" : "text-[#737373]"}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="leading-relaxed text-[12px]">{msg.content}</p>

                      {msg.dashboardName && (
                        <div className="p-2.5 rounded-md bg-[#4edea3]/5 border border-[#4edea3]/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4 text-[#4edea3]" />
                            <div>
                              <div className="font-bold text-[#f5f5f5] text-xs">{msg.dashboardName}</div>
                              <div className="text-[10px] text-[#a3a3a3]">
                                {msg.widgets?.length || 0} widgets rendered on canvas
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={onOpenSaveModal}
                            className="px-2 py-1 bg-[#4edea3] text-[#003824] rounded label-caps text-[9px] font-bold hover:bg-[#6cf8bb]"
                          >
                            Save Layout
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#262626] border border-[#4edea3]/40 flex items-center justify-center text-[#4edea3] shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 rounded-lg bg-[#1c1c1c] border border-[#4edea3]/30 p-3 text-[#d4d4d4] space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[#4edea3] label-caps">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Assembling Visualizers in Real-Time...</span>
                  </div>
                  <div className="w-full bg-[#262626] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#4edea3] h-full animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {/* TAB CONTENT 2: PROMPT HISTORY */}
        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs custom-scrollbar min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="label-caps text-[#a3a3a3]">
                Submitted Prompts Log
              </span>
              {promptHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[10px] text-[#737373] hover:text-red-400 flex items-center gap-1 transition-colors label-caps"
                >
                  <Trash2 className="w-3 h-3" /> Clear History
                </button>
              )}
            </div>

            <input
              type="text"
              value={searchHistoryQuery}
              onChange={(e) => setSearchHistoryQuery(e.target.value)}
              placeholder="Filter prompt history..."
              className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#262626] rounded-md text-xs outline-none focus:border-[#4edea3]/50 text-[#e5e5e5] placeholder-[#525252]"
            />

            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#525252]">
                No prompts match your history log.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-[#262626] bg-[#171717]/80 hover:bg-[#1c1c1c] hover:border-[#4edea3]/40 transition-all space-y-2 group glass-panel"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#737373]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.timestamp}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 uppercase tracking-widest text-[9px]">
                      {item.status}
                    </span>
                  </div>

                  <p className="text-[#e5e5e5] text-xs leading-relaxed font-sans line-clamp-3">
                    &quot;{item.prompt}&quot;
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#262626]/60">
                    <span className="text-[10px] text-[#a3a3a3]">
                      {item.dashboardName ? item.dashboardName : `${item.widgetsCount || 4} widgets`}
                    </span>
                    <button
                      onClick={() => {
                        setPrompt(item.prompt);
                        setActiveTab("chat");
                        void onGenerate(item.prompt);
                      }}
                      className="px-2 py-1 bg-[#262626] hover:bg-[#4edea3] hover:text-[#003824] text-[#a3a3a3] font-bold rounded text-[10px] transition-all flex items-center gap-1 label-caps"
                    >
                      <Play className="w-2.5 h-2.5" /> Re-run
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CONTENT 3: SAVED WORKSPACES / LAYOUTS */}
        {activeTab === "dashboards" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs custom-scrollbar min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="label-caps text-[#a3a3a3]">
                Saved Custom Layouts
              </span>
              <button
                onClick={onOpenSaveModal}
                className="text-[10px] text-[#4edea3] hover:underline flex items-center gap-1 label-caps"
              >
                <Plus className="w-3 h-3" /> Save Current
              </button>
            </div>

            {dashboards.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#525252]">
                No saved custom dashboard layouts yet.
              </div>
            ) : (
              dashboards.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDashboard(d)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all space-y-2 glass-panel ${
                    currentDashboard?.id === d.id
                      ? "border-[#4edea3]/50 bg-[#4edea3]/10 text-[#f5f5f5]"
                      : "border-[#262626] bg-[#171717]/60 hover:bg-[#1c1c1c] text-[#a3a3a3]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold truncate">
                      <Layout className="w-3.5 h-3.5 text-[#4edea3] shrink-0" />
                      <span className="truncate">{d.dashboard_name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onExportDashboardJson && (
                        <button
                          onClick={(e) => onExportDashboardJson(d, e)}
                          className="text-[#737373] hover:text-[#4edea3] p-1 transition-colors"
                          title="Export Layout JSON"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDuplicateDashboard && (
                        <button
                          onClick={(e) => onDuplicateDashboard(d, e)}
                          className="text-[#737373] hover:text-[#4edea3] p-1 transition-colors"
                          title="Duplicate Layout"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(userRole === "super-admin" || userRole === "admin" || userRole === "manager") && (
                        <button
                          onClick={(e) => onDeleteDashboard(d.id, e)}
                          className="text-[#737373] hover:text-red-400 p-1 transition-colors"
                          title="Delete Dashboard Layout"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#737373]">
                    <span>{d.layout?.length || 0} Widgets</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* INPUT PROMPT BOX (Bottom Fixed Area) */}
        <div className="p-3.5 border-t border-[#262626] bg-[#0d0d0e] space-y-2.5 shrink-0">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative rounded-lg border border-[#333333] bg-[#0a0a0a] focus-within:border-[#e5e5e5] focus-within:shadow-[0_0_8px_rgba(229,229,229,0.25)] transition-all p-2" style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.60)' }}>
              <textarea
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI agent to build a dashboard... (e.g. 'Show R0 gauge and submittals table')"
                className="w-full h-20 bg-transparent border-none outline-none text-xs text-[#e5e5e5] placeholder-[#525252] font-mono resize-none caret-[#e5e5e5]"
              />

              <div className="flex items-center justify-between pt-1.5 mt-1 text-[10px] text-[#737373] font-mono" style={{ borderTop: '1px solid #1a1a1a', boxShadow: '0 -1px 0 rgba(0,0,0,0.40)' }}>
                <span>Press <kbd className="px-1 bg-[#262626] rounded text-[#a3a3a3]">Enter ↵</kbd> to send</span>
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="text-[#525252] hover:text-[#f5f5f5]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full py-2.5 text-[#003824] font-bold label-caps rounded-md tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: loading ? '#333' : 'linear-gradient(to bottom, #6cf8bb, #4edea3)', borderTop: '1px solid rgba(255,255,255,0.30)', boxShadow: loading ? 'none' : '0 4px 16px rgba(78,222,163,0.30)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Canvas...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Synthesize Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      )}
    </div>
  </>
  );
}
