"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  ShieldAlert 
} from "lucide-react";

interface Contact {
  id: number;
  name: string;
  phone: string;
}

export default function UserProfile() {
  const [phone, setPhone] = useState("+31 6 12345678");
  const [email, setEmail] = useState("jane.doe@example.com");
  const [language, setLanguage] = useState("en");
  const [codeword, setCodeword] = useState("citrus");
  const [anonymousMode, setAnonymousMode] = useState(true);

  // Load emergency contacts from localStorage with fallbacks
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trusted_contacts");
      if (saved) {
        setContacts(JSON.parse(saved));
      } else {
        const defaults = [
          { id: 1, name: "Sarah Doe (Sister)", phone: "+31 6 87654321" },
          { id: 2, name: "John Doe (Father)", phone: "+31 6 11223344" }
        ];
        setContacts(defaults);
        localStorage.setItem("trusted_contacts", JSON.stringify(defaults));
      }
    }
  }, []);

  const saveContactsToStorage = (updated: Contact[]) => {
    setContacts(updated);
    localStorage.setItem("trusted_contacts", JSON.stringify(updated));
  };

  // Add Contact Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const addContact = () => {
    if (!newName.trim() || !newPhone.trim()) {
      alert("Name and phone number are required.");
      return;
    }
    if (contacts.length >= 5) {
      alert("You can add a maximum of 5 emergency contacts.");
      return;
    }

    const newContact = {
      id: Date.now(),
      name: newName,
      phone: newPhone
    };

    const updated = [...contacts, newContact];
    saveContactsToStorage(updated);
    setNewName("");
    setNewPhone("");
  };

  const removeContact = (id: number) => {
    if (contacts.length <= 1) {
      alert("You must keep at least 1 emergency contact for your safety.");
      return;
    }
    const updated = contacts.filter((c) => c.id !== id);
    saveContactsToStorage(updated);
  };

  const handleSaveProfile = () => {
    alert("Profile configurations saved successfully.");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="page-header bg-slate-900/40 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="page-title-group">
          <h1>Profile & Safety Settings</h1>
          <p className="text-xs text-slate-400">Configure your contact information, manage trusted responders, and setup custom voice wake words.</p>
        </div>
        <div className="badge badge-info text-xs flex items-center gap-1">
          <User size={12} />
          <span>Profile synced</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6 flex-1 overflow-hidden h-[calc(100vh-120px)]">
        {/* Core Profile & Settings */}
        <div className="glass p-6 flex flex-col gap-5 overflow-y-auto h-full">
          <h3 className="card-title text-sm font-semibold flex items-center gap-2">
            <Settings size={18} className="text-teal-400" />
            <span>Account Details</span>
          </h3>

          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label>Phone Number (Used for OTP verification)</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label>Default Interface Language</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                className="form-input text-xs"
                style={{ background: "#000", color: "#fff" }}
              >
                <option value="en">English (default)</option>
                <option value="nl">Nederlands (Dutch)</option>
                <option value="fr">Français (French)</option>
                <option value="de">Deutsch (German)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Voice Activated Codeword (offline speech activation)</label>
              <input 
                type="text" 
                value={codeword} 
                onChange={(e) => setCodeword(e.target.value)} 
                className="form-input" 
                placeholder="Codeword (e.g. citrus, help)"
              />
              <span className="text-[10px] text-slate-500">
                Saying this codeword will automatically trigger full SOS and start local camera backups.
              </span>
            </div>

            <div className="toggle-row mt-2 flex justify-between items-center">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Anonymous reporting mode</span>
                <span className="text-[10px] text-slate-500">Hide phone details by default on the safety feed.</span>
              </span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={anonymousMode} 
                  onChange={(e) => setAnonymousMode(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>

            <button onClick={handleSaveProfile} className="btn btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 mt-4">
              <Save size={16} />
              <span>Save Configurations</span>
            </button>
          </div>
        </div>

        {/* Trusted Contacts Panel */}
        <div className="glass p-6 flex flex-col gap-5 overflow-y-auto h-full">
          <h3 className="card-title text-sm font-semibold flex items-center gap-2">
            <Users size={18} className="text-teal-400" />
            <span>Trusted Contacts Responders (Min 1, Max 5)</span>
          </h3>

          {/* Form to Add Contact */}
          <div className="border border-white/5 bg-black/10 rounded-xl p-4 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Add Trusted Contact</h4>
            <div className="form-group">
              <label>Contact Name</label>
              <input 
                type="text" 
                placeholder="Name (e.g. Sarah Doe)" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="form-input text-xs"
              />
            </div>
            <div className="form-group">
              <label>Phone Number (Includes country code)</label>
              <input 
                type="text" 
                placeholder="Phone (e.g. +31 6 87654321)" 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)}
                className="form-input text-xs"
              />
            </div>
            <button 
              onClick={addContact}
              className="btn btn-secondary w-full text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Responder
            </button>
          </div>

          {/* Contact Lists display */}
          <div className="flex flex-col gap-3 mt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Responders</h4>
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className="border border-white/5 bg-white/2 rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="text-xs font-bold text-white">{contact.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">{contact.phone}</div>
                </div>
                <button 
                  onClick={() => removeContact(contact.id)}
                  className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 rounded-lg transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 bg-teal-950/10 border border-teal-500/20 rounded-xl flex gap-3 mt-auto">
            <ShieldAlert className="text-teal-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              When triggering an emergency SOS, the system automatically sends SMS alerts with live tracking links to all active responders listed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
