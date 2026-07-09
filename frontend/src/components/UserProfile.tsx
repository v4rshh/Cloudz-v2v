import React, { useState } from "react";
import { 
  User, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  ShieldAlert 
} from "lucide-react";

export default function UserProfile() {
  const [phone, setPhone] = useState("+31 6 12345678");
  const [email, setEmail] = useState("jane.doe@example.com");
  const [language, setLanguage] = useState("en");
  const [codeword, setCodeword] = useState("citrus");
  const [anonymousMode, setAnonymousMode] = useState(true);

  // Emergency Contacts state
  const [contacts, setContacts] = useState([
    { id: 1, name: "Sarah Doe (Sister)", phone: "+31 6 87654321" },
    { id: 2, name: "John Doe (Father)", phone: "+31 6 11223344" }
  ]);

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

    setContacts([...contacts, newContact]);
    setNewName("");
    setNewPhone("");
  };

  const removeContact = (id) => {
    if (contacts.length <= 1) {
      alert("You must keep at least 1 emergency contact for your safety.");
      return;
    }
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const handleSaveProfile = () => {
    alert("Profile configurations saved successfully.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Profile & Safety Settings</h1>
          <p>Configure your contact information, manage trusted responders, and setup custom voice wake words.</p>
        </div>
        <div className="badge badge-info">
          <User size={14} />
          <span>Profile synched</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Core Profile & Settings */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <h3 className="card-title">
            <Settings size={20} color="#00d1b2" />
            <span>Account Details</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                className="form-input"
                style={{ background: '#000', color: '#fff' }}
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
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Saying this codeword will automatically trigger full SOS and start local camera backups.
              </span>
            </div>

            <div className="toggle-row" style={{ marginTop: '8px' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Anonymous reporting mode</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hide phone details by default on the safety feed.</span>
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

            <button onClick={handleSaveProfile} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              <Save size={16} />
              <span>Save Configurations</span>
            </button>
          </div>
        </div>

        {/* Emergency Contacts Panel */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div>
            <h3 className="card-title">
              <Users size={20} color="#ff3860" />
              <span>Trusted emergency Contacts</span>
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Min 1 contact required. Max 5.
              </span>
              <span className="badge badge-info" style={{ fontSize: '10px' }}>
                {contacts.length} / 5 Contacts
              </span>
            </div>

            {/* Contact list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{contact.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{contact.phone}</span>
                  </div>
                  <button 
                    onClick={() => removeContact(contact.id)} 
                    className="btn btn-secondary" 
                    style={{ padding: '6px', border: 'none', background: 'rgba(255,56,96,0.1)', color: 'var(--accent-red)' }}
                    title="Remove Contact"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add contact form */}
            {contacts.length < 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Add Trusted Member</h4>
                
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Contact Name" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="form-input" 
                    style={{ padding: '8px 12px' }}
                  />
                </div>

                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Phone number" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)} 
                    className="form-input" 
                    style={{ padding: '8px 12px' }}
                  />
                </div>

                <button onClick={addContact} className="btn btn-secondary" style={{ width: '100%', gap: '6px' }}>
                  <Plus size={14} />
                  <span>Add Trusted Contact</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,56,96,0.03)', border: '1px dashed rgba(255,56,96,0.3)', borderRadius: '12px', marginTop: 'auto', display: 'flex', gap: '10px' }}>
            <ShieldAlert size={20} color="var(--accent-red)" style={{ minWidth: '20px' }} />
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              Whenever you trigger the SOS button, we immediately dispatch an SMS warning to all listed contacts, containing your live Rotterdam geolocation tracking URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
