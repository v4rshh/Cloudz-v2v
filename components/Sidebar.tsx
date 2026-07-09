"use client";

import React from "react";
import { 
  Navigation, 
  MessageSquare, 
  AlertTriangle, 
  PhoneCall, 
  EyeOff, 
  Settings, 
  AlertOctagon,
  Volume2
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sosState: "idle" | "counting" | "active";
  onTriggerSOS: () => void;
  onTriggerGhostCall: () => void;
  onTriggerAuraSense: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  sosState,
  onTriggerSOS,
  onTriggerGhostCall,
  onTriggerAuraSense,
}: SidebarProps) {
  const menuItems = [
    { id: "map", label: "VibeRoute Map", icon: Navigation },
    { id: "chat", label: "Sahara Assistant", icon: MessageSquare },
    { id: "report", label: "Report Incident", icon: AlertTriangle },
    { id: "sos", label: "Emergency SOS", icon: AlertOctagon },
    { id: "profile", label: "Profile Settings", icon: Settings },
  ];

  return (
    <aside className="sidebar flex flex-col justify-between h-full bg-slate-900 border-r border-white/5 py-6 px-4">
      {/* Brand Header */}
      <div>
        <div className="sidebar-logo flex items-center gap-2 pb-4 mb-6 border-b border-white/5">
          <div className="size-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-sm">
            S
          </div>
          <span className="sidebar-logo-text font-black text-xl bg-gradient-to-r from-white to-teal-400 bg-clip-text text-transparent">
            SafeSphere
          </span>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition ${
                  isActive 
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} className={isActive ? "text-teal-400" : "text-slate-400"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Prominent Sidebar Quick Triggers */}
      <div className="flex flex-col gap-3 mt-auto">
        {/* Quick GhostCall Trigger */}
        <button 
          onClick={onTriggerGhostCall}
          className="btn btn-secondary w-full text-xs font-semibold py-3 flex items-center justify-center gap-2 border border-white/5 bg-slate-950 hover:bg-slate-900"
        >
          <PhoneCall size={14} className="text-teal-400" />
          <span>Simulate GhostCall</span>
        </button>

        {/* Quick AuraSense Stealth Companion Trigger */}
        <button 
          onClick={onTriggerAuraSense}
          className="btn btn-secondary w-full text-xs font-semibold py-3 flex items-center justify-center gap-2 border border-white/5 bg-slate-950 hover:bg-slate-900"
        >
          <EyeOff size={14} className="text-teal-400" />
          <span>AuraSense Stealth</span>
        </button>

        {/* Main SOS Sidebar Button */}
        <button 
          onClick={onTriggerSOS}
          className={`sos-trigger-sidebar w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg ${
            sosState === "active" 
              ? "bg-rose-600 hover:bg-rose-500 animate-pulse" 
              : "bg-rose-500 hover:bg-rose-400"
          }`}
        >
          <Volume2 size={16} />
          <span>{sosState === "active" ? "SOS IN PROGRESS" : "PANIC SOS"}</span>
        </button>
      </div>
    </aside>
  );
}
