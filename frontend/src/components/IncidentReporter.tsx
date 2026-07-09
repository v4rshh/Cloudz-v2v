import React, { useState } from "react";
import { 
  AlertTriangle, 
  Sparkles, 
  HelpCircle, 
  MapPin, 
  EyeOff, 
  ThumbsUp, 
  ThumbsDown,
  Info
} from "lucide-react";
import { api } from "../api";

const INITIAL_FEED = [
  {
    id: "rep-1",
    raw_text: "Streetlight was completely broken on the corner near the central bus stop. Very dark and felt unsafe walking home.",
    category: "infrastructure",
    severity: 2,
    location: { lat: 51.9215, lng: 4.4865 },
    verification_count: 8,
    created_at: "2 hours ago",
    anonymous: true
  },
  {
    id: "rep-2",
    raw_text: "A group of men were catcalling and following girls who got off the tram here. Police was notified.",
    category: "harassment",
    severity: 3,
    location: { lat: 51.9200, lng: 4.4825 },
    verification_count: 14,
    created_at: "4 hours ago",
    anonymous: false
  },
  {
    id: "rep-3",
    raw_text: "Someone was waiting behind a pillar and grabbed my arm when I walked past. I screamed and ran away.",
    category: "assault",
    severity: 5,
    location: { lat: 51.9175, lng: 4.4840 },
    verification_count: 23,
    created_at: "Yesterday",
    anonymous: true
  }
];

