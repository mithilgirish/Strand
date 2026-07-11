"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  ClipboardCheck, 
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { name: "Risk Cockpit", href: "/", icon: Home },
    { name: "Guardian Agent", href: "/guardian", icon: ShieldAlert },
    { name: "Scheduler Agent", href: "/scheduler", icon: Calendar },
    { name: "Oracle Agent", href: "/oracle", icon: MapPin },
    { name: "Inspector Agent", href: "/inspector", icon: ClipboardCheck },
    { name: "Brain Agent", href: "/brain", icon: MessageSquare },
  ];

  return (
    <aside 
      className={`${
        isExpanded ? "w-64" : "w-20"
      } bg-surface-container-lowest border-r border-outline-variant text-on-surface flex flex-col justify-between h-screen sticky top-0 z-50 transition-all duration-300 ease-in-out relative`}
    >
      {/* Expand/Collapse Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3.5 top-12 w-7 h-7 bg-surface-container border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors z-50 shadow-md"
        title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className="flex flex-col overflow-hidden">
        {/* Brand Header */}
        <div className={`h-24 flex items-center border-b border-outline-variant bg-surface-container-lowest transition-all duration-300 ${isExpanded ? 'px-6 gap-4' : 'justify-center'}`}>
          <div className={`rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all ${isExpanded ? 'w-14 h-14' : 'w-10 h-10'}`}>
            <Image src="/strand_logo.png" alt="STRAND Logo" width={56} height={56} className="object-cover rounded-2xl" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <span className="font-black text-2xl tracking-wider text-on-surface label-caps">
              STRAND
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`p-3 space-y-2 mt-2 flex flex-col ${isExpanded ? 'px-4' : 'items-center'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center rounded-xl transition-all duration-200 group ${
                  isExpanded ? 'px-4 py-3 gap-3 w-full' : 'w-12 h-12 justify-center'
                } ${
                  isActive
                    ? "bg-[rgba(255,255,255,0.08)] border-t border-t-[rgba(255,255,255,0.30)] border-b border-b-[rgba(0,0,0,0.40)] shadow-[0_4px_20px_rgba(0,0,0,0.50)] text-primary"
                    : "hover:bg-surface-container hover:text-on-surface border border-transparent text-on-surface-variant"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-primary drop-shadow-[0_0_8px_rgba(229,229,229,0.40)]" : "text-on-surface-variant group-hover:text-on-surface"
                }`} />
                
                {isExpanded && (
                  <span className="label-caps whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                )}

                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-primary rounded-r-sm drop-shadow-[0_0_8px_rgba(229,229,229,0.60)] ${isExpanded ? 'h-6 left-0' : 'h-6 left-[-12px]'}`} />
                )}

                {/* Custom Tooltip for collapsed mode */}
                {!isExpanded && (
                  <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-surface-container-high border border-outline-variant text-on-surface text-xs font-bold label-caps rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg flex items-center">
                    {item.name}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-surface-container-high border-l border-b border-outline-variant rotate-45"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info: User Profile & Sign Out */}
      <div className={`py-6 border-t border-outline-variant bg-surface-container-lowest transition-all duration-300 ${isExpanded ? 'px-6 flex flex-row items-center justify-between' : 'flex flex-col items-center gap-4'}`}>
        <div className={`flex items-center group cursor-pointer relative ${isExpanded ? 'gap-3 flex-row' : 'flex-col gap-1'}`}>
          <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-inner group-hover:border-primary transition-colors flex-shrink-0">
            <span className="font-bold text-on-surface font-mono tracking-wider">N</span>
          </div>
          <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-100 w-full items-center'}`}>
            <span className={`font-bold tracking-widest text-on-surface uppercase ${isExpanded ? 'text-xs' : 'text-[9px] mt-1'}`}>Neil</span>
            {isExpanded && <span className="text-[10px] text-on-surface-variant font-mono">Neil@strand.com</span>}
          </div>
        </div>
        
        <button 
          className={`rounded-xl flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-[rgba(248,113,113,0.1)] transition-all flex-shrink-0 ${isExpanded ? 'w-10 h-10' : 'w-10 h-10'}`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
