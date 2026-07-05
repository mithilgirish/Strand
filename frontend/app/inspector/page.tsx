"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Search, ShieldAlert, RefreshCw, AlertTriangle, ArrowRight, User, Clock } from 'lucide-react';

interface NcrRecord {
  ncr_id: string;
  equipment_tag: string;
  step_id: string;
  transcript: string;
  r0_score: number;
  severity: 'Critical' | 'Major' | 'Minor';
  mitigation: string;
  raised_by: string;
  timestamp: string;
}

export default function InspectorAgent() {
  const [ncrs, setNcrs] = useState<NcrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedNcr, setSelectedNcr] = useState<NcrRecord | null>(null);

  const fetchNcrs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/v1/inspector/ncrs`);
      if (!response.ok) {
        throw new Error('Failed to retrieve NCR records');
      }
      const data = await response.json();
      setNcrs(data);
      setSelectedNcr((current) => current || data[0] || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API Server unreachable. Please ensure the backend is running.';
      setError(message);
      // Fallback seeds for visual presentation if server is offline
      const seedData: NcrRecord[] = [
        {
          ncr_id: "NCR-2841",
          equipment_tag: "GEN-01",
          step_id: "IST-002",
          transcript: "Fuel consumption reads 285 litres per hour against spec 260",
          r0_score: 4.2,
          severity: "Critical",
          mitigation: "Verify governor settings or replace fuel injector unit.",
          raised_by: "field_engineer",
          timestamp: "2026-07-02T02:00:00Z"
        },
        {
          ncr_id: "NCR-1942",
          equipment_tag: "CT-01",
          step_id: "IST-005",
          transcript: "Ambient operating temperature is 45°C which is below the TIA-942 spec of 50°C",
          r0_score: 3.1,
          severity: "Major",
          mitigation: "Escalate to engineering lead for temperature tolerance override.",
          raised_by: "field_engineer",
          timestamp: "2026-07-02T02:15:00Z"
        }
      ];
      setNcrs(seedData);
      setSelectedNcr((current) => current || seedData[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNcrs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNcrs]);

  const filteredNcrs = ncrs.filter(ncr => {
    const matchesSearch = 
      ncr.ncr_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.equipment_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.transcript.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSeverity = severityFilter === 'all' || ncr.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  // Calculate statistics
  const totalCount = ncrs.length;
  const criticalCount = ncrs.filter(n => n.severity === 'Critical').length;
  const majorCount = ncrs.filter(n => n.severity === 'Major').length;
  const avgR0 = totalCount > 0 
    ? (ncrs.reduce((acc, curr) => acc + curr.r0_score, 0) / totalCount).toFixed(1) 
    : "0.0";

  return (
    <div className="flex flex-col h-full bg-[#111111] text-[#F5F5F5] p-6 space-y-6 overflow-y-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center border border-[#262626] shadow-md">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-on-surface label-caps">
              INSPECTOR AGENT
            </h1>
            <p className="text-xs text-on-surface-variant mono-data">
              Companion Node Status: Connected to QA Mobile Client
            </p>
          </div>
        </div>
        <button 
          onClick={fetchNcrs} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[#404040] hover:bg-[rgba(255,255,255,0.08)] transition-all text-sm font-semibold text-[#E5E5E5]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Records
        </button>
      </div>

      {/* API Connection Warning if offline */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(245,158,11,0.05)] border border-[#F59E0B] text-[#F59E0B] text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-bold">Database Node Offline:</span> {error} (Displaying offline-cached simulation database).
          </div>
        </div>
      )}

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Total NCRs Logged</p>
          <p className="text-3xl font-black mt-2 text-on-surface">{totalCount}</p>
        </div>
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Critical Alerts</p>
          <p className="text-3xl font-black mt-2 text-[#ffb3ad]">{criticalCount}</p>
        </div>
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Major Anomalies</p>
          <p className="text-3xl font-black mt-2 text-[#F59E0B]">{majorCount}</p>
        </div>
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-4 shadow-lg">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Avg R0 Contagion Impact</p>
          <p className="text-3xl font-black mt-2 text-primary">{avgR0} <span className="text-xs text-on-surface-variant">/ 10</span></p>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        {/* Left Side: Table & Filters */}
        <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#262626] rounded-xl p-5 shadow-lg flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <h3 className="text-base font-black label-caps">Audit Records Queue</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search tag, ID, or transcription..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg pl-9 pr-4 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#404040]"
                />
              </div>
              {/* Filter */}
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#404040]"
              >
                <option value="all">All Severity</option>
                <option value="Critical">Critical</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-[#262626] rounded-lg bg-[#0A0A0A] flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[rgba(255,255,255,0.01)]">
                  <th className="p-3 text-xs uppercase text-on-surface-variant font-bold">NCR ID</th>
                  <th className="p-3 text-xs uppercase text-on-surface-variant font-bold">Equipment Node</th>
                  <th className="p-3 text-xs uppercase text-on-surface-variant font-bold">Severity</th>
                  <th className="p-3 text-xs uppercase text-on-surface-variant font-bold">R0 Impact</th>
                  <th className="p-3 text-xs uppercase text-on-surface-variant font-bold">Date</th>
                  <th className="p-3 text-xs uppercase text-on-surface-variant font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredNcrs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-on-surface-variant">
                      No active anomalies matched filter options.
                    </td>
                  </tr>
                ) : (
                  filteredNcrs.map(ncr => (
                    <tr 
                      key={ncr.ncr_id}
                      onClick={() => setSelectedNcr(ncr)}
                      className={`cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors ${selectedNcr?.ncr_id === ncr.ncr_id ? 'bg-[rgba(255,255,255,0.03)]' : ''}`}
                    >
                      <td className="p-3 font-bold text-sm text-on-surface mono-data">{ncr.ncr_id}</td>
                      <td className="p-3 text-sm font-semibold text-on-surface">{ncr.equipment_tag}</td>
                      <td className="p-3 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          ncr.severity === 'Critical' 
                            ? 'bg-[rgba(255,179,173,0.1)] text-[#ffb3ad] border border-[rgba(255,179,173,0.2)]'
                            : ncr.severity === 'Major'
                              ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]'
                              : 'bg-[rgba(163,163,163,0.1)] text-[#A3A3A3] border border-[rgba(163,163,163,0.2)]'
                        }`}>
                          {ncr.severity}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-bold text-primary mono-data">{ncr.r0_score} / 10</td>
                      <td className="p-3 text-xs text-on-surface-variant font-semibold">
                        {new Date(ncr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-right">
                        <ArrowRight className="w-4 h-4 text-on-surface-variant hover:text-[#E5E5E5] inline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Detailed Focus Inspector */}
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          {selectedNcr ? (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                  <span className="text-lg font-black text-on-surface mono-data">{selectedNcr.ncr_id}</span>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedNcr.severity === 'Critical' 
                      ? 'bg-[rgba(255,179,173,0.1)] text-[#ffb3ad] border border-[#ffb3ad]'
                      : selectedNcr.severity === 'Major'
                        ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[#F59E0B]'
                        : 'bg-[rgba(163,163,163,0.1)] text-[#A3A3A3] border border-[#A3A3A3]'
                  }`}>
                    {selectedNcr.severity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#0A0A0A] p-3 rounded-lg border border-[#262626]">
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Node Tag</span>
                    <span className="text-sm font-bold text-on-surface">{selectedNcr.equipment_tag}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Ref Step</span>
                    <span className="text-sm font-bold text-on-surface">{selectedNcr.step_id}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Observation (Whisper Audio Transcript)</span>
                  <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626] italic text-sm text-[#F5F5F5]">
                    &quot;{selectedNcr.transcript}&quot;
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Calculated Mitigation Action</span>
                  <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#262626] text-sm text-[#F5F5F5] font-semibold border-l-4 border-primary">
                    {selectedNcr.mitigation}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#262626] pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-on-surface-variant font-semibold">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Raised By: <span className="text-on-surface font-bold">{selectedNcr.raised_by}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(selectedNcr.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-[rgba(229,229,229,0.03)] border border-[#262626] rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase block">System Risk Index</span>
                      <span className="text-xs text-on-surface font-semibold mt-0.5 block">Project R0 multiplier impact</span>
                    </div>
                    <span className="text-xl font-black text-primary">{selectedNcr.r0_score}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 h-full">
              <ShieldAlert className="w-12 h-12 text-on-surface-variant opacity-30 mb-3" />
              <p className="text-sm text-on-surface-variant">Select an anomaly record to inspect details, causal triggers, and automatic mitigations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
