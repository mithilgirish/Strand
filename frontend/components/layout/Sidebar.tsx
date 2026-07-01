"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  ClipboardCheck, 
  MessageSquare
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
    <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant text-on-surface flex flex-col justify-between h-screen sticky top-0">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-24 flex items-center px-6 border-b border-outline-variant gap-4 bg-surface-container-lowest">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <Image src="/strand_logo.png" alt="STRAND Logo" width={56} height={56} className="object-cover rounded-2xl" />
          </div>
          <div>
            <span className="font-black text-2xl tracking-wider text-on-surface label-caps">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group relative ${
                  isActive
                    ? "bg-[rgba(255,255,255,0.05)] border-t border-t-[rgba(255,255,255,0.30)] border-b border-b-[rgba(0,0,0,0.40)] shadow-[0_4px_20px_rgba(0,0,0,0.50)] text-primary"
                    : "hover:bg-surface-container hover:text-on-surface border border-transparent text-on-surface-variant"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-primary drop-shadow-[0_0_8px_rgba(229,229,229,0.40)]" : "text-on-surface-variant group-hover:text-on-surface"
                }`} />
                <span className="label-caps">{item.name}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-sm drop-shadow-[0_0_8px_rgba(229,229,229,0.60)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-outline-variant bg-surface-container-lowest text-xs text-on-surface-variant text-center">
        <p className="label-caps mb-1">ET AI Hackathon 2026</p>
        <p className="mono-data text-xs">Problem Statement 4</p>
      </div>
    </aside>
  );
}
