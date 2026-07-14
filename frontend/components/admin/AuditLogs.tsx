"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";

interface AuditLog {
  id: string;
  created_at: string;
  tenant_id: string;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
}

const ACTION_COLORS: Record<string, string> = {
  QUERY_SANITIZED: 'text-[#ffb3ad] bg-[#ffb3ad]/10 border-[#ffb3ad]/20',
  USER_INVITED:    'text-[#4edea3] bg-[#4edea3]/10 border-[#4edea3]/20',
  TENANT_CREATED:  'text-[#4edea3] bg-[#4edea3]/10 border-[#4edea3]/20',
  ROLE_CHANGED:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  AUTH_SUCCESS:    'text-[#a3a3a3] bg-[#a3a3a3]/10 border-[#a3a3a3]/20',
  DASHBOARD_SAVED: 'text-[#a3a3a3] bg-[#a3a3a3]/10 border-[#a3a3a3]/20',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }) + ' UTC';
}

export default function AuditLogs({ tenantId, isSuper }: { tenantId: string, isSuper: boolean }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const supabase = createClient();

      // Super-admin sees all logs, admin sees own tenant
      let query = supabase
        .from('audit_logs')
        .select('id, created_at, tenant_id, actor_email, action, resource_type, resource_id, metadata')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isSuper) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) {
        setErrorMsg(error.message);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    fetchLogs();

    // Real-time subscription for live audit log updates
    const supabase = createClient();
    const channel = supabase
      .channel('audit_logs_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        setLogs(prev => [payload.new as AuditLog, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, isSuper]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-sm text-[#a3a3a3] mt-1">
            {isSuper ? 'Global immutable event log across all tenants.' : 'Immutable record of system events for your tenant.'}
          </p>
        </div>
        <span className="font-mono text-[9px] px-2 py-1 bg-[#171717] border border-[#404040] rounded text-[#4edea3] uppercase tracking-widest">
          ● Live
        </span>
      </div>

      <div className="space-y-2 font-mono text-[12px]">
        {loading ? (
          <div className="text-center text-[#a3a3a3] py-12">Decrypting audit trail...</div>
        ) : errorMsg ? (
          <div className="text-center text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg py-6 px-4">
            ERROR: {errorMsg}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-[#a3a3a3] py-12 border border-dashed border-[#404040] rounded-lg">
            No audit events recorded yet.
          </div>
        ) : (
          logs.map((log) => {
            const colorClass = ACTION_COLORS[log.action] || 'text-[#a3a3a3] bg-[#a3a3a3]/10 border-[#a3a3a3]/20';
            return (
              <div key={log.id} className="flex flex-col sm:flex-row gap-3 p-4 border border-[#333333] rounded-lg bg-[#171717]/50 hover:bg-[#1c1c1c] transition-colors">
                <div className="text-[#525252] min-w-[130px] shrink-0">{formatTime(log.created_at)}</div>
                <div className={`shrink-0 px-2 py-0.5 rounded border text-[9px] uppercase tracking-widest font-bold h-fit ${colorClass}`}>
                  {log.action}
                </div>
                <div className="flex-1 text-[#e5e5e5]">
                  {log.actor_email && <span className="text-[#a3a3a3]">{log.actor_email} → </span>}
                  {log.resource_type && <span className="text-[#a3a3a3]">[{log.resource_type}] </span>}
                  {log.resource_id && <span className="text-[#4edea3]">{log.resource_id}</span>}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <span className="text-[#525252] ml-2">{JSON.stringify(log.metadata)}</span>
                  )}
                </div>
                {isSuper && (
                  <div className="text-[9px] text-[#525252] shrink-0 uppercase">{log.tenant_id}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
