"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from "@/utils/supabase/client";

interface Tenant {
  id: string;
  name: string;
  plan: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  enterprise: 'text-[#4edea3] bg-[#4edea3]/10 border-[#4edea3]/20',
  standard:   'text-[#e5e5e5] bg-[#e5e5e5]/10 border-[#e5e5e5]/20',
  trial:      'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export default function TenantProvisioning() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [plan, setPlan] = useState('standard');
  const [maxUsers, setMaxUsers] = useState(50);

  const fetchTenants = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setTenants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('loading');
    setSubmitError(null);

    try {
      const resp = await fetch('/api/admin/tenants', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, name: tenantName, plan, max_users: maxUsers }),
      });

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail || resp.statusText);
      }

      setSubmitStatus('success');
      setTenantId('');
      setTenantName('');
      fetchTenants(); // Refresh list
      setTimeout(() => setSubmitStatus('idle'), 2000);
    } catch (err: any) {
      setSubmitError(err.message);
      setSubmitStatus('error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">Tenant Provisioning</h2>
        <p className="text-sm text-[#a3a3a3] mt-1">Super-Admin access only. Provision isolated namespaces.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Form */}
        <div className="p-6 border border-[#404040] rounded-lg bg-[#171717]/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/30 to-transparent" />
          <h3 className="font-semibold text-lg mb-5 text-[#e5e5e5]">Initialize New Namespace</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2">Organization Name</label>
              <input
                type="text"
                required
                value={tenantName}
                onChange={e => setTenantName(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/40 border border-[#404040] rounded-lg text-[#f5f5f5] text-sm focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/50 outline-none transition-all placeholder-[#525252]"
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2">Namespace ID</label>
              <input
                type="text"
                required
                value={tenantId}
                onChange={e => setTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                className="w-full px-4 py-2.5 bg-black/40 border border-[#404040] rounded-lg text-[#f5f5f5] text-sm focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/50 outline-none font-mono transition-all placeholder-[#525252]"
                placeholder="acme_corp_01"
                pattern="[a-z0-9_]{3,50}"
                title="3-50 chars: lowercase letters, numbers, underscores"
              />
              <p className="text-[9px] text-[#525252] mt-1 font-mono">Lowercase letters, numbers, underscores only.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2">Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-[#404040] rounded-lg text-[#f5f5f5] text-sm focus:border-[#4edea3]/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="trial">Trial</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2">Max Users</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxUsers}
                  onChange={e => setMaxUsers(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-black/40 border border-[#404040] rounded-lg text-[#f5f5f5] text-sm focus:border-[#4edea3]/50 outline-none transition-all"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-red-400 text-[10px] font-mono uppercase bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitStatus === 'loading' || submitStatus === 'success'}
              className="w-full py-3 bg-[#4edea3] hover:bg-[#6cf8bb] text-[#003824] font-bold rounded-lg uppercase tracking-widest text-[10px] transition-all shadow-[0_0_10px_rgba(78,222,163,0.1)] hover:shadow-[0_0_20px_rgba(78,222,163,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitStatus === 'loading' ? 'Initializing...' : submitStatus === 'success' ? '✓ Namespace Created' : 'Initialize Namespace'}
            </button>
          </form>
        </div>

        {/* Tenant List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-[#e5e5e5] mb-4">Active Namespaces ({tenants.length})</h3>
          {loading ? (
            <div className="text-center text-[#a3a3a3] py-8 font-mono text-sm">Loading namespaces...</div>
          ) : errorMsg ? (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-4 font-mono">{errorMsg}</div>
          ) : tenants.length === 0 ? (
            <div className="text-[#525252] text-sm text-center py-8 border border-dashed border-[#404040] rounded-lg">No tenants provisioned yet.</div>
          ) : (
            tenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 border border-[#404040] rounded-lg bg-[#171717]/50 hover:bg-[#1c1c1c] transition-colors">
                <div>
                  <div className="font-semibold text-[#e5e5e5] text-sm">{t.name}</div>
                  <div className="text-[10px] font-mono text-[#525252] mt-0.5">{t.id} · {t.max_users} users max</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border text-[9px] uppercase tracking-widest font-bold ${PLAN_COLORS[t.plan] || PLAN_COLORS.standard}`}>
                    {t.plan}
                  </span>
                  <span className={`text-[9px] font-mono ${t.is_active ? 'text-[#4edea3]' : 'text-[#525252]'}`}>
                    {t.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
