"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  ClipboardCheck, 
  MessageSquare,
  Activity
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Risk Cockpit", href: "/", icon: Home },
    { name: "Guardian Agent", href: "/guardian", icon: ShieldAlert },
    { name: "Scheduler Agent", href: "/scheduler", icon: Calendar },
    { name: "Oracle Agent", href: "/oracle", icon: MapPin },
    { name: "Inspector Agent", href: "/inspector", icon: ClipboardCheck },
    { name: "Brain Agent", href: "/brain", icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-[#0A0A16] border-r border-[#1E1E38] text-slate-300 flex flex-col justify-between h-screen sticky top-0">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#1E1E38] gap-3 bg-[#080812]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-[#0A0A16] stroke-[2.5]" />
          </div>
          <div>
            <span className="font-black text-xl tracking-wider text-slate-100 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              STRAND
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-950/40 to-slate-900/40 border border-cyan-500/30 text-cyan-400 font-medium shadow-inner shadow-cyan-950/20"
                    : "hover:bg-slate-900/30 hover:text-slate-100 border border-transparent text-slate-400"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
                }`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-[#1E1E38] bg-[#080812] text-xs text-slate-500 text-center">
        <p className="font-semibold text-slate-400">ET AI Hackathon 2026</p>
        <p className="mt-1">Problem Statement 4</p>
      </div>
    </aside>
  );
}
