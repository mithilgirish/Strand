"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import UserDirectory from "@/components/admin/UserDirectory";
import AuditLogs from "@/components/admin/AuditLogs";
import TenantProvisioning from "@/components/admin/TenantProvisioning";
import SystemTelemetry from "@/components/admin/SystemTelemetry";
import SupplierSwitches from "@/components/admin/SupplierSwitches";
import { useRouter } from "next/navigation";

interface AdminUser {
  role: string;
  tenant_id: string;
}

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState("switches");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      // getUser() validates the JWT server-side — more secure than getSession()
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (!authUser || error) {
        setLoading(false);
        router.push("/login");
        return;
      }
      
      const role = authUser.app_metadata?.role || "viewer";
      const tenantId = authUser.app_metadata?.tenant_id || "unknown";
      
      if (role !== "admin" && role !== "super-admin") {
        setLoading(false);
        router.push("/unauthorized");
        return;
      }

      setUser({ ...authUser, role, tenant_id: tenantId });
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-[#a3a3a3] text-sm tracking-widest uppercase">
        <div className="animate-pulse">Authenticating Command Console...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSuper = user?.role === "super-admin";

  return (
    <div className="flex flex-col h-full bg-[#111111] text-[#f5f5f5] animate-in fade-in">
      <header className="mb-8 pb-6 relative">
        <div className="absolute -bottom-px left-0 w-full h-px bg-gradient-to-r from-[#333333] via-[#a3a3a3]/30 to-transparent" />
        <h1 className="text-4xl font-bold tracking-tight text-[#e5e5e5]">STRAND Command Console</h1>
        <div className="flex items-center gap-4 mt-3">
          <span className="font-mono text-[10px] px-2 py-1 bg-[#171717] rounded text-[#a3a3a3] uppercase border border-[#404040] shadow-inner">
            Security Level: <span className={user.role === 'super-admin' ? 'text-[#4edea3]' : 'text-[#e5e5e5]'}>{user.role}</span>
          </span>
          <span className="font-mono text-[10px] px-2 py-1 bg-[#171717] rounded text-[#a3a3a3] uppercase border border-[#404040] shadow-inner">
            Tenant ID: <span className="text-[#e5e5e5]">{user.tenant_id}</span>
          </span>
        </div>
      </header>

      {/* Glassmorphic Tab Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#171717] rounded-lg mb-8 border border-[#333333] w-fit font-mono">
        <button
          onClick={() => setActiveTab("switches")}
          className={`px-4 py-2.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 ${activeTab === "switches" ? "bg-[#4edea3] text-[#003824] shadow-sm" : "text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626]"}`}
        >
          <span>HITL Supplier Switches</span>
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === "users" ? "bg-[#e5e5e5] text-[#171717] shadow-sm" : "text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626]"}`}
        >
          User Directory
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === "logs" ? "bg-[#e5e5e5] text-[#171717] shadow-sm" : "text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626]"}`}
        >
          Audit Logs
        </button>
        
        {isSuper && (
          <>
            <div className="w-px bg-[#333333] mx-1 my-1" />
            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${activeTab === "tenants" ? "bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/30" : "text-[#4edea3]/70 hover:text-[#4edea3] hover:bg-[#4edea3]/10 border border-transparent"}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Tenant Provisioning
            </button>
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`px-4 py-2.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${activeTab === "telemetry" ? "bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/30" : "text-[#4edea3]/70 hover:text-[#4edea3] hover:bg-[#4edea3]/10 border border-transparent"}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              System Telemetry
            </button>
          </>
        )}
      </div>

      {/* Dynamic Pane Rendering */}
      <main className="flex-1 bg-[#111111] rounded-xl p-2 overflow-y-auto">
        {activeTab === "switches" && <SupplierSwitches tenantId={user.tenant_id} isSuper={isSuper} />}
        {activeTab === "users" && <UserDirectory tenantId={user.tenant_id} isSuper={isSuper} />}
        {activeTab === "logs" && <AuditLogs tenantId={user.tenant_id} isSuper={isSuper} />}
        {activeTab === "tenants" && isSuper && <TenantProvisioning />}
        {activeTab === "telemetry" && isSuper && <SystemTelemetry />}
      </main>
    </div>
  );
}
