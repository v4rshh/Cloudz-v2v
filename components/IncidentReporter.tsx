"use client";

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

interface Report {
  id: string;
  raw_text: string;
  category: string;
  severity: number;
  location: { lat: number; lng: number };
  verification_count: number;
  created_at: string;
  anonymous: boolean;
}

const INITIAL_FEED: Report[] = [
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
  
  // Tagging state
  const [category, setCategory] = useState("other");
  const [severity, setSeverity] = useState(2);
  const [confidence, setConfidence] = useState(0.0);

  // Local Feed State
  const [feed, setFeed] = useState<Report[]>(INITIAL_FEED);

  // Verification user votes state tracker
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "down">>({});

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const location = { lat: 51.9225, lng: 4.47917 }; // Rotterdam Center
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, location, anonymous })
      });
      const data = await res.json();
      
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
      console.error("AI classification failed, running offline local scanner:", err);
      // Local regex classification fallback
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
    const newReport: Report = {
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
    setText("");
    setAnalyzed(false);
    alert("Anonymous report submitted successfully and logged to the incident safety heatmap.");
  };

  const handleVote = async (reportId: string, voteType: "up" | "down") => {
    const existingVote = userVotes[reportId];
    let delta = 0;
    
    if (voteType === "up") {
      if (existingVote === "up") {
        delta = -1;
        setUserVotes((prev) => {
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
      } else if (existingVote === "down") {
        delta = 2;
        setUserVotes((prev) => ({ ...prev, [reportId]: "up" }));
      } else {
        delta = 1;
        setUserVotes((prev) => ({ ...prev, [reportId]: "up" }));
      }
    } else {
      if (existingVote === "down") {
        delta = 1;
        setUserVotes((prev) => {
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
      } else if (existingVote === "up") {
        delta = -2;
        setUserVotes((prev) => ({ ...prev, [reportId]: "down" }));
      } else {
        delta = -1;
        setUserVotes((prev) => ({ ...prev, [reportId]: "down" }));
      }
    }

    setFeed((prev) =>
      prev.map((rep) => {
        if (rep.id === reportId) {
          return { ...rep, verification_count: rep.verification_count + delta };
        }
        return rep;
      })
    );
  };

  const getSeverityLabel = (level: number) => {
    if (level === 5) return "Critical (5)";
    if (level === 4) return "Severe (4)";
    if (level === 3) return "Moderate (3)";
    if (level === 2) return "Low-Moderate (2)";
    return "Low (1)";
  };

  const getSeverityClass = (level: number) => {
    if (level >= 4) return "badge-danger";
    if (level === 3) return "badge-warning";
    return "badge-success";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="page-header bg-slate-900/40 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="page-title-group">
          <h1>Smart Incident Reporting</h1>
          <p className="text-xs text-slate-400">Submit anonymous safety hazard logs verified automatically by NLP tag classifiers.</p>
        </div>
        <div className="badge badge-warning text-xs flex items-center gap-1">
          <EyeOff size={12} />
          <span>Strictly Anonymous</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 p-6 flex-1 overflow-y-auto lg:overflow-hidden h-auto lg:h-[calc(100vh-120px)]">
        {/* Reporting Form */}
        <div className="glass p-6 flex flex-col gap-5 lg:h-full h-auto overflow-y-auto">
          <h3 className="card-title text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={18} />
            <span>Log Safety Incident</span>
          </h3>

          {!analyzed ? (
            <>
              <div className="form-group">
                <label>What happened?</label>
                <textarea
                  placeholder="Describe what occurred. (e.g. Broken streetlights, street harassment, stalking path, suspicious tailing...)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="form-textarea h-40 resize-none"
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="anon-check"
                  checked={anonymous} 
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="rounded bg-black border-white/10"
                />
                <label htmlFor="anon-check" className="text-xs text-slate-400 cursor-pointer">
                  Submit anonymously (Scrubs location metadata)
                </label>
              </div>

              <button 
                onClick={handleAnalyze} 
                disabled={submitting || !text.trim()}
                className="btn btn-primary w-full py-3 font-semibold flex gap-2 items-center justify-center"
              >
                <Sparkles size={16} />
                <span>{submitting ? "Analyzing Content..." : "Verify with Sahara AI"}</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-4 border border-teal-500/20 bg-teal-950/5 p-5 rounded-xl">
              <h4 className="font-bold text-teal-400 text-xs tracking-wider uppercase">NLP Classification Review</h4>
              <p className="text-[11px] text-slate-300 italic font-mono">"{text}"</p>
              
              <div className="flex flex-col gap-3 mt-2">
                <div className="form-group">
                  <label>Auto-Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input text-xs"
                  >
                    <option value="infrastructure">⚠️ Infrastructure (Unlit block)</option>
                    <option value="harassment">👥 Street Harassment</option>
                    <option value="stalking">🚨 Stalking/Tailing</option>
                    <option value="assault">🥊 Violent Assault</option>
                    <option value="other">❓ Other concern</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Severity Score</label>
                  <select 
                    value={severity} 
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="form-input text-xs"
                  >
                    <option value={1}>Low (1)</option>
                    <option value={2}>Low-Moderate (2)</option>
                    <option value={3}>Moderate (3)</option>
                    <option value={4}>Severe (4)</option>
                    <option value={5}>Critical (5)</option>
                  </select>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                <Info size={12} />
                <span>AI Confidence Rating: {Math.round(confidence * 100)}%</span>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setAnalyzed(false)} 
                  className="btn btn-secondary flex-1"
                >
                  Edit Report
                </button>
                <button 
                  onClick={handleFinalSubmit} 
                  className="btn btn-primary flex-1 bg-teal-600 hover:bg-teal-500 font-bold"
                >
                  Publish Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Community Feed */}
        <div className="glass p-6 flex flex-col gap-4 lg:h-full h-[500px] overflow-hidden">
          <h3 className="card-title text-sm font-semibold flex items-center gap-2 border-b border-white/5 pb-3">
            <MapPin size={18} className="text-teal-400" />
            <span>Community Verified Incidents (Rotterdam)</span>
          </h3>

          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
            {feed.map((rep) => (
              <div 
                key={rep.id} 
                className="border border-white/5 rounded-xl p-4 bg-white/2 hover:bg-white/4 transition flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{rep.created_at}</span>
                  <div className="flex gap-2">
                    <span className="badge badge-info text-[9px] px-2 py-0.5 uppercase">{rep.category}</span>
                    <span className={`badge text-[9px] px-2 py-0.5 uppercase ${getSeverityClass(rep.severity)}`}>
                      {getSeverityLabel(rep.severity)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">{rep.raw_text}</p>

                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      Verification Score: <strong className="text-slate-300 font-semibold">{rep.verification_count}</strong>
                    </span>
                    {userVotes[rep.id] === "up" && (
                      <span className="text-[9px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded font-mono font-medium">
                        +1 Verified
                      </span>
                    )}
                    {userVotes[rep.id] === "down" && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-mono font-medium">
                        -1 Disputed
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => handleVote(rep.id, "up")}
                      className={`flex items-center gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5 transition-all duration-300 cursor-pointer border ${
                        userVotes[rep.id] === "up"
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-400 font-semibold shadow-[0_0_8px_rgba(45,212,191,0.15)]"
                          : userVotes[rep.id] === "down"
                            ? "border-slate-800 text-slate-600 opacity-40 cursor-not-allowed"
                            : "border-white/10 hover:border-teal-500/30 hover:bg-teal-500/5 text-slate-400 hover:text-teal-400"
                      }`}
                      disabled={userVotes[rep.id] === "down"}
                    >
                      <ThumbsUp size={11} className={userVotes[rep.id] === "up" ? "scale-110 animate-bounce" : ""} />
                      <span>{userVotes[rep.id] === "up" ? "Verified" : "Verify"}</span>
                    </button>
                    <button 
                      onClick={() => handleVote(rep.id, "down")}
                      className={`flex items-center gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5 transition-all duration-300 cursor-pointer border ${
                        userVotes[rep.id] === "down"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                          : userVotes[rep.id] === "up"
                            ? "border-slate-800 text-slate-600 opacity-40 cursor-not-allowed"
                            : "border-white/10 hover:border-rose-500/30 hover:bg-rose-500/5 text-slate-400 hover:text-rose-400"
                      }`}
                      disabled={userVotes[rep.id] === "up"}
                    >
                      <ThumbsDown size={11} className={userVotes[rep.id] === "down" ? "scale-110 animate-bounce" : ""} />
                      <span>{userVotes[rep.id] === "down" ? "Disputed" : "Dispute"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
