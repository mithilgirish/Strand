"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tenant_id: string;
  is_active: boolean;
}

interface Tenant {
  id: string;
  name: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function UserDirectory({ tenantId, isSuper }: { tenantId: string, isSuper: boolean }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state — controlled inputs so we capture values on submit
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteTenant, setInviteTenant] = useState(tenantId);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, tenant_id, is_active')
        .order('role', { ascending: true });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    const fetchTenants = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('is_active', true)
        .order('id');
      setTenants(data || []);
    };

    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };

    void fetchUsers();
    void fetchCurrentUser();
    if (isSuper) void fetchTenants();
  }, [isSuper]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const resp = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_role: newRole }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail || resp.statusText);
      }
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: unknown) {
      alert(errorMessage(err));
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('loading');
    setSubmitError(null);
    try {
      const resp = await fetch('/api/admin/invite', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          tenant_id: isSuper ? inviteTenant : tenantId,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail || resp.statusText);
      }
      setSubmitStatus('success');
      setInviteEmail('');
      setTimeout(() => { setIsModalOpen(false); setSubmitStatus('idle'); }, 1500);
    } catch (err: unknown) {
      setSubmitError(errorMessage(err));
      setSubmitStatus('error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Directory</h2>
          <p className="text-sm text-[#a3a3a3] mt-1">
            {isSuper ? "Global view of all operatives across all tenants." : "Manage operatives and security clearances for your tenant."}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#e5e5e5] text-[#171717] rounded-md font-semibold text-xs tracking-wider uppercase hover:bg-white transition-colors"
        >
          + Provision User
        </button>
      </div>

      <div className="border border-[#404040] rounded-lg overflow-hidden bg-[#171717]/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1c1c1c] border-b border-[#404040]">
            <tr>
              <th className="px-4 py-3 font-medium text-[#a3a3a3] uppercase tracking-wider text-[10px]">Operative</th>
              <th className="px-4 py-3 font-medium text-[#a3a3a3] uppercase tracking-wider text-[10px]">Clearance Level</th>
              <th className="px-4 py-3 font-medium text-[#a3a3a3] uppercase tracking-wider text-[10px]">Tenant ID</th>
              <th className="px-4 py-3 font-medium text-[#a3a3a3] uppercase tracking-wider text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#404040]/50 font-mono text-[13px]">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#a3a3a3]">
                  Decrypting user registry...
                </td>
              </tr>
            ) : errorMsg ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-red-400 bg-red-400/10">
                  ERROR: {errorMsg}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#a3a3a3]">
                  No operatives found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[#262626]/50 transition-colors">
                  <td className="px-4 py-4 text-[#f5f5f5]">
                    {u.full_name ? (
                      <div className="flex flex-col">
                        <span>{u.full_name}</span>
                        <span className="text-[10px] text-[#a3a3a3]">{u.email}</span>
                      </div>
                    ) : (
                      u.email
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {u.id === currentUserId ? (
                      <span className="px-2.5 py-1 rounded border text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {u.role} (You)
                      </span>
                    ) : (u.role === 'super-admin' && !isSuper) ? (
                      <span className="px-2.5 py-1 rounded border text-[10px] font-bold uppercase bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/20">
                        {u.role}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                        className="bg-[#171717] border border-[#404040] rounded-md text-[#f5f5f5] font-mono text-[11px] px-2 py-1 focus:outline-none focus:border-[#4edea3] cursor-pointer"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="engineer">Engineer</option>
                        <option value="qa-inspector">QA Inspector</option>
                        <option value="subcontractor">Subcontractor</option>
                        <option value="manager">Manager</option>
                        <option value="client-owner">Client Owner</option>
                        {isSuper && <option value="admin">Admin</option>}
                        {isSuper && <option value="super-admin">Super Admin</option>}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[#a3a3a3]">{u.tenant_id}</td>
                  <td className="px-4 py-4">
                    <span className={u.is_active !== false ? 'text-[#4edea3]' : 'text-[#525252]'}>
                      {u.is_active !== false ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Provision User Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-[#111111] border border-[#333333] rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/50 to-transparent" />

            <h3 className="text-xl font-bold text-[#e5e5e5] mb-1 tracking-tight">Provision New Operative</h3>
            <p className="text-[10px] text-[#a3a3a3] uppercase tracking-widest font-mono mb-6">Assign credentials and clearance</p>

            <form className="space-y-5" onSubmit={handleInviteSubmit}>
              <div>
                <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#404040] rounded text-[#f5f5f5] font-mono text-[13px] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 placeholder-[#525252] transition-all"
                  placeholder="operative@strand.ai"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5">Clearance Level (Role)</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#404040] rounded text-[#f5f5f5] font-mono text-[13px] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="viewer">Viewer (Read-Only)</option>
                  <option value="engineer">Engineer (Task Scope)</option>
                  <option value="qa-inspector">QA Inspector (Project Scope)</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="manager">Manager (Project Scope)</option>
                  <option value="client-owner">Client Owner (Tenant Scope)</option>
                  {isSuper && <option value="admin">Admin (Tenant Admin)</option>}
                </select>
              </div>

              {isSuper && (
                <div>
                  <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5">Target Tenant</label>
                  <div className="relative">
                    <select
                      required
                      value={inviteTenant}
                      onChange={e => setInviteTenant(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#171717] border border-[#404040] rounded text-[#f5f5f5] font-mono text-[13px] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a namespace...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[9px] text-[#a3a3a3] mt-1 font-mono uppercase">Super-Admins can assign operatives to any active namespace.</p>
                </div>
              )}

              {submitError && (
                <p className="text-[10px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{submitError}</p>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#262626]">
                {submitStatus === 'success' && (
                  <span className="text-[10px] font-mono text-[#4edea3] uppercase tracking-widest self-center">✓ Invite sent!</span>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[10px] font-bold text-[#a3a3a3] hover:text-[#e5e5e5] uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitStatus === 'loading' || submitStatus === 'success'}
                  className="px-4 py-2 bg-[#4edea3] text-[#003824] rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-[#6cf8bb] transition-all shadow-[0_0_10px_rgba(78,222,163,0.1)] hover:shadow-[0_0_15px_rgba(78,222,163,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitStatus === 'loading' ? 'Initiating...' : 'Initiate Handshake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
