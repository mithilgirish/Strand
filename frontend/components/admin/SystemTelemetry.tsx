"use client";

import React, { useEffect, useState } from 'react';

interface TelemetryMetrics {
  total_users: number;
  active_tenants: number;
  audit_log_entries: number;
  pending_invitations: number;
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-5 border border-[#404040] rounded-lg bg-[#171717]/50 relative overflow-hidden group hover:border-[#4edea3]/30 transition-all">
      <div className="absolute top-0 left-0 w-0 h-[1px] bg-[#4edea3] group-hover:w-full transition-all duration-500" />
      <div className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-mono font-bold text-[#f5f5f5]">{value.toLocaleString()}</div>
      {sub && <div className="text-xs mt-2 font-mono text-[#525252]">{sub}</div>}
    </div>
  );
}

export default function SystemTelemetry() {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      // Call our FastAPI backend which uses the service_role key
      const resp = await fetch('/api/admin/telemetry', { credentials: 'include' });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      setMetrics(data.metrics);
      setLastRefreshed(new Date());
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">System Telemetry</h2>
          <p className="text-sm text-[#a3a3a3] mt-1">Live metrics of platform usage across all tenants.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-[#525252] uppercase">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-3 py-1.5 border border-[#404040] rounded text-[9px] font-bold text-[#a3a3a3] hover:text-[#e5e5e5] hover:border-[#4edea3]/50 transition-all uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? '...' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="text-center text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg py-6 px-4 font-mono text-sm">
          ERROR: {errorMsg}
          <div className="text-[10px] mt-2 text-[#a3a3a3]">Ensure SUPABASE_SERVICE_ROLE_KEY is set on the backend server.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Total Users" value={loading ? '...' : (metrics?.total_users ?? 0)} sub="Across all tenants" />
          <MetricCard label="Active Tenants" value={loading ? '...' : (metrics?.active_tenants ?? 0)} sub="Provisioned namespaces" />
          <MetricCard label="Audit Events" value={loading ? '...' : (metrics?.audit_log_entries ?? 0)} sub="Immutable event log" />
          <MetricCard label="Pending Invites" value={loading ? '...' : (metrics?.pending_invitations ?? 0)} sub="Awaiting acceptance" />
        </div>
      )}

      <div className="h-48 border border-[#333333] rounded-lg bg-black/30 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #4edea3 0px, #4edea3 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #4edea3 0px, #4edea3 1px, transparent 1px, transparent 80px)' }}
        />
        <span className="text-[#525252] text-xs font-mono uppercase tracking-widest">
          Time-series chart — integrate Recharts in follow-up
        </span>
      </div>
    </div>
  );
}
