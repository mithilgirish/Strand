"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  ShieldAlert, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Clock, 
  Camera, 
  Maximize2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Flame,
  Layers,
  Filter,
  Check
} from 'lucide-react';
import NcrDetailModal, { NcrRecord } from '@/components/inspector/NcrDetailModal';
import { createClient } from '@/utils/supabase/client';

export default function InspectorAgent() {
  const [ncrs, setNcrs] = useState<NcrRecord[]>([]);
  const [fieldPhotos, setFieldPhotos] = useState<NcrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'ncrs' | 'photos'>('all');
  const [selectedNcr, setSelectedNcr] = useState<NcrRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const getPhotoUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('/static/')) return `${apiBase}${url}`;
    return url;
  };

  const fetchFieldPhotos = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const resp = await fetch(`${apiBase}/api/v1/inspector/checklist-photos`, { headers });
      if (resp.ok) {
        const data: NcrRecord[] = await resp.json();
        setFieldPhotos(data);
      }
    } catch {
      // silently ignore
    }
  }, [apiBase]);

  const fetchNcrs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiBase}/api/v1/inspector/ncrs`, { headers });
      if (!response.ok) {
        throw new Error('Failed to retrieve NCR records');
      }
      const data = await response.json();
      const rows: NcrRecord[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.ncrs)
          ? data.ncrs
          : [];
      setNcrs(rows);
      setSelectedNcr((current) => {
        if (!current) return rows[0] || null;
        const matched = rows.find((r) => r.ncr_id === current.ncr_id);
        return matched || rows[0] || null;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API Server unreachable. Please ensure the backend is running.';
      setError(message);
      setNcrs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNcrs();
      void fetchFieldPhotos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNcrs, fetchFieldPhotos]);

  const handleOpenDetail = (record: NcrRecord) => {
    setSelectedNcr(record);
    setDetailModalOpen(true);
  };

  const filteredNcrs = ncrs.filter(ncr => {
    const matchesSearch = 
      ncr.ncr_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.equipment_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.transcript.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSeverity = severityFilter === 'all' || ncr.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const filteredPhotos = fieldPhotos.filter(item => {
    const matchesSearch = 
      item.equipment_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.step_id && item.step_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.transcript && item.transcript.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const isPass = item.status === 'pass' || item.severity === 'Verified Pass';
    if (severityFilter === 'pass') return isPass;
    if (severityFilter === 'fail') return !isPass;
    if (severityFilter === 'Critical') return item.severity === 'Critical';
    if (severityFilter === 'Major') return item.severity === 'Major';
    return matchesSearch;
  });

  // Calculate statistics
  const totalCount = ncrs.length;
  const criticalCount = ncrs.filter(n => n.severity === 'Critical').length;
  const photoCount = fieldPhotos.length;
  const avgR0 = totalCount > 0 
    ? (ncrs.reduce((acc, curr) => acc + (Number(curr.r0_score) || 0), 0) / totalCount).toFixed(1) 
    : "0.0";

  return (
    <div className="flex flex-col h-full bg-[#111111] text-[#F5F5F5] p-6 space-y-6 overflow-y-auto font-sans custom-scrollbar">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a1d24] flex items-center justify-center border border-[#2b313d] shadow-md text-[#4edea3]">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-[#f5f5f5] label-caps">
              INSPECTOR AGENT
            </h1>
            <p className="text-xs text-[#8c93a0] font-mono">
              QA Companion: Mobile Field Checklists, Visual Evidence & Anomaly Audits
            </p>
          </div>
        </div>

        {/* View Switcher & Sync Button */}
        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-xl bg-[#181a20] border border-[#262a33] font-mono text-xs">
            <button
              onClick={() => setActiveViewTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewTab === 'all'
                  ? 'bg-[#4edea3] text-[#003824] shadow-sm'
                  : 'text-[#8c93a0] hover:text-[#f5f5f5]'
              }`}
            >
              Unified Cockpit
            </button>
            <button
              onClick={() => setActiveViewTab('ncrs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewTab === 'ncrs'
                  ? 'bg-[#4edea3] text-[#003824] shadow-sm'
                  : 'text-[#8c93a0] hover:text-[#f5f5f5]'
              }`}
            >
              NCR Anomalies ({totalCount})
            </button>
            <button
              onClick={() => setActiveViewTab('photos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeViewTab === 'photos'
                  ? 'bg-[#4edea3] text-[#003824] shadow-sm'
                  : 'text-[#8c93a0] hover:text-[#f5f5f5]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Evidence Gallery ({photoCount})</span>
            </button>
          </div>

          <button 
            onClick={() => { void fetchNcrs(); void fetchFieldPhotos(); }} 
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161920] border border-[#2b313d] hover:bg-[#202530] hover:border-[#4edea3]/50 transition-all text-xs font-mono font-semibold text-[#E5E5E5] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4edea3] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* API Connection Warning if offline */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(245,158,11,0.05)] border border-[#F59E0B] text-[#F59E0B] text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-bold">LIVE FEED STATUS:</span> {error} (Displaying local cached checkpoints).
          </div>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-[#8c93a0] font-bold uppercase tracking-wider font-mono">Total NCR Anomalies</p>
          <p className="text-3xl font-black mt-2 text-[#f5f5f5]">{totalCount}</p>
        </div>
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-[#8c93a0] font-bold uppercase tracking-wider font-mono">Critical Defect Alerts</p>
          <p className="text-3xl font-black mt-2 text-[#ffb3ad]">{criticalCount}</p>
        </div>
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-[#8c93a0] font-bold uppercase tracking-wider font-mono">Mobile Photos Captured</p>
          <p className="text-3xl font-black mt-2 text-[#38bdf8] flex items-center gap-2">
            <span>{photoCount}</span>
            <span className="text-xs font-mono text-[#8c93a0] font-normal">Cloud Synced</span>
          </p>
        </div>
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-[#8c93a0] font-bold uppercase tracking-wider font-mono">Avg R0 Risk Contagion</p>
          <p className="text-3xl font-black mt-2 text-[#4edea3]">{avgR0} <span className="text-xs text-[#8c93a0]">/ 10</span></p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#181a20] border border-[#262a33] p-3 rounded-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#8c93a0]" />
          <input
            type="text"
            placeholder="Search by equipment node, step ID, description, or transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-mono text-[#f5f5f5] placeholder-[#8c93a0] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Filter className="w-3.5 h-3.5 text-[#8c93a0]" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#12141a] border border-[#2b313d] text-[#f5f5f5] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="all">All Severities & Statuses</option>
            <option value="Critical">Critical Only</option>
            <option value="Major">Major Only</option>
            <option value="pass">Verified Passed Only</option>
            <option value="fail">Defects / Deviations Only</option>
          </select>
        </div>
      </div>

      {/* VIEW: PHOTOS GALLERY VIEW */}
      {activeViewTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#4edea3]" />
              <span className="font-bold text-sm uppercase tracking-wider text-[#f5f5f5] font-mono">
                Mobile Field Evidence Photos ({filteredPhotos.length})
              </span>
            </div>
            <span className="text-xs text-[#8c93a0] font-mono">
              Click any evidence card to inspect complete problem designation & Spec-DNA
            </span>
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="p-12 text-center bg-[#14171d] border border-[#2b313d] rounded-2xl">
              <Camera className="w-12 h-12 text-[#8c93a0]/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#f5f5f5]">No field photos matching filters</p>
              <p className="text-xs text-[#8c93a0] font-mono mt-1">Capture photos via the mobile companion app or sync records above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map((photo, idx) => {
                const photoUrl = getPhotoUrl(photo.photo_url);
                if (!photoUrl) return null;
                const isPassed = photo.status === 'pass' || photo.severity === 'Verified Pass';

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenDetail(photo)}
                    className="bg-[#16181f] border border-[#2b313d] hover:border-[#4edea3]/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl group flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="relative h-44 w-full bg-black overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt={`${photo.equipment_tag} ${photo.step_id}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10px] font-mono font-bold text-[#f5f5f5]">
                            {photo.equipment_tag}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isPassed
                              ? "bg-[#4edea3]/20 border border-[#4edea3]/50 text-[#4edea3]"
                              : photo.severity === "Critical"
                              ? "bg-red-500/20 border border-red-500/50 text-red-300"
                              : "bg-amber-500/20 border border-amber-500/50 text-amber-300"
                          }`}>
                            {isPassed ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            <span>{isPassed ? "Passed" : (photo.severity || "Defect")}</span>
                          </span>
                        </div>

                        {/* Bottom Step Indicator */}
                        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-[#8c93a0]">
                          <span className="text-[#4edea3] font-bold">{photo.step_id || "General"}</span>
                          <span className="text-[#f5f5f5] group-hover:text-[#4edea3] transition-colors flex items-center gap-1">
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>

                      {/* Problem / Checkpoint Designation Content */}
                      <div className="p-3.5 space-y-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-[#8c93a0] block">
                            {isPassed ? "Verification Outcome" : "Problem Designation"}
                          </span>
                          <p className="text-xs text-[#f5f5f5] line-clamp-2 leading-relaxed">
                            {photo.transcript || photo.description || (isPassed ? "Field specification compliance confirmed." : "Non-conformance detected.")}
                          </p>
                        </div>

                        {photo.mitigation && (
                          <div className="p-2 rounded bg-[#0e1014] border border-[#1f232b] text-[10px] font-mono text-[#8c93a0] line-clamp-1">
                            <span className="text-[#4edea3] font-bold">Action: </span>
                            <span>{photo.mitigation}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-3.5 py-2.5 border-t border-[#1f242d] bg-[#101217] flex items-center justify-between text-[10px] font-mono text-[#8c93a0]">
                      <div className="flex items-center gap-1 truncate">
                        <User className="w-3 h-3" />
                        <span>{photo.raised_by || 'inspector'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(photo);
                        }}
                        className="text-[#4edea3] hover:underline font-bold"
                      >
                        View Details ↗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: MAIN WORKSPACE (UNIFIED / NCR TABLE + DETAIL PANEL) */}
      {activeViewTab !== 'photos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Main Anomaly Table */}
          <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#262626] rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <h3 className="font-bold text-sm tracking-wide uppercase text-[#f5f5f5] font-mono">
                  Live Anomaly & NCR Defect Log
                </h3>
                <span className="text-xs text-[#8c93a0] font-mono">
                  {filteredNcrs.length} Records Shown
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262626] bg-[#161616] text-[10px] text-[#8c93a0] uppercase font-bold tracking-wider font-mono">
                      <th className="p-3">NCR ID</th>
                      <th className="p-3">Node</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">R0 Score</th>
                      <th className="p-3">Photo Evidence</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] font-mono">
                    {filteredNcrs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-[#8c93a0]">
                          No anomaly records match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredNcrs.map((ncr) => {
                        const isSelected = selectedNcr?.ncr_id === ncr.ncr_id;
                        const photoUrl = getPhotoUrl(ncr.photo_url || ncr.photoUri || ncr.image_url);

                        return (
                          <tr
                            key={ncr.ncr_id}
                            onClick={() => setSelectedNcr(ncr)}
                            className={`cursor-pointer transition-colors group ${
                              isSelected 
                                ? "bg-[#252830] border-l-4 border-l-[#4edea3]" 
                                : "hover:bg-[#202020]"
                            }`}
                          >
                            <td className="p-3 text-xs font-bold text-[#f5f5f5]">
                              <span>{ncr.ncr_id}</span>
                            </td>
                            <td className="p-3 text-xs font-semibold text-[#f5f5f5]">{ncr.equipment_tag}</td>
                            <td className="p-3 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                ncr.severity === 'Critical' 
                                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                  : ncr.severity === 'Major'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-white/10 text-[#a3a3a3] border border-white/15'
                              }`}>
                                {ncr.severity}
                              </span>
                            </td>
                            <td className="p-3 text-xs font-bold text-[#4edea3]">{ncr.r0_score} / 10</td>
                            <td className="p-3 text-xs">
                              {photoUrl ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8] text-[10px] font-bold">
                                  <Camera className="w-3 h-3" />
                                  <span>Attached</span>
                                </span>
                              ) : (
                                <span className="text-[#8c93a0] text-[10px]">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetail(ncr);
                                }}
                                className="px-2.5 py-1 rounded bg-[#161920] hover:bg-[#4edea3] hover:text-[#003824] border border-[#2b313d] text-[#8c93a0] group-hover:text-[#f5f5f5] transition-all text-xs font-mono font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Detailed Focus Inspector */}
          <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            {selectedNcr ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Header Title */}
                  <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                    <div>
                      <span className="text-lg font-black text-[#f5f5f5] font-mono block">{selectedNcr.ncr_id}</span>
                      <span className="text-[10px] text-[#8c93a0] font-mono">Target: {selectedNcr.equipment_tag}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      selectedNcr.severity === 'Critical' 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : selectedNcr.severity === 'Major'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : selectedNcr.status === 'pass'
                        ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40'
                        : 'bg-white/10 text-white/70 border border-white/20'
                    }`}>
                      {selectedNcr.status === 'pass' ? 'Verified Pass' : selectedNcr.severity}
                    </span>
                  </div>

                  {/* Node & Step IDs */}
                  <div className="grid grid-cols-2 gap-3 bg-[#0A0A0A] p-3 rounded-lg border border-[#262626] font-mono">
                    <div>
                      <span className="text-[10px] text-[#8c93a0] font-bold uppercase block">Node Tag</span>
                      <span className="text-sm font-bold text-[#f5f5f5]">{selectedNcr.equipment_tag}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8c93a0] font-bold uppercase block">Ref Step</span>
                      <span className="text-sm font-bold text-[#4edea3]">{selectedNcr.step_id || 'General'}</span>
                    </div>
                  </div>

                  {/* Photo Thumbnail Card */}
                  {getPhotoUrl(selectedNcr.photo_url || selectedNcr.photoUri || selectedNcr.image_url) ? (
                    <div 
                      onClick={() => handleOpenDetail(selectedNcr)}
                      className="relative rounded-lg overflow-hidden border border-[#2b313d] hover:border-[#4edea3]/60 bg-black cursor-pointer transition-all group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPhotoUrl(selectedNcr.photo_url || selectedNcr.photoUri || selectedNcr.image_url)!}
                        alt={`Photo on ${selectedNcr.equipment_tag}`}
                        className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end justify-between p-2.5">
                        <span className="text-[11px] font-mono text-[#4edea3] font-bold flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" />
                          Field Photo Evidence Attached
                        </span>
                        <span className="text-[10px] font-mono text-[#8c93a0] group-hover:text-white transition-colors">
                          Enlarge ↗
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => handleOpenDetail(selectedNcr)}
                      className="p-3 bg-[#13161c] hover:bg-[#1a1e27] border border-[#2b313d] hover:border-[#4edea3]/40 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-md bg-[#4edea3]/10 text-[#4edea3]">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#f5f5f5] block">Inspection Field Evidence</span>
                          <span className="text-[10px] text-[#8c93a0] font-mono">Click to view audit modal & metadata</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8c93a0] group-hover:text-[#4edea3] transition-colors" />
                    </div>
                  )}

                  {/* Problem / Condition Designation Box */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8c93a0] font-bold uppercase font-mono block">
                      Problem Designation & Observed Condition
                    </span>
                    <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626] italic text-xs text-[#F5F5F5] leading-relaxed">
                      &ldquo;{selectedNcr.transcript || selectedNcr.description}&rdquo;
                    </div>
                  </div>

                  {/* Calculated Mitigation */}
                  {selectedNcr.mitigation && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#4edea3] font-bold uppercase font-mono block">
                        Calculated Mitigation Action
                      </span>
                      <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626] text-xs text-[#F5F5F5] font-semibold border-l-4 border-[#4edea3]">
                        {selectedNcr.mitigation}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Audit Button */}
                <div className="border-t border-[#262626] pt-4 space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs text-[#8c93a0]">
                    <span>Raised By: <span className="text-[#f5f5f5] font-bold">{selectedNcr.raised_by || 'inspector'}</span></span>
                    <span className="text-[#4edea3] font-bold">{selectedNcr.r0_score} R0</span>
                  </div>

                  <button
                    onClick={() => handleOpenDetail(selectedNcr)}
                    className="w-full py-2.5 bg-[#4edea3] hover:bg-[#3ec48e] text-[#003824] font-bold text-xs font-mono rounded-lg transition-all shadow-[0_0_14px_rgba(78,222,163,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>View Full Mobile Audit & Evidence</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-12 h-full">
                <ShieldAlert className="w-12 h-12 text-[#8c93a0] opacity-30 mb-3" />
                <p className="text-sm text-[#8c93a0]">Select an anomaly or photo record to inspect details and problem designation.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* FULL-DETAIL MODAL */}
      <NcrDetailModal
        isOpen={detailModalOpen}
        ncr={selectedNcr}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
}
