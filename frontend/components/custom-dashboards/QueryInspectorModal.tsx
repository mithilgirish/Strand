"use client";

import React, { useState } from "react";
import { 
  Code, 
  Play, 
  Check, 
  AlertTriangle, 
  X, 
  Copy, 
  Database, 
  Clock, 
  Table as TableIcon,
  FileJson,
  RotateCw
} from "lucide-react";
import { Widget, WidgetData } from "./types";

interface QueryInspectorModalProps {
  isOpen: boolean;
  widget: Widget | null;
  currentQuery: string;
  onClose: () => void;
  onSaveQuery: (widgetId: string, query: string) => void;
}

export default function QueryInspectorModal({
  isOpen,
  widget,
  currentQuery,
  onClose,
  onSaveQuery
}: QueryInspectorModalProps) {
  const [queryText, setQueryText] = useState<string>(currentQuery || "");
  const [testResult, setTestResult] = useState<WidgetData | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"json" | "table">("table");

  // Keep query text in sync when widget changes
  React.useEffect(() => {
    setQueryText(currentQuery || "");
    setTestResult(null);
    setLatencyMs(null);
  }, [currentQuery, widget?.id]);

  if (!isOpen || !widget) return null;

  const handleTestQuery = async () => {
    setIsRunning(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/dashboards/execute-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText })
      });
      const data = await res.json();
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      if (res.ok && data.success) {
        setTestResult(data.data || []);
      } else {
        setTestResult({ error: data.error || data.detail || "Query execution failed." });
      }
    } catch (err: unknown) {
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      setTestResult({ error: err instanceof Error ? err.message : "Network error executing query." });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(queryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveQuery(widget.id, queryText);
    onClose();
  };

  const isError = testResult && "error" in testResult;
  const rows = Array.isArray(testResult) ? testResult : [];

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#111317] border border-[#262a33] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Specular Highlight Strip */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22262f] bg-[#0c0d10]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#f5f5f5] font-sans">
                  Query Inspector & Cypher Editor
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30">
                  {widget.type}
                </span>
              </div>
              <p className="text-xs text-[#8c93a0] font-mono mt-0.5">
                Widget: <span className="text-[#e1e4ea] font-bold">{widget.title || widget.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 bg-[#1a1d24] hover:bg-[#262a33] border border-[#303540] rounded-md text-xs font-mono text-[#c5cbd6] flex items-center gap-1.5 transition-all"
              title="Copy Query"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#4edea3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#262a33] rounded-md text-[#8c93a0] hover:text-[#f5f5f5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 bg-[#111317]">
          
          {/* Query Editor Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#8c93a0]">
              <span className="flex items-center gap-1.5 text-[#4edea3] font-bold">
                <Code className="w-4 h-4" />
                Live Cypher Knowledge Graph Query
              </span>
              <span className="text-[11px] text-[#606775]">Read-only sandbox / Tenant Isolated</span>
            </div>
            
            <div className="relative rounded-lg border border-[#2a2f3a] bg-[#08090b] overflow-hidden focus-within:border-[#4edea3] focus-within:ring-1 focus-within:ring-[#4edea3]/50 transition-all">
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="MATCH (s:Submittal) RETURN s.code as Code, s.delay_days as Delay..."
                rows={4}
                className="w-full bg-transparent p-4 font-mono text-xs text-[#e1e4ea] focus:outline-none resize-none leading-relaxed placeholder:text-[#454b57]"
                spellCheck={false}
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#1c2028] bg-[#0c0d10] text-[11px] font-mono">
                <span className="text-[#606775]">Supports Neo4j Cypher aggregation and graph traversal</span>
                <button
                  onClick={handleTestQuery}
                  disabled={isRunning || !queryText.trim()}
                  className="px-3 py-1 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? "Executing..." : "Test Run Query"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Results Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#f5f5f5] font-bold">Execution Output</span>
                {latencyMs !== null && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a1d24] border border-[#2a2f3a] text-[10px] text-[#4edea3]">
                    <Clock className="w-3 h-3" />
                    {latencyMs} ms
                  </span>
                )}
              </div>

              {testResult && !isError && rows.length > 0 && (
                <div className="flex items-center gap-1 bg-[#08090b] border border-[#262a33] rounded p-0.5">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all ${
                      viewMode === "table" ? "bg-[#262a33] text-[#4edea3] font-bold" : "text-[#8c93a0]"
                    }`}
                  >
                    <TableIcon className="w-3 h-3" /> Table
                  </button>
                  <button
                    onClick={() => setViewMode("json")}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all ${
                      viewMode === "json" ? "bg-[#262a33] text-[#4edea3] font-bold" : "text-[#8c93a0]"
                    }`}
                  >
                    <FileJson className="w-3 h-3" /> JSON
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#262a33] bg-[#08090b] min-h-[160px] max-h-[260px] overflow-auto custom-scrollbar p-3 font-mono text-xs">
              {isRunning ? (
                <div className="flex flex-col items-center justify-center h-36 text-[#8c93a0] space-y-2">
                  <RotateCw className="w-6 h-6 text-[#4edea3] animate-spin" />
                  <span>Traversing Neo4j Graph DB...</span>
                </div>
              ) : isError ? (
                <div className="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Execution Error</span>
                    <span className="text-[11px] text-red-300">{(testResult as { error: string }).error}</span>
                  </div>
                </div>
              ) : testResult === null ? (
                <div className="flex flex-col items-center justify-center h-36 text-[#505766] space-y-1">
                  <Play className="w-5 h-5 opacity-40" />
                  <span>Click "Test Run Query" to preview returned graph payload.</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-[#505766]">
                  <span>Query returned 0 records.</span>
                </div>
              ) : viewMode === "json" ? (
                <pre className="text-[11px] text-[#4edea3] whitespace-pre-wrap">
                  {JSON.stringify(rows, null, 2)}
                </pre>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[#20242c] text-[#8c93a0]">
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col} className="pb-2 pr-4 font-bold uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#15181e]">
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="py-1.5 pr-4 text-[#d8dce6] truncate max-w-[200px]">
                            {typeof val === "object" ? JSON.stringify(val) : String(val ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#22262f] bg-[#0c0d10]">
          <span className="text-xs text-[#8c93a0] font-mono">
            {rows.length > 0 ? `Validated ${rows.length} rows` : "Ready to update"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1d24] hover:bg-[#262a33] border border-[#303540] rounded-md text-xs font-mono text-[#c5cbd6] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold rounded-md text-xs font-mono flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(78,222,163,0.30)] cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Widget</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
