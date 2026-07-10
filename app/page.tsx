"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Navigation, 
  PhoneCall, 
  EyeOff, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Smartphone
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [consentGranted, setConsentGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Allow browser scroll on the landing page for shorter laptop viewports
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "auto";
    }
    return () => {
      if (typeof window !== "undefined") {
        document.body.style.overflow = "hidden";
      }
    };
  }, []);

  const onboardingSlides = [
    {
      title: "VibeRoute Navigation",
      desc: "Pathfinder routes scored dynamically using crowdsourced safety logs, unlit streetlights, and night walk parameters.",
      icon: Navigation,
      color: "text-teal-400 bg-teal-950/40 border-teal-500/20"
    },
    {
      title: "Synthesized GhostCall",
      desc: "Pre-rendered voice excuser scripts and simulated ringtones that loop locally, giving you a safe excuse to exit tense situations.",
      icon: PhoneCall,
      color: "text-amber-400 bg-amber-950/40 border-amber-500/20"
    },
    {
      title: "Stealth AuraSense",
      desc: "Keeps your screen awake, mimicking a powered-off device to stay alert without drawing attention, auto-escalating to SOS if you fall inactive.",
      icon: EyeOff,
      color: "text-rose-400 bg-rose-950/40 border-rose-500/20"
    }
  ];

  const handleLaunch = () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("safesphere_session_token", "direct-login-token-stub");
      localStorage.setItem("user_phone", "+31 6 12345678");
    }
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_20%,#0f172a_0%,#020617_80%)] text-white font-sans flex flex-col justify-between p-6 md:p-12 overflow-x-hidden">
      
      {/* Brand Header */}
      <header className="flex items-center justify-between w-full max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-lg">
            S
          </div>
          <span className="font-black text-2xl bg-gradient-to-r from-white to-teal-400 bg-clip-text text-transparent tracking-tight">
            SafeSphere
          </span>
        </div>
      </header>

      {/* Main Content Centered Layout */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto my-auto py-12 text-center">
        
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6">
          Women's Safety,<br/>
          <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">Stealth Companion</span>.
        </h1>
        
        <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-10 max-w-xl">
          SafeSphere integrates proactive navigation scoring, stealth companion modes, and local sound synthesis to offer immediate de-escalation support during high-risk walking scenarios.
        </p>

        {/* Onboarding Slides Deck */}
        <div className="w-full flex flex-col gap-4 mb-10 max-w-2xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left md:text-center">Safety System Architecture</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {onboardingSlides.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  onClick={() => setSlide(idx)}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 ${
                    slide === idx 
                      ? "bg-slate-900 border-teal-500/40 shadow-lg shadow-teal-950/20 scale-[1.02]" 
                      : "bg-slate-900/30 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`size-8 rounded-lg border flex items-center justify-center mb-3 ${item.color}`}>
                    <Icon size={16} />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">{item.desc}</p>
                </div>
              );
            })}
          </div>
          
          {/* Active Onboarding Slide Details Card */}
          <div className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-5 min-h-[80px] flex items-center gap-3 text-left">
            <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              {onboardingSlides[slide].desc}
            </p>
          </div>
        </div>

        {/* Onboarding Consent Checkbox */}
        <div className="flex items-start gap-3 bg-slate-900/40 border border-white/5 rounded-2xl p-5 mb-8 max-w-xl text-left">
          <input 
            type="checkbox" 
            id="consent" 
            checked={consentGranted}
            onChange={(e) => setConsentGranted(e.target.checked)}
            className="mt-1 size-4 rounded bg-slate-900 border-white/10 text-teal-500 focus:ring-teal-500 cursor-pointer"
          />
          <label htmlFor="consent" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
            I consent to share location data and camera permissions for live-stream evidence storage during active SOS panic alerts.
          </label>
        </div>

        {/* Launch Controls */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={handleLaunch}
            disabled={!consentGranted || loading}
            className="w-full max-w-sm flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold py-4 px-8 text-sm tracking-wide transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(20,184,166,0.25)]"
          >
            <span>{loading ? "Initializing Sandbox..." : "Launch Web Dashboard"}</span>
            <ChevronRight size={16} />
          </button>

          {/* Mobile App Status Alert Banner */}
          <div className="mt-2 px-4 py-2 bg-slate-900/40 border border-white/5 rounded-full text-[10px] text-teal-400 font-semibold tracking-wider flex items-center gap-2">
            <Smartphone size={10} className="text-teal-400" />
            <span>Currently working on mobile app once approved</span>
          </div>
        </div>
      </main>

      {/* Footer Details */}
      <footer className="w-full max-w-4xl mx-auto mt-8 flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-6 text-[10px] text-slate-500">
        <p>© 2026 SafeSphere. Personal Safety and Stealth Companion Network.</p>
        <div className="flex gap-4 mt-2 md:mt-0">
          <span>Wake Lock Active</span>
          <span>•</span>
          <span>PWA Standalone Layout</span>
        </div>
      </footer>
    </div>
  );
}