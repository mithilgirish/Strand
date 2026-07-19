"use client";

import React, { useState, useEffect } from "react";
import { Save, X, FileCode, Check } from "lucide-react";
import { SavedDashboard } from "./types";

interface SaveDashboardModalProps {
  isOpen: boolean;
  currentDashboard: SavedDashboard | null;
  onClose: () => void;
  onSave: (dashboardName: string, description?: string, saveAsNew?: boolean) => Promise<void>;
  onExportJson: () => void;
}

export default function SaveDashboardModal({
  isOpen,
  currentDashboard,
  onClose,
  onSave,
  onExportJson
}: SaveDashboardModalProps) {
  const [dashboardName, setDashboardName] = useState("");
  const [description, setDescription] = useState("");
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentDashboard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDashboardName(currentDashboard.dashboard_name || "Custom Dashboard");
      setDescription(currentDashboard.prompt_used ? `Prompt: ${currentDashboard.prompt_used}` : "");
    }
  }, [currentDashboard, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardName.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(dashboardName, description, saveAsNew);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      {/* Industrial Glass Modal */}
      <div className="w-full max-w-md bg-[#111111]/95 border border-[#333333] rounded-xl shadow-2xl overflow-hidden glass-panel font-sans text-xs text-[#f5f5f5]">
        
        {/* Specular Header */}
        <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#171717]/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 className="label-caps text-[#f5f5f5] tracking-widest">
                Save Custom Dashboard Layout
              </h3>
              <p className="text-[10px] font-mono text-[#a3a3a3]">
                Industrial Glass Workspace Configurator
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-mono">
          {savedSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center text-[#4edea3]">
              <div className="w-12 h-12 rounded-full bg-[#4edea3]/20 border border-[#4edea3] flex items-center justify-center">
                <Check className="w-6 h-6 animate-bounce" />
              </div>
              <span className="label-caps text-sm">Dashboard Layout Saved!</span>
            </div>
          ) : (
            <>
              {/* Dashboard Name */}
              <div className="space-y-1">
                <label className="label-caps text-[#a3a3a3] text-[10px]">Dashboard Name</label>
                <input
                  type="text"
                  required
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="e.g. Data Center Thermal & R0 Risk"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333333] rounded-md text-xs text-[#f5f5f5] outline-none focus:border-[#4edea3]/60 placeholder-[#525252]"
                />
              </div>

              {/* Description / Notes */}
              <div className="space-y-1">
                <label className="label-caps text-[#a3a3a3] text-[10px]">Description & Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or context..."
                  className="w-full h-20 px-3 py-2 bg-[#0a0a0a] border border-[#333333] rounded-md text-xs text-[#f5f5f5] outline-none focus:border-[#4edea3]/60 placeholder-[#525252] resize-none"
                />
              </div>

              {/* Layout options */}
              <div className="p-3 bg-[#171717]/60 rounded-md border border-[#262626] space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-[#a3a3a3]">
                  <span>Active Widgets Count:</span>
                  <span className="font-bold text-[#4edea3]">{currentDashboard?.layout?.length || 0} Widgets</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-[#262626] text-[#e5e5e5]">
                  <input
                    type="checkbox"
                    checked={saveAsNew}
                    onChange={(e) => setSaveAsNew(e.target.checked)}
                    className="accent-[#4edea3] rounded"
                  />
                  <span>Save as a new layout copy</span>
                </label>
              </div>

              {/* Quick JSON Export Button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onExportJson}
                  className="text-[10px] text-[#a3a3a3] hover:text-[#4edea3] flex items-center gap-1 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5" /> Export Layout JSON
                </button>
              </div>

              {/* Submit & Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 hover:bg-[#262626] rounded-md text-[#a3a3a3] label-caps text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !dashboardName.trim()}
                  className="px-4 py-2 bg-[#4edea3] hover:bg-[#6cf8bb] text-[#003824] font-bold rounded-md label-caps text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Workspace"}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
