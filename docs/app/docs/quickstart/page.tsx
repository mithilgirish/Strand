import { Terminal, CheckCircle2, AlertTriangle } from "lucide-react";

export default function QuickstartPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <span className="label-caps text-[#4edea3]">Getting Started</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">Quickstart Guide</h1>
        <p className="text-base text-[#a3a3a3] leading-relaxed">
          Set up and run the entire STRAND multi-agent infrastructure stack locally.
        </p>
      </div>

      {/* Option 1: Docker Compose */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#4edea3]/20 text-[#4edea3] flex items-center justify-center font-bold text-xs">1</span>
          <h2 className="text-xl font-bold text-white">Option 1: Docker Compose (Recommended)</h2>
        </div>
        <p className="text-sm text-[#a3a3a3]">
          Spins up the FastAPI backend, Next.js frontend, Neo4j Community DB, and Redis caching container with a single command.
        </p>

        <div className="code-box p-4 rounded-lg text-xs text-white leading-relaxed overflow-x-auto">
          <code>
            <span className="text-[#a3a3a3]"># 1. Clone the repository</span><br />
            <span className="text-[#4edea3]">git clone</span> https://github.com/mithilgirish/Strand.git<br />
            <span className="text-[#4edea3]">cd</span> Strand<br /><br />
            <span className="text-[#a3a3a3]"># 2. Configure environment variables</span><br />
            <span className="text-[#4edea3]">cp</span> backend/.env.example backend/.env<br /><br />
            <span className="text-[#a3a3a3]"># 3. Start all 4 containers</span><br />
            <span className="text-[#4edea3]">docker compose up</span>
          </code>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="glass-panel p-3 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">Web Dashboard</span>
            <div className="font-mono font-bold text-white mt-1">http://localhost:3000</div>
          </div>
          <div className="glass-panel p-3 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">FastAPI Swagger Docs</span>
            <div className="font-mono font-bold text-[#4edea3] mt-1">http://localhost:8000/docs</div>
          </div>
          <div className="glass-panel p-3 rounded-lg">
            <span className="label-caps text-[#a3a3a3]">Neo4j Browser</span>
            <div className="font-mono font-bold text-white mt-1">http://localhost:7474</div>
          </div>
        </div>
      </div>

      {/* Option 2: Manual Local Setup */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs">2</span>
          <h2 className="text-xl font-bold text-white">Option 2: Manual Development Setup</h2>
        </div>

        <h3 className="text-sm font-bold text-white mt-2">Backend (Python 3.11)</h3>
        <div className="code-box p-4 rounded-lg text-xs text-white leading-relaxed overflow-x-auto">
          <code>
            <span className="text-[#4edea3]">cd</span> backend<br />
            <span className="text-[#4edea3]">python</span> -m venv .venv &amp;&amp; <span className="text-[#4edea3]">source</span> .venv/bin/activate<br />
            <span className="text-[#4edea3]">pip</span> install -r requirements.txt<br />
            <span className="text-[#4edea3]">cp</span> .env.example .env<br />
            <span className="text-[#4edea3]">uvicorn</span> backend.main:app --reload --port 8000
          </code>
        </div>

        <h3 className="text-sm font-bold text-white mt-4">Frontend (Next.js 16)</h3>
        <div className="code-box p-4 rounded-lg text-xs text-white leading-relaxed overflow-x-auto">
          <code>
            <span className="text-[#4edea3]">cd</span> frontend<br />
            <span className="text-[#4edea3]">npm</span> install<br />
            <span className="text-[#4edea3]">cp</span> .env.example .env.local<br />
            <span className="text-[#4edea3]">npm</span> run dev
          </code>
        </div>
      </div>

      {/* Required API Keys */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <h3 className="font-bold text-white">Required API Keys & Cloud Services</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-white/10 label-caps text-[#a3a3a3]">
              <tr>
                <th className="py-2">Variable</th>
                <th className="py-2">Service</th>
                <th className="py-2">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              <tr>
                <td className="py-2 text-[#4edea3]">GROQ_API_KEY</td>
                <td className="py-2 font-sans">Groq Cloud (Llama-3.3-70B)</td>
                <td className="py-2 text-white font-sans">Yes (Free tier)</td>
              </tr>
              <tr>
                <td className="py-2 text-[#4edea3]">NEO4J_URI & PASSWORD</td>
                <td className="py-2 font-sans">Neo4j AuraDB or Local</td>
                <td className="py-2 text-white font-sans">Yes (Free tier)</td>
              </tr>
              <tr>
                <td className="py-2 text-[#4edea3]">SUPABASE_URL & ANON_KEY</td>
                <td className="py-2 font-sans">Supabase Auth</td>
                <td className="py-2 text-white font-sans">Yes (Free tier)</td>
              </tr>
              <tr>
                <td className="py-2 text-[#4edea3]">DEMO_MODE=True</td>
                <td className="py-2 font-sans">Offline mock datasets</td>
                <td className="py-2 text-white font-sans">Optional (Instant testing)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