export default function IncidentReporter() {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  
  // Tagging State (to allow review/editing before saving)
  const [category, setCategory] = useState("other");
  const [severity, setSeverity] = useState(2);
  const [confidence, setConfidence] = useState(0.0);

  // Local Feed State
  const [feed, setFeed] = useState(INITIAL_FEED);

  // AI Classification Trigger
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const location = { lat: 51.9225, lng: 4.47917 }; // Rotterdan Coords
      const { data } = await api.post("/reports", { text, location, anonymous });
      
      const classification = data.classification || {
        category: "other",
        severity: 2,
        confidence_score: 0.5
      };

      setCategory(classification.category);
      setSeverity(classification.severity);
      setConfidence(classification.confidence_score);
      setAnalyzed(true);
    } catch (err) {
      console.error("AI classification failed", err);
      // Fallback local heuristic
      let cat = "other";
      let sev = 2;
      const lower = text.toLowerCase();
      if (lower.includes("follow") || lower.includes("stalk")) cat = "stalking";
      else if (lower.includes("catcall") || lower.includes("harass")) cat = "harassment";
      else if (lower.includes("touch") || lower.includes("grab") || lower.includes("assault")) cat = "assault";
      else if (lower.includes("light") || lower.includes("dark")) cat = "infrastructure";

      if (cat === "assault") sev = 5;
      else if (cat === "stalking") sev = 4;
      
      setCategory(cat);
      setSeverity(sev);
      setConfidence(0.6);
      setAnalyzed(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    // Save report to feed
    const newReport = {
      id: `rep-${Date.now()}`,
      raw_text: text,
      category: category,
      severity: severity,
      location: { lat: 51.9225, lng: 4.47917 },
      verification_count: 1,
      created_at: "Just now",
      anonymous: anonymous
    };

    setFeed((prev) => [newReport, ...prev]);
    
    // Reset Form
    setText("");
    setAnalyzed(false);
    alert("Report submitted successfully and logged to the incident safety heatmap.");
  };

  // Upvote/Downvote verifications
  const handleVote = async (reportId, voteType) => {
    try {
      await api.post(`/reports/${reportId}/verify`, { vote: voteType });
    } catch (err) {
      console.warn("API verify endpoints details mock fallback triggered", err);
    }

    setFeed((prev) =>
      prev.map((rep) => {
        if (rep.id === reportId) {
          const delta = voteType === "up" ? 1 : -1;
          return { ...rep, verification_count: rep.verification_count + delta };
        }
        return rep;
      })
    );
  };

  const getSeverityLabel = (level) => {
    if (level === 5) return "Critical (5)";
    if (level === 4) return "Severe (4)";
    if (level === 3) return "Moderate (3)";
    if (level === 2) return "Low-Moderate (2)";
    return "Low (1)";
  };

  const getSeverityClass = (level) => {
    if (level >= 4) return "badge-danger";
    if (level >= 3) return "badge-warning";
    return "badge-info";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Smart Incident Reporting</h1>
          <p>Anonymously report street concerns. Free-text inputs are auto-tagged by AI and verified by the community.</p>
        </div>
        <div className="badge badge-warning">
          <AlertTriangle size={14} />
          <span>Crowdsourced safety updates</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Form Panel */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="card-title">
              <Sparkles size={20} color="#00d1b2" />
              <span>Report Details</span>
            </h3>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>What happened? Describe the incident, context, and street lighting details:</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write in your own words (e.g. 'Street light broken near library, followed by a suspicious man...')"
                className="form-textarea"
                rows={6}
                disabled={submitting || analyzed}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="toggle-row" style={{ marginBottom: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <EyeOff size={16} />
                <span>Submit anonymously (hides username)</span>
              </span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={anonymous} 
                  onChange={(e) => setAnonymous(e.target.checked)}
                  disabled={submitting || analyzed}
                />
                <span className="slider"></span>
              </label>
            </div>

            {!analyzed ? (
              <button 
                onClick={handleAnalyze} 
                disabled={submitting || !text.trim()} 
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {submitting ? "Analyzing Text via AI NLP..." : "Analyze with AI"}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ padding: '12px', background: 'rgba(72, 95, 199, 0.05)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-blue)', marginBottom: '8px' }}>
                    <Sparkles size={14} />
                    <span>AI Review Step — Verify Auto-Tags</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                    Our NLP model analyzed your text. Adjust the categorizations below if needed:
                  </p>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Incident Category</label>
                    <div className="badge-row">
                      {["harassment", "stalking", "assault", "infrastructure", "other"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`btn ${category === cat ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Severity Level: {getSeverityLabel(severity)}</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={severity} 
                      onChange={(e) => setSeverity(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-red)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setAnalyzed(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Re-edit Report
                  </button>
                  <button onClick={handleFinalSubmit} className="btn btn-danger" style={{ flex: 1 }}>
                    Save & Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Community Feed Panel */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <h3 className="card-title">
            <HelpCircle size={20} color="#ff3860" />
            <span>Community verification Feed</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {feed.map((rep) => (
              <div 
                key={rep.id} 
                className="glass" 
                style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={`badge ${getSeverityClass(rep.severity)}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                      {rep.category}
                    </span>
                    <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '2px 8px', background: 'rgba(255,255,255,0.05)' }}>
                      Severity {rep.severity}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rep.created_at}</span>
                </div>

                <p style={{ fontSize: '13px', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                  "{rep.raw_text}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <MapPin size={12} color="#00d1b2" />
                    <span>{rep.location.lat.toFixed(4)}, {rep.location.lng.toFixed(4)}</span>
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Verify reports: <strong>{rep.verification_count}</strong> score
                    </span>
                    
                    <button 
                      onClick={() => handleVote(rep.id, "up")} 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', borderRadius: '6px' }}
                      title="Upvote - Credible report"
                    >
                      <ThumbsUp size={11} color="var(--accent-green)" />
                    </button>
                    <button 
                      onClick={() => handleVote(rep.id, "down")} 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', borderRadius: '6px' }}
                      title="Downvote - False or stale report"
                    >
                      <ThumbsDown size={11} color="var(--accent-red)" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: 'auto' }}>
            <Info size={16} color="var(--accent-indigo)" style={{ minWidth: '16px', marginTop: '2px' }} />
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              Reports automatically expire from the live map dashboard after 48 hours unless validated by community upvotes, ensuring risk ratings remain accurate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
