"use client";

import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, Grid, Volume2, Plus, Video, User } from "lucide-react";

interface GhostCallProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GhostCall({ isOpen, onClose }: GhostCallProps) {
  // Call States: "incoming" | "connected" | "ended"
  const [callState, setCallState] = useState<"incoming" | "connected" | "ended">("incoming");
  const [seconds, setSeconds] = useState(0);
  const [dialogueLine, setDialogueLine] = useState<string>(
    "Hey! Where are you? I'm walking near the main street right now, I will meet you in two minutes. Just stay on the line, I am right around the corner."
  );
  
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCallState("incoming");
      setSeconds(0);
      playRingtoneLoop();
      void fetchDialogue();
    } else {
      stopRingtone();
      cancelSpeech();
    }
    return () => {
      stopRingtone();
      cancelSpeech();
    };
  }, [isOpen]);

  const fetchDialogue = async () => {
    try {
      const situations = [
        "walking down a dark unlit corridor",
        "suspicious person tailing on street corner",
        "alone waiting at a quiet transit stop",
        "uncomfortable group standing outside entrance"
      ];
      const randomSituation = situations[Math.floor(Math.random() * situations.length)];

      const res = await fetch("/api/ghostcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: randomSituation })
      });
      const data = await res.json();
      if (data.dialogue) {
        setDialogueLine(data.dialogue);
      }
    } catch (err) {
      console.warn("Failed to load dynamic call dialogue:", err);
    }
  };

  const cancelSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Connect duration counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === "connected") {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const playRingtoneLoop = () => {
    stopRingtone();
    
    const playTone = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, ctx.currentTime); // Standard phone ring frequencies
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      } catch (e) {
        console.warn("Audio Context blocked by browser permission gates");
      }
    };

    // Play first tone instantly
    playTone();
    // Loop ringtone every 3 seconds
    ringtoneIntervalRef.current = setInterval(playTone, 3000);
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const handleAnswer = () => {
    stopRingtone();
    setCallState("connected");
    
    // Simulate real nearby companion voice over the speaker using SpeechSynthesis (Text-to-Speech)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const speech = new SpeechSynthesisUtterance(dialogueLine);
        speech.rate = 0.95; // Slightly slower, more natural pace
        speech.pitch = 1.0;
        window.speechSynthesis.speak(speech);
      }, 800);
    }
  };

  const handleDecline = () => {
    stopRingtone();
    cancelSpeech();
    setCallState("ended");
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col justify-between items-center p-12 text-white font-sans">
      {/* Top Details */}
      <div className="text-center mt-12 flex flex-col items-center">
        <div className="size-28 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 mb-6 shadow-2xl">
          <User size={48} className="text-slate-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dad ❤️</h1>
        <p className="text-sm text-slate-400 font-medium">
          {callState === "incoming" ? "SafeSphere Simulated Call..." : callState === "connected" ? "Connected" : "Call Ended"}
        </p>
        {callState === "connected" && (
          <p className="text-lg font-mono font-semibold text-teal-400 mt-2">{formatTime(seconds)}</p>
        )}
      </div>

      {/* Call Active Dial Controls Mock */}
      {callState === "connected" && (
        <div className="grid grid-cols-3 gap-6 max-w-xs w-full mb-12">
          {[
            { label: "Mute", icon: Mic },
            { label: "Keypad", icon: Grid },
            { label: "Speaker", icon: Volume2 },
            { label: "Add Call", icon: Plus },
            { label: "FaceTime", icon: Video },
            { label: "Contacts", icon: User },
          ].map((ctrl, i) => {
            const Icon = ctrl.icon;
            return (
              <div key={i} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="size-16 rounded-full bg-white/5 border border-white/5 group-hover:bg-white/10 transition flex items-center justify-center">
                  <Icon size={22} className="text-slate-300" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{ctrl.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline / Answer Buttons */}
      <div className="flex gap-16 justify-center items-center mb-16 w-full max-w-sm">
        {callState === "incoming" && (
          <>
            {/* Decline */}
            <div className="flex flex-col items-center gap-3 cursor-pointer group" onClick={handleDecline}>
              <div className="size-20 rounded-full bg-red-600 hover:bg-red-500 transition flex items-center justify-center shadow-lg shadow-red-900/50">
                <PhoneOff size={28} className="text-white" />
              </div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Decline</span>
            </div>
            
            {/* Answer */}
            <div className="flex flex-col items-center gap-3 cursor-pointer group" onClick={handleAnswer}>
              <div className="size-20 rounded-full bg-emerald-600 hover:bg-emerald-500 transition flex items-center justify-center shadow-lg shadow-emerald-900/50 animate-bounce">
                <Phone size={28} className="text-white" />
              </div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Answer</span>
            </div>
          </>
        )}

        {(callState === "connected" || callState === "ended") && (
          <div className="flex flex-col items-center gap-3 cursor-pointer group" onClick={handleDecline}>
            <div className="size-20 rounded-full bg-red-600 hover:bg-red-500 transition flex items-center justify-center shadow-lg shadow-red-900/50">
              <PhoneOff size={28} className="text-white" />
            </div>
            <span className="text-xs text-slate-400 font-semibold uppercase">End Call</span>
          </div>
        )}
      </div>
    </div>
  );
}
