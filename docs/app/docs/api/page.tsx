import { Code2 } from "lucide-react";

export default function ApiReferencePage() {
  const routes = [
    { method: "GET", path: "/api/v1/health", desc: "System liveness, Neo4j connection state, and Redis cache health" },
    { method: "GET", path: "/api/v1/project/summary", desc: "Immunity score, open NCR count, and priority schedule risk overview" },
    { method: "POST", path: "/api/v1/guardian/audit", desc: "Upload vendor submittal PDF for instant Spec-DNA compliance audit" },
    { method: "GET", path: "/api/v1/guardian/violations", desc: "List all detected specification deviations across project submittals" },
    { method: "GET", path: "/api/v1/scheduler/timeline", desc: "Fetch critical path task DAG with calculated R0 contagion scores" },
    { method: "GET", path: "/api/v1/scheduler/risks", desc: "Get all at-risk CPM tasks and recommended mitigation compressions" },
    { method: "GET", path: "/api/v1/oracle/shipments", desc: "Returns GeoJSON FeatureCollection of all active equipment in transit" },
    { method: "GET", path: "/api/v1/oracle/suppliers/{tag}", desc: "Rank alternative pre-qualified suppliers for critical equipment" },
    { method: "POST", path: "/api/v1/chat/message", desc: "Submit multi-turn natural language queries to Brain Hybrid GraphRAG" },
    { method: "POST", path: "/api/v1/approvals/resolve", desc: "Approve or reject pending high-impact write actions (HITL gate)" },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Developer Reference</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">REST API Reference</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          Standardized JSON endpoints exposed by the STRAND FastAPI backend gateway.
        </p>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {routes.map((r) => (
          <div key={r.path} className="glass-panel p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                r.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-[#4edea3]"
              }`}>
                {r.method}
              </span>
              <span className="text-white font-bold">{r.path}</span>
            </div>
            <span className="text-[#a3a3a3] font-sans text-xs">{r.desc}</span>
          </div>
        ))}
      </div>

      <div className="glass-panel p-5 rounded-lg text-xs text-[#a3a3a3] space-y-2">
        <div className="font-bold text-white font-sans">Interactive OpenAPI / Swagger Docs</div>
        <p>When running the backend, visit <code className="text-[#4edea3] font-mono">http://localhost:8000/docs</code> to view interactive Swagger schema testing.</p>
      </div>
    </div>
  );
}
