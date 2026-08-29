import { Plug, FileCode2, CheckCircle2 } from "lucide-react";

export default function IntegrationsPage() {
  const integrations = [
    {
      name: "Autodesk Construction Cloud (ACC)",
      type: "BIM & CDE",
      desc: "Listens to dm.version.added webhooks to automatically pull new drawing versions and submittals for Guardian compliance audits.",
      endpoint: "POST /api/v1/integrations/autodesk/webhook",
    },
    {
      name: "Procore",
      type: "Project Management",
      desc: "Syncs RFIs and vendor submittal cut-sheets with bi-directional status updates when approvals are granted by the HITL gate.",
      endpoint: "POST /api/v1/integrations/procore/sync",
    },
    {
      name: "Oracle Primavera P6",
      type: "Master Schedule",
      desc: "Ingests master baseline schedules in CSV / XER formats to generate the Scheduler DAG critical path network.",
      endpoint: "POST /api/v1/integrations/primavera/schedule",
    },
    {
      name: "IBM Maximo",
      type: "Enterprise Asset Management",
      desc: "Publishes verified As-Built asset records and commissioning serial numbers directly into the client enterprise asset registry.",
      endpoint: "POST /api/v1/integrations/maximo/assets",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Enterprise Connectivity</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">BIM & Construction Integrations</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          Connect STRAND to existing Common Data Environments (CDE) and project management platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {integrations.map((item) => (
          <div key={item.name} className="glass-panel p-6 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">{item.name}</h3>
              <span className="label-caps px-2 py-0.5 rounded bg-white/5 text-[#4edea3] border border-white/10 text-[10px]">
                {item.type}
              </span>
            </div>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{item.desc}</p>
            <div className="code-box p-2.5 rounded text-xs font-mono text-white/80">
              Webhook: <span className="text-[#4edea3]">{item.endpoint}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
