import React from "react";
import { 
  Map, 
  MessageSquare, 
  AlertTriangle, 
  Radio, 
  User, 
  ShieldAlert 
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, onGlobalSOSTrigger }) {
  const menuItems = [
    { id: "map", label: "Safety Map", icon: Map },
    { id: "chat", label: "Ask Sahara", icon: MessageSquare },
    { id: "reports", label: "Incident Hub", icon: AlertTriangle },
    { id: "sos", label: "Emergency SOS", icon: Radio },
    { id: "profile", label: "Profile & Contacts", icon: User },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">
          <ShieldAlert size={28} color="#ff3860" />
          <span className="sidebar-logo-text">SafeRoute AI</span>
        </div>
        
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button className="sos-trigger-sidebar" onClick={onGlobalSOSTrigger}>
          <Radio size={18} className="recording-dot" style={{ animationDuration: '0.6s' }} />
          <span>PANIC BUTTON</span>
        </button>
      </div>
    </aside>
  );
}
