import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import SafetyMap from "./components/SafetyMap";
import SaharaChat from "./components/SaharaChat";
import IncidentReporter from "./components/IncidentReporter";
import EmergencySOS from "./components/EmergencySOS";
import UserProfile from "./components/UserProfile";

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  // Global SOS State: "idle" | "counting" | "active"
  const [globalSosState, setGlobalSosState] = useState("idle");

  const handleGlobalSOSTrigger = () => {
    setActiveTab("sos");
    setGlobalSosState("counting");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "map":
        return <SafetyMap />;
      case "chat":
        return (
          <SaharaChat 
            onCrisisRedirect={() => {
              setActiveTab("sos");
              setGlobalSosState("active");
            }} 
          />
        );
      case "reports":
        return <IncidentReporter />;
      case "sos":
        return (
          <EmergencySOS 
            activeSosState={globalSosState} 
            setActiveSosState={setGlobalSosState} 
          />
        );
      case "profile":
        return <UserProfile />;
      default:
        return <SafetyMap />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onGlobalSOSTrigger={handleGlobalSOSTrigger}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}
