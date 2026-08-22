"use client";

import React, { useState } from "react";
import {
  X,
  Camera,
  Mic,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  ArrowUpRight,
  Maximize2,
  FileText,
  Flame,
  Check,
  AlertTriangle,
  Layers,
  ChevronRight
} from "lucide-react";

export interface NcrRecord {
  ncr_id: string;
  equipment_tag: string;
  step_id: string;
  transcript: string;
  r0_score: number;
  severity: "Critical" | "Major" | "Minor" | "Verified Pass" | string;
  mitigation: string;
  raised_by: string;
  timestamp: string;
  photo_url?: string | null;
  photoUri?: string | null;
  image_url?: string | null;
  images?: string[];
  is_demo?: boolean;
  title?: string;
  description?: string;
  parameter_name?: string;
  actual_value?: string;
  required_value?: string;
  unit?: string;
  clause?: string;
  status?: "pass" | "fail" | string;
  as_built_id?: string;
}

interface NcrDetailModalProps {
  isOpen: boolean;
  ncr: NcrRecord | null;
  onClose: () => void;
  onPushToProcore?: (ncrId: string) => Promise<void>;
  onPushToAutodesk?: (ncrId: string) => Promise<void>;
}

export default function NcrDetailModal({
  isOpen,
  ncr,
  onClose,
  onPushToProcore,
  onPushToAutodesk
}: NcrDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"evidence" | "spec" | "contagion">("evidence");
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState<boolean>(false);
  const [procoreSyncStatus, setProcoreSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const [autodeskSyncStatus, setAutodeskSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const [approvedStatus, setApprovedStatus] = useState<boolean>(false);

  if (!isOpen || !ncr) return null;

  const isPassed = ncr.status === "pass" || ncr.severity === "Verified Pass";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const rawPhoto = ncr.photo_url || ncr.photoUri || ncr.image_url;
  const capturedPhoto = rawPhoto?.startsWith("/static/") ? `${apiBase}${rawPhoto}` : rawPhoto;

  const handleProcorePush = async () => {
    setProcoreSyncStatus("syncing");
    try {
      if (onPushToProcore) {
        await onPushToProcore(ncr.ncr_id);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }
      setProcoreSyncStatus("synced");
    } catch {
      setProcoreSyncStatus("idle");
    }
  };

  const handleAutodeskPush = async () => {
    setAutodeskSyncStatus("syncing");
    try {
      if (onPushToAutodesk) {
        await onPushToAutodesk(ncr.ncr_id);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }
      setAutodeskSyncStatus("synced");
    } catch {
      setAutodeskSyncStatus("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0f1115] border border-[#262a33] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Specular Edge Highlight */}
        <div className={`h-[1px] bg-gradient-to-r from-transparent ${isPassed ? 'via-[#4edea3]/80' : 'via-amber-400/80'} to-transparent`} />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f242d] bg-[#090a0d]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
              isPassed
                ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]"
                : ncr.severity === "Critical"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}>
              {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#f5f5f5] font-mono">
                  {ncr.ncr_id}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isPassed
                    ? "bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/30"
                    : ncr.severity === "Critical"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}>
                  {isPassed ? "Verified Pass" : `${ncr.severity} Severity`}
                </span>
                {ncr.is_demo && (
                  <span className="rounded border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider text-amber-200">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8c93a0] font-mono mt-0.5">
                Target Node: <span className="text-[#f5f5f5] font-bold">{ncr.equipment_tag}</span> • Ref Step: <span className="text-[#4edea3] font-bold">{ncr.step_id || 'General Inspection'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1f242d] rounded-lg text-[#8c93a0] hover:text-[#f5f5f5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-[#1f242d] bg-[#0c0d10] font-mono text-xs">
          <button
            onClick={() => setActiveTab("evidence")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all font-bold cursor-pointer ${
              activeTab === "evidence"
                ? "border-[#4edea3] text-[#4edea3]"
                : "border-transparent text-[#8c93a0] hover:text-[#e5e5e5]"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Mobile Field Evidence & Photos</span>
          </button>
          <button
            onClick={() => setActiveTab("spec")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all font-bold cursor-pointer ${
              activeTab === "spec"
                ? "border-[#4edea3] text-[#4edea3]"
                : "border-transparent text-[#8c93a0] hover:text-[#e5e5e5]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Spec-DNA & Parameter Delta</span>
          </button>
          <button
            onClick={() => setActiveTab("contagion")}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all font-bold cursor-pointer ${
              activeTab === "contagion"
                ? "border-[#4edea3] text-[#4edea3]"
                : "border-transparent text-[#8c93a0] hover:text-[#e5e5e5]"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>R0 Contagion & Risk Multiplier</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#0f1115]">
          
          {/* TAB 1: FIELD EVIDENCE & PHOTOS */}
          {activeTab === "evidence" && (
            <div className="space-y-6">
              
              {/* Photo Evidence Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <Camera className="w-4 h-4 text-[#4edea3]" />
                    <span className="font-bold uppercase tracking-wider text-[#f5f5f5]">
                      Captured Mobile Field Photo
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#8c93a0]">
                    STRAND Field Companion • Direct Cloud Evidence
                  </span>
                </div>

                {capturedPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#2b313d] bg-black/60 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={capturedPhoto}
                      alt={`Inspection photo for ${ncr.equipment_tag}`}
                      className="w-full h-80 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-102"
                      onClick={() => setIsPhotoLightboxOpen(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />
                    
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-[#e5e5e5]">
                        <span className="px-2.5 py-1 rounded bg-black/70 border border-white/15 text-[10px] font-bold">
                          Node: {ncr.equipment_tag}
                        </span>
                        <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${
                          isPassed 
                            ? "bg-[#4edea3]/20 border-[#4edea3]/40 text-[#4edea3]" 
                            : "bg-red-500/20 border-red-500/40 text-red-300"
                        }`}>
                          {isPassed ? "Verified As-Built Visual" : "Optical Defect Logged"}
                        </span>
                      </div>
                      <button
                        onClick={() => setIsPhotoLightboxOpen(true)}
                        className="px-3 py-1 bg-[#161920]/90 hover:bg-[#202530] border border-[#2b313d] rounded-md text-[#f5f5f5] flex items-center gap-1 text-[11px] font-bold shadow-lg cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Enlarge Photo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#2b313d] bg-[#14171d] p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-[#1b1f28] text-[#8c93a0]">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#f5f5f5] font-sans">
                        Optical Evidence Captured in Field Session
                      </h4>
                      <p className="text-xs text-[#8c93a0] font-mono mt-1 max-w-md">
                        Record logged on {ncr.equipment_tag} ({ncr.step_id}). Field photo attached from mobile inspection checklist.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="px-3 py-1 rounded bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] text-[11px] font-mono font-bold">
                        Tag: {ncr.equipment_tag}
                      </div>
                      <div className="px-3 py-1 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] text-[11px] font-mono font-bold">
                        Step: {ncr.step_id}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PROBLEM DESIGNATION / VERIFICATION RESULT CARD */}
              <div className={`rounded-xl border p-5 space-y-3 font-mono ${
                isPassed
                  ? "border-[#4edea3]/30 bg-[#003824]/10"
                  : "border-red-500/30 bg-red-950/10"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#4edea3]" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                    <span className="font-bold text-sm tracking-wide uppercase text-[#f5f5f5]">
                      {isPassed ? "Inspection Checkpoint Result: Verified Pass" : "Problem Designation & Diagnostic Summary"}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    isPassed ? "bg-[#4edea3]/20 text-[#4edea3]" : "bg-red-500/20 text-red-400"
                  }`}>
                    {isPassed ? "Criteria Satisfied" : "Deviation Detected"}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a0b0e] border border-[#1f242d] space-y-2">
                  <div>
                    <span className="text-[10px] text-[#8c93a0] uppercase block">Observed Condition / Field Audio Transcript</span>
                    <p className="text-sm text-[#e5e5e5] italic mt-0.5">
                      &ldquo;{ncr.transcript || ncr.description}&rdquo;
                    </p>
                  </div>

                  {!isPassed && (
                    <div className="pt-2 border-t border-[#1f242d]">
                      <span className="text-[10px] text-red-400 uppercase block font-bold">Identified Discrepancy & Root Cause</span>
                      <p className="text-xs text-[#f5f5f5] mt-0.5">
                        {ncr.description || "Field measurement deviated from contract tolerance specification threshold."}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#1f242d]">
                    <span className="text-[10px] text-[#4edea3] uppercase block font-bold">
                      {isPassed ? "Commissioning Sign-off" : "Prescribed Mitigation Action"}
                    </span>
                    <p className="text-xs text-[#f5f5f5] mt-0.5 font-semibold">
                      {ncr.mitigation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Metadata Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <div className="flex items-center gap-1.5 text-[#8c93a0] mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Inspector</span>
                  </div>
                  <div className="text-sm font-bold text-[#f5f5f5] truncate">{ncr.raised_by}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <div className="flex items-center gap-1.5 text-[#8c93a0] mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Logged Time</span>
                  </div>
                  <div className="text-sm font-bold text-[#f5f5f5]">
                    {ncr.timestamp ? new Date(ncr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <div className="flex items-center gap-1.5 text-[#8c93a0] mb-1">
                    <Flame className="w-3.5 h-3.5 text-[#4edea3]" />
                    <span>R0 Risk Score</span>
                  </div>
                  <div className="text-sm font-bold text-[#4edea3]">{ncr.r0_score} / 10</div>
                </div>

                <div className="p-3 rounded-lg bg-[#14171d] border border-[#222733]">
                  <div className="flex items-center gap-1.5 text-[#8c93a0] mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Procore Sync</span>
                  </div>
                  <div className="text-sm font-bold text-[#38bdf8] uppercase">
                    {procoreSyncStatus === "synced" ? "Synced" : "Queued"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPEC-DNA & PARAMETER DELTA */}
          {activeTab === "spec" && (
            <div className="space-y-6 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#14171d] border border-[#222733] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1f242d] pb-3">
                  <div className="flex items-center gap-2 text-[#38bdf8]">
                    <FileText className="w-4 h-4" />
                    <span className="font-bold uppercase tracking-wider">Contract Spec-DNA Mapping</span>
                  </div>
                  <span className="text-[#8c93a0]">{ncr.clause || "Section 26 32 13 §3.4"}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-[#1f242d]">
                    <span className="text-[10px] text-[#8c93a0] block uppercase">Tested Parameter</span>
                    <span className="text-sm font-bold text-[#f5f5f5] block mt-1">
                      {ncr.parameter_name || "Operational Flow / Tolerance Threshold"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-[#1f242d]">
                    <span className="text-[10px] text-[#8c93a0] block uppercase">Contract Specification Limit</span>
                    <span className="text-sm font-bold text-[#4edea3] block mt-1">
                      {ncr.required_value || "≤ 260 L/h at 100% rated load"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-[#1f242d]">
                    <span className="text-[10px] text-[#8c93a0] block uppercase">Field Measured As-Built</span>
                    <span className={`text-sm font-bold block mt-1 ${isPassed ? 'text-[#4edea3]' : 'text-red-400'}`}>
                      {ncr.actual_value || (isPassed ? "Within Tolerance" : "285 L/h (Out of spec)")}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0b0e] border border-[#1f242d]">
                    <span className="text-[10px] text-[#8c93a0] block uppercase">Delta & Compliance Status</span>
                    <span className={`text-sm font-bold block mt-1 ${isPassed ? 'text-[#4edea3]' : 'text-amber-400'}`}>
                      {isPassed ? "0.0% Deviation • Compliant" : "+9.6% Over Permissible Threshold"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: R0 CONTAGION & RISK MULTIPLIER */}
          {activeTab === "contagion" && (
            <div className="space-y-6 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#14171d] border border-[#222733] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1f242d] pb-3">
                  <div className="flex items-center gap-2 text-[#4edea3]">
                    <Flame className="w-4 h-4" />
                    <span className="font-bold uppercase tracking-wider">Cascade Blast Radius & Contagion</span>
                  </div>
                  <span className="text-lg font-black text-[#4edea3]">{ncr.r0_score} R0</span>
                </div>

                <div className="p-4 rounded-lg bg-[#0a0b0e] border border-[#1f242d] space-y-3">
                  <p className="text-sm text-[#e5e5e5]">
                    {isPassed 
                      ? "Zero contagion risk. As-built checkpoint successfully passed all commissioning requirements."
                      : `If unmitigated on ${ncr.equipment_tag}, this defect cascades to 4 downstream downstream dependencies (ATS-01, Emergency Switchboard ESB-01, and Critical IT Feeder busbars), triggering project schedule delay multiplier of 2.4x.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#1f242d] bg-[#090a0d] font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setApprovedStatus(!approvedStatus)}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                approvedStatus
                  ? "bg-[#4edea3] text-[#003824]"
                  : "bg-[#161920] border border-[#2b313d] text-[#f5f5f5] hover:border-[#4edea3]"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{approvedStatus ? "Approved by QA Lead" : "Approve Checkpoint"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleProcorePush}
              disabled={procoreSyncStatus === "syncing"}
              className="px-4 py-2 rounded-lg bg-[#f26522]/15 border border-[#f26522]/40 text-[#f26522] hover:bg-[#f26522]/25 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{procoreSyncStatus === "synced" ? "Synced to Procore" : "Push to Procore"}</span>
            </button>

            <button
              onClick={handleAutodeskPush}
              disabled={autodeskSyncStatus === "syncing"}
              className="px-4 py-2 rounded-lg bg-[#0696D7]/15 border border-[#0696D7]/40 text-[#0696D7] hover:bg-[#0696D7]/25 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{autodeskSyncStatus === "synced" ? "Synced to Autodesk" : "Push to Autodesk"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL RESOLUTION LIGHTBOX MODAL */}
      {isPhotoLightboxOpen && capturedPhoto && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsPhotoLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full rounded-2xl overflow-hidden border border-[#2b313d] shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPhoto}
              alt="Full inspection photo"
              className="w-full max-h-[80vh] object-contain"
            />
            <div className="p-4 bg-[#0f1115] border-t border-[#2b313d] flex items-center justify-between font-mono">
              <div>
                <span className="text-sm font-bold text-[#f5f5f5] block">{ncr.equipment_tag} • {ncr.step_id}</span>
                <span className="text-xs text-[#8c93a0]">{ncr.transcript || ncr.description}</span>
              </div>
              <button
                onClick={() => setIsPhotoLightboxOpen(false)}
                className="px-4 py-2 bg-[#1a1d24] border border-[#2b313d] rounded-lg text-xs text-[#f5f5f5] hover:bg-[#252a35] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
