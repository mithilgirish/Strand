"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Code, 
  Building, 
  Calendar, 
  ShieldAlert, 
  FileSignature 
} from "lucide-react";

interface RfiMarkdownViewerProps {
  content: string;
  submittalId?: string;
  violationId?: string;
  className?: string;
}

export default function RfiMarkdownViewer({
  content,
  submittalId,
  violationId,
  className = "",
}: RfiMarkdownViewerProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "markdown">("formatted");

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `RFI-${submittalId || violationId || "draft"}.md`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to render inline markdown styles: **bold**, `code`, *italic*
  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-[#f5f5f5]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[11px] text-[#4edea3]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic text-[#d1d5db]">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Render markdown lines into formatted executive engineering blocks
  const renderFormattedMarkdown = (raw: string) => {
    if (!raw || !raw.trim()) {
      return (
        <div className="py-12 text-center text-[#8c93a0] font-mono text-xs">
          No RFI text content available to render.
        </div>
      );
    }

    const lines = raw.split("\n");

    return (
      <div className="space-y-3 font-sans text-sm text-[#e5e5e5] leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Empty line
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Header 1 (# Title)
          if (trimmed.startsWith("# ")) {
            return (
              <h1
                key={idx}
                className="text-lg font-black tracking-tight text-[#f5f5f5] pb-2 border-b border-[#2b313d] flex items-center gap-2 pt-2"
              >
                <FileSignature className="w-5 h-5 text-primary" />
                <span>{trimmed.slice(2)}</span>
              </h1>
            );
          }

          // Header 2 (## Subheader)
          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={idx}
                className="text-sm font-bold uppercase tracking-wider text-[#4edea3] pt-3 pb-1 border-b border-white/10 font-mono"
              >
                {trimmed.slice(3)}
              </h2>
            );
          }

          // Header 3 (### Subheader)
          if (trimmed.startsWith("### ")) {
            return (
              <h3
                key={idx}
                className="text-xs font-bold uppercase tracking-wider text-[#38bdf8] pt-2 font-mono"
              >
                {trimmed.slice(4)}
              </h3>
            );
          }

          // Blockquote (> text)
          if (trimmed.startsWith("> ")) {
            return (
              <div
                key={idx}
                className="p-3 rounded-lg bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 text-xs font-mono my-2 space-y-1"
              >
                {renderInlineStyles(trimmed.slice(2))}
              </div>
            );
          }

          // Bullet List (- item or * item)
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-2 text-xs text-[#e5e5e5]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] mt-1.5 shrink-0" />
                <div className="flex-1 leading-normal">
                  {renderInlineStyles(trimmed.slice(2))}
                </div>
              </div>
            );
          }

          // Numbered List (1. item)
          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s(.*)$/);
            const num = match ? match[1] : "•";
            const rest = match ? match[2] : trimmed;
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-2 text-xs text-[#e5e5e5]">
                <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono font-bold text-[10px] text-[#4edea3] shrink-0">
                  {num}
                </span>
                <div className="flex-1 leading-normal">
                  {renderInlineStyles(rest)}
                </div>
              </div>
            );
          }

          // Key-Value Metadata / Bold labels (e.g. **Subject:** ... or TO: ...)
          if (
            trimmed.startsWith("**TO:") ||
            trimmed.startsWith("**FROM:") ||
            trimmed.startsWith("**DATE:") ||
            trimmed.startsWith("**PROJECT:") ||
            trimmed.startsWith("**RFI NUMBER:") ||
            trimmed.startsWith("**SPECIFICATION:")
          ) {
            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[#0e1014] border border-[#222733] font-mono text-xs text-[#d1d5db]"
              >
                {renderInlineStyles(trimmed)}
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-xs text-[#d1d5db] leading-relaxed">
              {renderInlineStyles(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col rounded-xl border border-[#2b313d] bg-[#14171d] overflow-hidden ${className}`}>
      
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1014] border-b border-[#222733] font-mono text-xs">
        <div className="flex items-center gap-2 text-[11px] text-[#8c93a0]">
          <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
          <span className="font-bold text-[#f5f5f5] uppercase tracking-wider">
            Formal RFI Document
          </span>
        </div>

        {/* View Mode & Utility Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex p-0.5 rounded-lg bg-[#181a20] border border-[#262a33] text-[10px]">
            <button
              onClick={() => setViewMode("formatted")}
              className={`flex items-center gap-1 px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === "formatted"
                  ? "bg-[#e5e5e5] text-[#111111]"
                  : "text-[#8c93a0] hover:text-[#f5f5f5]"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Formatted</span>
            </button>

            <button
              onClick={() => setViewMode("markdown")}
              className={`flex items-center gap-1 px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === "markdown"
                  ? "bg-[#e5e5e5] text-[#111111]"
                  : "text-[#8c93a0] hover:text-[#f5f5f5]"
              }`}
            >
              <Code className="w-3 h-3" />
              <span>Raw Markdown</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-[#181a20] hover:bg-[#202530] border border-[#2b313d] text-[#8c93a0] hover:text-[#f5f5f5] transition-all cursor-pointer"
            title="Copy RFI Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#4edea3]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-[#181a20] hover:bg-[#202530] border border-[#2b313d] text-[#8c93a0] hover:text-[#f5f5f5] transition-all cursor-pointer"
            title="Download Markdown (.md)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Canvas */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[500px] custom-scrollbar bg-[#12141a]">
        {viewMode === "formatted" ? (
          <div className="p-4 rounded-xl bg-[#0a0b0e] border border-[#1f242d] shadow-inner">
            {renderFormattedMarkdown(content)}
          </div>
        ) : (
          <pre className="p-4 rounded-xl bg-[#0a0b0e] border border-[#1f242d] text-xs font-mono text-[#a3e635] whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner">
            {content || "No RFI markdown draft available."}
          </pre>
        )}
      </div>

    </div>
  );
}
