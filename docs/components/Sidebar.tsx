"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  Terminal, 
  Layers, 
  Fingerprint, 
  Activity, 
  Bot, 
  Plug, 
  Code2, 
  Compass
} from "lucide-react";

interface NavGroup {
  title: string;
  items: { href: string; label: string; icon: any; badge?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs", label: "Overview", icon: BookOpen },
      { href: "/docs/how-to-use", label: "How to Use & Workflows", icon: Compass, badge: "Guide" },
      { href: "/docs/quickstart", label: "Quickstart & Setup", icon: Terminal },
      { href: "/docs/architecture", label: "System Architecture", icon: Layers },
    ],
  },
  {
    title: "Core Engines",
    items: [
      { href: "/docs/spec-dna", label: "Spec-DNA Hashes", icon: Fingerprint, badge: "SHA-256" },
      { href: "/docs/r0-engine", label: "R₀ Contagion Engine", icon: Activity, badge: "Physics" },
      { href: "/docs/agents", label: "8-Agent Ensemble", icon: Bot, badge: "LangGraph" },
    ],
  },
  {
    title: "Integrations & API",
    items: [
      { href: "/docs/integrations", label: "BIM & Enterprise APIs", icon: Plug },
      { href: "/docs/api", label: "REST API Reference", icon: Code2 },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 p-6 hidden md:block self-start sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
      <div className="space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2.5">
            <h4 className="label-caps text-[#a3a3a3] text-[10px] px-2">{group.title}</h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-white/10 text-[#4edea3] font-semibold border border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                        : "text-[#a3a3a3] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#4edea3]" : "text-[#a3a3a3]"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="label-caps text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#a3a3a3] border border-white/10">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
