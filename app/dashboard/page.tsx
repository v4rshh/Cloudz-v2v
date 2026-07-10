"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import SaharaChat from "@/components/SaharaChat";
import IncidentReporter from "@/components/IncidentReporter";
import EmergencySOS from "@/components/EmergencySOS";
import UserProfile from "@/components/UserProfile";
import GhostCall from "@/components/GhostCall";
import AuraSense from "@/components/AuraSense";

// Dynamically import SafetyMap with SSR disabled to prevent Mapbox GL window object crashes during compilation
const SafetyMap = dynamic(() => import("@/components/SafetyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center min-h-[500px] border border-white/5 rounded-xl">
      <span className="text-sm text-slate-400 animate-pulse">Initializing Premium Map Layers...</span>
    </div>
  )
});

interface Contact {
  name: string;
  phone: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("map");
  const [sosState, setSosState] = useState<"idle" | "counting" | "active">("idle");
  const [isGhostCallOpen, setIsGhostCallOpen] = useState(false);
  const [isAuraSenseOpen, setIsAuraSenseOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Sync contacts from UserProfile panel storage settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trusted_contacts");
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    }
  }, [activeTab]);

  return (
    <div className="app-container min-h-screen bg-slate-950 text-white flex">
      {/* Dashboard Sidebar Navigation Controller */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sosState={sosState}
        onTriggerSOS={() => {
          setSosState("active");
          setActiveTab("sos");
        }}
        onTriggerGhostCall={() => setIsGhostCallOpen(true)}
        onTriggerAuraSense={() => setIsAuraSenseOpen(true)}
      />

      {/* Main Dashboard Panel Content Area */}
      <main className="main-content flex-1 flex flex-col bg-[radial-gradient(circle_at_50%_0%,#161f33_0%,#0a0e17_70%)]">
        {activeTab === "map" && <SafetyMap />}
        {activeTab === "chat" && (
          <SaharaChat onCrisisRedirect={() => {
            setSosState("active");
            setActiveTab("sos");
          }} />
        )}
        {activeTab === "report" && <IncidentReporter />}
        {activeTab === "sos" && (
          <EmergencySOS 
            activeSosState={sosState} 
            setActiveSosState={setSosState} 
            trustedContacts={contacts}
          />
        )}
        {activeTab === "profile" && <UserProfile />}
      </main>

      {/* Prominent Overlay Screens */}
      <GhostCall 
        isOpen={isGhostCallOpen} 
        onClose={() => setIsGhostCallOpen(false)} 
      />

      <AuraSense
        isOpen={isAuraSenseOpen}
        onClose={() => setIsAuraSenseOpen(false)}
        onTriggerSOS={() => {
          setSosState("active");
          setActiveTab("sos");
        }}
      />
    </div>
  );
}
