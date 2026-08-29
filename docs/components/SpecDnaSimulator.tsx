"use client";

import { useState, useEffect } from "react";
import { Fingerprint, Check, Copy } from "lucide-react";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function SpecDnaSimulator() {
  const [param, setParam] = useState("ambient_temperature_max");
  const [val, setVal] = useState("50°C");
  const [sec, setSec] = useState("6.7.1");
  const [src, setSrc] = useState("spec_tia942_datacenter.pdf");
  const [hash, setHash] = useState("CALCULATING...");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function calculate() {
      const payload = JSON.stringify({
        param: param.trim(),
        section: sec.trim(),
        source: src.trim(),
        value: val.trim(),
      });
      const full = await sha256(payload);
      setHash(full.substring(0, 16).toUpperCase());
    }
    calculate();
  }, [param, val, sec, src]);

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-6 rounded-xl space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-[#4edea3]" />
          <h3 className="font-bold text-white text-sm">Spec-DNA Fingerprint Generator</h3>
        </div>
        <span className="label-caps px-2 py-0.5 rounded bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 text-[10px]">
          Deterministic SHA-256
        </span>
      </div>

      <div className="space-y-3.5 text-xs font-mono">
        <div>
          <label className="block text-[#a3a3a3] mb-1 font-sans font-semibold">Parameter Key</label>
          <input
            type="text"
            value={param}
            onChange={(e) => setParam(e.target.value)}
            className="w-full px-3 py-2 rounded bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#4edea3]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#a3a3a3] mb-1 font-sans font-semibold">Required Value</label>
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#4edea3]"
            />
          </div>
          <div>
            <label className="block text-[#a3a3a3] mb-1 font-sans font-semibold">Clause Reference</label>
            <input
              type="text"
              value={sec}
              onChange={(e) => setSec(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#4edea3]"
            />
          </div>
        </div>
        <div>
          <label className="block text-[#a3a3a3] mb-1 font-sans font-semibold">Specification Document</label>
          <input
            type="text"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="w-full px-3 py-2 rounded bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#4edea3]"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-black/80 border border-[#4edea3]/20 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#a3a3a3]">
          <span className="label-caps text-[#4edea3]">Computed Spec-DNA ID</span>
          <button
            onClick={copyHash}
            className="flex items-center gap-1 text-[11px] text-[#a3a3a3] hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#4edea3]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <div className="font-mono text-xl font-bold text-[#4edea3] tracking-widest">
          {hash}
        </div>
      </div>
    </div>
  );
}
