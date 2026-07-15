"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Plug, CheckCircle2, XCircle, Settings, RefreshCw, Key, 
  Lock, Save, Loader2, AlertCircle, Database, ShieldAlert, Download 
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected";
  category: string;
  lastSync: string;
  configured?: boolean;
}

function IntegrationsHubContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "autodesk",
      name: "Autodesk Construction Cloud (ACC)",
      description: "Sync 3D models and CAD sheets directly into STRAND for Vision AI review.",
      status: "disconnected",
      category: "Design & BIM",
      lastSync: "Never",
      configured: false
    },
    {
      id: "procore",
      name: "Procore",
      description: "Push STRAND AI-generated RFIs and Field NCRs automatically to Procore.",
      status: "disconnected",
      category: "Project Management",
      lastSync: "Never",
      configured: true
    },
    {
      id: "primavera",
      name: "Oracle Primavera P6",
      description: "Live scheduling feed for the R0 Contagion Risk Engine.",
      status: "disconnected",
      category: "Project Controls",
      lastSync: "Never",
      configured: true
    },
    {
      id: "maximo",
      name: "IBM Maximo",
      description: "L5 Commissioning data handover for facility maintenance scheduling.",
      status: "disconnected",
      category: "Operations & Handover",
      lastSync: "Never",
      configured: true
    },
  ]);

  const [configuringIntegration, setConfiguringIntegration] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    client_id: "", client_secret: "", base_url: "", username: "", password: "", api_key: ""
  });
  const [configs, setConfigs] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeReportModal, setActiveReportModal] = useState<{
    fileName: string;
    parameter: string;
    extractedValue: string;
    requiredSpec: string;
    status: string;
    action: string;
    targetRoute: string;
  } | null>(null);

  const [userRole, setUserRole] = useState<string>("viewer");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [tenants, setTenants] = useState<{id: string, name: string}[]>([]);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const getRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role);
          setSelectedTenant(profile.tenant_id);
          if (profile.role === "super_admin" || profile.role === "super-admin") {
            const { data } = await supabase.from('tenants').select('id, name').eq('is_active', true).order('name');
            if (data) setTenants(data);
          }
        }
      }
    };
    getRole();
  }, []);

  const fetchStatus = async (showRefreshIndicator = false) => {
    if (!selectedTenant) return;
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch(`/api/integrations/status?tenant_id=${selectedTenant}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (e) {
      console.error("Error fetching integrations status:", e);
    } finally {
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  const fetchConfigs = async () => {
    if (!selectedTenant) return;
    try {
      const res = await fetch(`/api/integrations/config?tenant_id=${selectedTenant}`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (e) {
      console.error("Error fetching configs:", e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const status = searchParams.get('status');
      const integration = searchParams.get('integration');
      
      if (window.opener && status && integration) {
        window.opener.postMessage({ type: 'OAUTH_COMPLETE', status, integration }, '*');
        window.close();
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_COMPLETE') {
          setRefreshing(true);
          // Force a fresh fetch bypassing any browser cache
          fetch(`/api/integrations/status?tenant_id=${selectedTenant}&_t=${Date.now()}`)
            .then(res => res.json())
            .then(data => setIntegrations(data))
            .finally(() => setRefreshing(false));
            
          if (event.data.status === 'success') {
            setSaveMessage(`Successfully authenticated ${event.data.integration}!`);
            setTimeout(() => setSaveMessage(""), 3000);
          } else {
            setErrorMessage(`Authentication failed.`);
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      fetchStatus();
      fetchConfigs();
    }
    // Check if we returned from OAuth flow
    const statusParam = searchParams.get("status");
    const integrationParam = searchParams.get("integration");
    const msgParam = searchParams.get("message");
    
    if (statusParam === "success" && integrationParam === "autodesk") {
      setSaveMessage("Autodesk successfully connected via OAuth!");
      setTimeout(() => setSaveMessage(""), 5000);
      router.replace("/integrations");
    } else if (statusParam === "error") {
      setErrorMessage(msgParam ? msgParam.replace(/_/g, " ") : "Failed to connect integration.");
      setTimeout(() => setErrorMessage(""), 6000);
      router.replace("/integrations");
    }
  }, [searchParams, selectedTenant]);

  const handleSaveConfig = async (e: React.FormEvent, integrationId: string) => {
    e.preventDefault();
    setLoading(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      const res = await fetch(`/api/integrations/${integrationId}/config?tenant_id=${selectedTenant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm)
      });

      if (res.ok) {
        setSaveMessage("Credentials configured successfully! You can now Connect.");
        if (integrationId !== "autodesk" && integrationId !== "procore") {
            setConfiguringIntegration(null);
        }
        fetchStatus();
        fetchConfigs();
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.detail || "Failed to update configuration.");
      }
    } catch (err) {
      setErrorMessage("Error updating credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect2Legged = async (e: React.FormEvent, integrationId: string) => {
    e.preventDefault();
    setLoading(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      const configRes = await fetch(`/api/integrations/${integrationId}/config?tenant_id=${selectedTenant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm)
      });

      if (!configRes.ok) {
        setErrorMessage("Failed to save credentials first.");
        setLoading(false);
        return;
      }

      const connectRes = await fetch(`/api/integrations/${integrationId}/connect-2legged?tenant_id=${selectedTenant}`, {
        method: "POST"
      });

      if (connectRes.ok) {
        setSaveMessage(`Successfully connected ${integrationId} via 2-Legged OAuth!`);
        setConfiguringIntegration(null);
        fetchStatus();
      } else {
        const errorData = await connectRes.json();
        setErrorMessage(errorData.detail || "Failed to authenticate 2-legged OAuth.");
      }
    } catch (err) {
      setErrorMessage("Error establishing 2-legged connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect3Legged = async (e: React.FormEvent, integrationId: string) => {
    e.preventDefault();
    setLoading(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      const configRes = await fetch(`/api/integrations/${integrationId}/config?tenant_id=${selectedTenant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm)
      });

      if (!configRes.ok) {
        setErrorMessage("Failed to save credentials first.");
        setLoading(false);
        return;
      }

      const authRes = await fetch(`/api/integrations/${integrationId}/authorize?tenant_id=${selectedTenant}`, { method: "POST" });
      if (authRes.ok) {
        const data = await authRes.json();
        if (data.url) {
            // Open in popup instead of redirecting main page
            const popup = window.open(data.url, 'OAuthLogin', 'width=600,height=700,left=200,top=100');
            if (!popup) {
               // Fallback if popups are blocked
               window.location.href = data.url;
            }
        } else {
            setErrorMessage("Authorization URL missing from response.");
            setLoading(false);
        }
      } else {
        const errData = await authRes.json();
        setErrorMessage(errData.detail || "Failed to initiate OAuth.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage("Error establishing 3-legged connection.");
      setLoading(false);
    }
  };

  const handleFetchData = async (integrationId: string) => {
    setIsFetchingData(integrationId);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/sync?tenant_id=${selectedTenant}`, { method: "POST" });
      if (res.ok) {
        setSaveMessage(`Successfully synced latest data from ${integrationId === 'autodesk' ? 'Autodesk' : integrationId}!`);
        setTimeout(() => setSaveMessage(""), 4000);
      } else {
        setErrorMessage(`Failed to fetch data from ${integrationId}. Ensure you are connected.`);
      }
    } catch (err) {
      console.error("Failed to sync:", err);
      setErrorMessage("Network error while trying to sync data.");
    } finally {
      setIsFetchingData(null);
    }
  };

  const toggleConnection = async (integration: Integration) => {
    const id = integration.id;
    const isConnected = integration.status === "connected";

    if (isConnected) {
      setDisconnectingId(id);
      try {
        const res = await fetch(`/api/integrations/${id}/disconnect?tenant_id=${selectedTenant}`, { method: "POST" });
        if (res.ok) {
          setIntegrations(prev =>
            prev.map(i => i.id === id ? { ...i, status: "disconnected", lastSync: "Never" } : i)
          );
          setSaveMessage(`Successfully disconnected ${integration.name}.`);
          setTimeout(() => setSaveMessage(""), 3000);
        } else {
          setErrorMessage(`Failed to disconnect ${integration.name}.`);
        }
      } catch (err) {
        console.error("Failed to disconnect:", err);
        setErrorMessage("An error occurred during disconnect.");
      } finally {
        setDisconnectingId(null);
      }
    } else {
      // If we have fallback .env vars for Procore and Autodesk, skip forcing the config modal
      if (!integration.configured && id !== "procore" && id !== "autodesk") {
        setConfiguringIntegration(id);
        setConfigForm({
          client_id: configs[id]?.client_id || "",
          client_secret: "",
          base_url: configs[id]?.base_url || "",
          username: configs[id]?.username || "",
          password: "",
          api_key: ""
        });
        return;
      }
      
      if (id === "autodesk" || id === "procore") {
        fetch(`/api/integrations/${id}/authorize?tenant_id=${selectedTenant}`, { method: "POST" })
          .then(async res => {
            const data = await res.json();
            if (res.ok && data.url) {
              const popup = window.open(data.url, 'OAuthLogin', 'width=600,height=700,left=200,top=100');
              if (!popup) {
                 window.location.href = data.url;
              }
            } else {
              setErrorMessage(data.detail || "Failed to initialize authorization flow.");
            }
          })
          .catch(err => {
            console.error(err);
            setErrorMessage("Network error initializing connection.");
          });
      } else {
        try {
          const res = await fetch(`/api/integrations/${id}/connect?tenant_id=${selectedTenant}`, { method: "POST" });
          if (res.ok) {
            setIntegrations(prev =>
              prev.map(i => i.id === id ? { ...i, status: "connected", lastSync: "Just now" } : i)
            );
          } else {
              const data = await res.json();
              setErrorMessage(data.detail || "Connection failed.");
          }
        } catch (err) {
          console.error("Failed to connect:", err);
        }
      }
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 animate-in fade-in duration-500">
      
      {/* Page Title Header */}
      <div className="mb-6 select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-on-surface flex items-center gap-3 font-sans tracking-wide uppercase">
            <Plug className="w-7 h-7 text-primary" />
            Integrations Hub
          </h2>
          <p className="text-on-surface-variant mt-1.5 text-sm font-sans tracking-normal">
            Connect STRAND's AI core to your existing construction technology stack.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {(userRole === "super_admin" || userRole === "super-admin") && tenants.length > 0 && (
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-sm rounded-md px-3 py-2 outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchStatus(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 border border-outline/20 rounded-md text-xs text-on-surface-variant font-bold uppercase tracking-wider font-sans transition-all active:scale-95 self-start md:self-center"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? "Refreshing..." : "Sync Status"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveMessage && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-emerald-500/15 border border-emerald-500/25 rounded-lg text-emerald-400 text-sm animate-in slide-in-from-top duration-300 shadow-md">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-sans font-medium">{saveMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/15 border border-red-500/25 rounded-none text-red-400 text-sm animate-in slide-in-from-top duration-300 shadow-md">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-sans font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Configuration View Form */}
      {configuringIntegration && (
        <div className="glass-panel rounded-lg p-6 mb-8 relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={() => setConfiguringIntegration(null)}
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4 border-b border-outline-variant pb-3">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="label-caps text-on-surface-variant">Configure {integrations.find(i => i.id === configuringIntegration)?.name}</h3>
          </div>
          
          {configuringIntegration === "autodesk" && (
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Enter your Autodesk developer credentials. You can retrieve these from the{" "}
              <a href="https://developer.autodesk.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-400 transition-colors">
                Autodesk Developer Portal
              </a>.
            </p>
          )}
          {configuringIntegration === "procore" && (
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Enter your Procore developer credentials. Ensure your redirect URI matches our webhook. More info in the{" "}
              <a href="https://developers.procore.com/documentation/introduction" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-400 transition-colors">
                Procore Documentation
              </a>.
            </p>
          )}
          {configuringIntegration === "primavera" && (
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Enter your Oracle Primavera P6 EPPM REST API connection details. You can find endpoints in the{" "}
              <a href="https://docs.oracle.com/en/industries/construction-engineering/primavera-p6-eppm/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-400 transition-colors">
                Oracle Help Center
              </a>.
            </p>
          )}
          {configuringIntegration === "maximo" && (
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Enter your IBM Maximo REST API/OSLC connection details and your generated API Key.
            </p>
          )}
          
          <form onSubmit={(e) => handleSaveConfig(e, configuringIntegration)} className="space-y-4 max-w-xl">
            {(configuringIntegration === "autodesk" || configuringIntegration === "procore") && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Client ID</label>
                  <input
                    type="text"
                    value={configForm.client_id}
                    onChange={(e) => setConfigForm({...configForm, client_id: e.target.value})}
                    placeholder="Enter Client ID"
                    required
                    disabled={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin"}
                    className="w-full bg-surface-container-lowest/50 border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Client Secret</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={configForm.client_secret}
                      onChange={(e) => setConfigForm({...configForm, client_secret: e.target.value})}
                      placeholder="Enter Client Secret"
                      disabled={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin"}
                      className="w-full bg-surface-container-lowest/50 border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-2.5 h-4 w-4 text-on-surface-variant/50" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary/5 hover:bg-primary/10 border border-outline/25 text-on-surface rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Config
                  </button>

                  {configuringIntegration === "autodesk" && (
                    <button
                      type="button"
                      onClick={(e) => handleConnect2Legged(e, configuringIntegration)}
                      disabled={loading || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 disabled:bg-primary/70 rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                      Connect 2-Legged OAuth
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleConnect3Legged(e, configuringIntegration)}
                    disabled={loading || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary/5 hover:bg-primary/10 border border-outline/25 text-on-surface-variant hover:text-on-surface rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                    {configuringIntegration === "procore" ? "Authenticate with Procore" : "Connect 3-Legged OAuth"}
                  </button>
                </div>
              </>
            )}

            {configuringIntegration === "primavera" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Base URL</label>
                  <input
                    type="url"
                    value={configForm.base_url}
                    onChange={(e) => setConfigForm({...configForm, base_url: e.target.value})}
                    placeholder="https://primavera.example.com"
                    required
                    disabled={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin"}
                    className="w-full bg-surface-container-lowest/50 border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary/5 hover:bg-primary/10 border border-outline/25 text-on-surface rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Config
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleConnect3Legged(e, configuringIntegration)}
                    disabled={loading || !configForm.base_url || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 disabled:bg-primary/70 rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                    Authenticate with Oracle
                  </button>
                </div>
              </>
            )}

            {configuringIntegration === "maximo" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Base URL</label>
                  <input
                    type="url"
                    value={configForm.base_url}
                    onChange={(e) => setConfigForm({...configForm, base_url: e.target.value})}
                    placeholder="https://maximo.example.com"
                    required
                    disabled={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin"}
                    className="w-full bg-surface-container-lowest/50 border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">API Key</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={configForm.api_key}
                      onChange={(e) => setConfigForm({...configForm, api_key: e.target.value})}
                      placeholder="Enter Maximo API Key"
                      disabled={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin"}
                      className="w-full bg-surface-container-lowest/50 border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Key className="absolute right-3 top-2.5 h-4 w-4 text-on-surface-variant/50" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary/5 hover:bg-primary/10 border border-outline/25 text-on-surface rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Config
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleConnection(integrations.find(i => i.id === "maximo")!)}
                    disabled={loading || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 disabled:bg-primary/70 rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                    Connect Now
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {integrations.map((integration) => {
          const isConnected = integration.status === "connected";
          const isAutodesk = integration.id === "autodesk";
          return (
            <div
              key={integration.id}
              className="glass-panel rounded-lg p-6 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold tracking-tight text-on-surface">
                    {integration.name}
                  </h3>
                </div>
                
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6 font-sans flex-1">
                  {integration.description}
                </p>

                {/* Structured Metadata Fields */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-outline-variant/30">
                    <span className="text-on-surface-variant font-medium">Status</span>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#4edea3] animate-pulse" />
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 rounded-md border border-outline/25">
                        <span className="h-1.5 w-1.5 rounded-full bg-outline/70" />
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Inactive</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-outline-variant/30">
                    <span className="text-on-surface-variant font-medium">Last Synchronized</span>
                    <span className="mono-data text-xs text-on-surface font-semibold">{integration.lastSync}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs py-1.5">
                    <span className="text-on-surface-variant font-medium">Clearance Category</span>
                    <div className="flex gap-2 items-center">
                      <span className="px-2 py-0.5 bg-primary/5 border border-outline/25 rounded text-[9px] font-semibold text-on-surface-variant label-caps">
                        {integration.category}
                      </span>
                      {!integration.configured && (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Config Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant mt-auto">
                {true && (
                  <button
                    onClick={() => { setConfiguringIntegration(configuringIntegration === integration.id ? null : integration.id); setConfigForm({ client_id: configs[integration.id]?.client_id || '', client_secret: '', base_url: configs[integration.id]?.base_url || '', username: configs[integration.id]?.username || '', password: '', api_key: '' }); }}
                    disabled={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-outline/20 text-on-surface-variant hover:bg-primary/10 hover:text-on-surface rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin" ? "Requires admin privileges" : "Credential Configuration"}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure
                  </button>
                )}

                <button
                  onClick={() => toggleConnection(integration)}
                  disabled={disconnectingId === integration.id || (userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin")}
                  title={userRole !== "tenant_admin" && userRole !== "super_admin" && userRole !== "super-admin" ? "Requires admin privileges" : ""}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isConnected
                      ? "bg-red-500/10 border border-red-500/25 text-red-500 hover:bg-red-500/20"
                      : "bg-primary text-on-primary border border-primary hover:bg-primary/95"
                  }`}
                >
                  {disconnectingId === integration.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Disconnecting
                    </>
                  ) : isConnected ? (
                    "Disconnect"
                  ) : isAutodesk && !integration.configured ? (
                    "Connect Account"
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhook Endpoint Panel */}
      <div className="glass-panel rounded-lg p-6 relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-3 border-b border-outline-variant pb-3">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface flex items-center gap-2.5 select-none font-sans">
            STRAND Webhook Endpoints
          </h3>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-6 max-w-3xl">
          Register this endpoint in your Autodesk Construction Cloud developer console or BIM 360 Admin settings.
          STRAND will listen to version update notifications and automatically run Computer Vision QA reviews.
        </p>
        
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface-container-lowest/40 border border-outline-variant rounded-md">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-primary/10 border border-outline/30 rounded text-primary label-caps shrink-0">POST</span>
              <span className="text-xs font-mono text-on-surface break-all select-all mono-data whitespace-pre-wrap">
                https://api.strand.build/api/v1/integrations/autodesk/webhook
              </span>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText("https://api.strand.build/api/v1/integrations/autodesk/webhook");
                setSaveMessage("Webhook URL copied to clipboard!");
                setTimeout(() => setSaveMessage(""), 3000);
              }}
              className="text-xs font-bold tracking-wider px-3 py-1.5 border border-outline/25 hover:bg-primary/5 rounded-md text-on-surface-variant hover:text-on-surface transition-all shrink-0 active:scale-95 uppercase font-sans"
            >
              Copy URL
            </button>
          </div>
        </div>
      </div>

      {/* Synced Assets & Vision AI Analysis Log */}
      {integrations.find(i => i.id === "autodesk")?.status === "connected" && (
        <div className="glass-panel rounded-lg p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="text-[12px] font-bold tracking-[0.08em] uppercase text-on-surface flex items-center gap-2 select-none font-sans">
                Synced Design Assets & Vision AI Log
              </h3>
            </div>
            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 rounded-md px-2.5 py-0.5 font-bold text-emerald-400 uppercase tracking-wider">
              Live Stream Active
            </span>
          </div>
          
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/50 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  <th className="py-2.5">Asset Name</th>
                  <th className="py-2.5">Origin</th>
                  <th className="py-2.5">Sync Date</th>
                  <th className="py-2.5">AI Analysis Verdict</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-xs text-on-surface-variant">
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="py-3.5 font-medium text-on-surface font-sans">
                    ACC_Submittal_CoolingTower_REV2.pdf
                  </td>
                  <td className="py-3.5 font-sans">
                    Autodesk Construction Cloud (ACC)
                  </td>
                  <td className="py-3.5 font-mono mono-data">
                    Just Now
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 bg-red-500/10 border border-red-500/25 text-red-500 rounded-md font-semibold inline-flex items-center gap-1 label-caps text-[9px] tracking-wider">
                      <AlertCircle className="h-3 w-3" /> 1 Spec Violation
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button 
                      onClick={() => setActiveReportModal({
                        fileName: "ACC_Submittal_CoolingTower_REV2.pdf",
                        parameter: "ambient_temperature_max",
                        extractedValue: "45.0°C",
                        requiredSpec: ">= 50.0°C (TIA-942 Section 5)",
                        status: "HIGH SEVERITY VIOLATION",
                        action: "Auto-drafted RFI-2026-042 and flagged in approvals workflow.",
                        targetRoute: "/guardian?drawingId=cooling-tower-submittal"
                      })}
                      className="px-2.5 py-1 bg-primary/10 hover:bg-primary/15 border border-outline/25 rounded hover:border-primary/20 text-on-surface transition-all font-semibold uppercase tracking-wider text-[10px] cursor-pointer"
                    >
                      Inspect AI Report
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="py-3.5 font-medium text-on-surface font-sans">
                    ACC_Electrical_Switchgear_Layout.dwg
                  </td>
                  <td className="py-3.5 font-sans">
                    BIM 360 Docs
                  </td>
                  <td className="py-3.5 font-mono mono-data">
                    2 hours ago
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-md font-semibold inline-flex items-center gap-1 label-caps text-[9px] tracking-wider">
                      <CheckCircle2 className="h-3 w-3" /> Fully Compliant
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button 
                      onClick={() => setActiveReportModal({
                        fileName: "ACC_Electrical_Switchgear_Layout.dwg",
                        parameter: "clearance_zones, line_matching",
                        extractedValue: "All guidelines met",
                        requiredSpec: "TIA-942 Spacing Guidelines",
                        status: "COMPLIANT",
                        action: "Added to approved build components graph.",
                        targetRoute: "/guardian?drawingId=switchgear-layout"
                      })}
                      className="px-2.5 py-1 bg-primary/10 hover:bg-primary/15 border border-outline/25 rounded hover:border-primary/20 text-on-surface transition-all font-semibold uppercase tracking-wider text-[10px] cursor-pointer"
                    >
                      Inspect AI Report
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI Benefit Explanation Callout */}
          <div className="bg-primary/5 border border-outline/20 p-5 rounded-lg flex items-start gap-4 mt-6 shadow-sm">
            <div className="bg-primary/10 p-2 rounded-md text-primary mt-1 shadow-inner">
              <Plug className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface font-sans flex items-center gap-2">
                  How Autodesk Integration Improves Construction Delivery
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">AI POWERED</span>
                </h4>
                <button 
                  onClick={() => handleFetchData("autodesk")}
                  disabled={isFetchingData === "autodesk"}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {isFetchingData === "autodesk" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {isFetchingData === "autodesk" ? "Fetching Models..." : "Fetch Latest Models"}
                </button>
              </div>
              <div className="text-sm text-on-surface-variant leading-relaxed font-sans space-y-3">
                <p>
                  By syncing design assets directly from your Autodesk developer hub, STRAND eliminates manual blueprint audits.
                </p>
                <p>
                  Our <strong className="text-primary font-bold">Vision AI Core</strong> automatically extracts physical parameters from drawings, cross-references them with contractual specifications, and alerts engineers of safety violations before hardware is fabricated—minimizing field rework costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-6 rounded-lg space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="label-caps text-on-surface font-bold text-sm">Vision AI Report</h3>
              <button 
                onClick={() => setActiveReportModal(null)}
                className="text-on-surface-variant hover:text-on-surface text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Report Content */}
            <div className="space-y-4 text-sm">
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">File Name</span>
                <span className="text-on-surface font-medium">{activeReportModal.fileName}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Parameter Checked</span>
                  <span className="text-on-surface font-mono text-xs">{activeReportModal.parameter}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Status</span>
                  {activeReportModal.status.includes("VIOLATION") ? (
                    <span className="text-red-500 font-bold label-caps text-[10px] tracking-wider">Violation</span>
                  ) : (
                    <span className="text-emerald-400 font-bold label-caps text-[10px] tracking-wider">Compliant</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-surface-container-lowest/40 border border-outline-variant rounded-md">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">Extracted Value</span>
                  <span className="text-on-surface font-bold font-mono text-xs">{activeReportModal.extractedValue}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">Required Spec</span>
                  <span className="text-on-surface font-bold font-mono text-xs">{activeReportModal.requiredSpec}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">AI Action Executed</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">{activeReportModal.action}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-4 py-2 border border-outline/25 hover:bg-primary/5 text-on-surface rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setActiveReportModal(null);
                  router.push(activeReportModal.targetRoute);
                }}
                className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/95 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                More Info (Guardian)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsHub() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-screen text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <IntegrationsHubContent />
    </Suspense>
  );
}
