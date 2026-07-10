"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, EyeOff } from "lucide-react";

interface AuraSenseProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSOS: () => void;
}

export default function AuraSense({ isOpen, onClose, onTriggerSOS }: AuraSenseProps) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInCountdown, setCheckInCountdown] = useState(10);
  
  // Refs to prevent stale-closure bugs during dynamic unmounts & wake lock releases
  const wakeLockSentinelRef = useRef<any>(null);
  const checkInTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);

  // Handle opening and Wake Lock Sentinel binding
  useEffect(() => {
    if (isOpen) {
      setShowCheckIn(false);
      requestWakeLock();
      startCheckInLoop();
    } else {
      releaseWakeLock();
      stopCheckInTimers();
    }

    return () => {
      releaseWakeLock();
      stopCheckInTimers();
    };
  }, [isOpen]);

  const requestWakeLock = async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        const sentinel = await (navigator as any).wakeLock.request("screen");
        wakeLockSentinelRef.current = sentinel;
        console.log("AuraSense Wake Lock active: screen will stay awake.");
      }
    } catch (err) {
      console.warn("Screen Wake Lock API request blocked or rejected:", err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
        wakeLockSentinelRef.current = null;
        console.log("AuraSense Wake Lock released.");
      } catch (e) {
        console.error("Failed to release wake lock:", e);
      }
    }
  };

  const startCheckInLoop = () => {
    stopCheckInTimers();
    
    // Check-in every 20 seconds for hackathon demo speed (normally 5-10 minutes)
    checkInTimerRef.current = setInterval(() => {
      triggerCheckInAlert();
    }, 20000);
  };

  const triggerCheckInAlert = () => {
    setShowCheckIn(true);
    setCheckInCountdown(10);
    playVibrationSiren();

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    countdownIntervalRef.current = setInterval(() => {
      setCheckInCountdown((prev) => {
        if (prev <= 1) {
          handleEscalate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const playVibrationSiren = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  const handleConfirmSafety = () => {
    setShowCheckIn(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    startCheckInLoop();
  };

  const handleEscalate = () => {
    stopCheckInTimers();
    releaseWakeLock();
    setShowCheckIn(false);
    onTriggerSOS(); // Parent callback triggers SOS panel immediately
    onClose();
  };

  const stopCheckInTimers = () => {
    if (checkInTimerRef.current) clearInterval(checkInTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  // Custom double-tap handler for mobile screens
  const handleTouchEnd = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      releaseWakeLock();
      stopCheckInTimers();
      onClose();
    }
    lastTapRef.current = now;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between items-center text-center p-8 select-none cursor-pointer"
      onDoubleClick={() => {
        releaseWakeLock();
        stopCheckInTimers();
        onClose();
      }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Semi-invisible escape button for desktop testing convenience (extremely faint) */}
      {!showCheckIn && (
        <button
          onClick={() => {
            releaseWakeLock();
            stopCheckInTimers();
            onClose();
          }}
          className="absolute top-4 right-4 z-50 p-4 text-zinc-950/2 hover:text-white/20 transition-colors text-xs pointer-events-auto cursor-pointer"
          title="Exit Stealth Mode"
        >
          ✕
        </button>
      )}

      {/* Invisible/Stealth Screen layout. Phone screen looks completely off unless check-in pops up */}
      {!showCheckIn ? (
        <div className="flex flex-col items-center justify-between h-full py-12 text-zinc-900 pointer-events-none select-none">
          <div className="flex flex-col items-center gap-3">
            <EyeOff size={24} className="text-zinc-950/20" />
            <span className="text-[10px] text-zinc-950/20 uppercase tracking-widest font-semibold">
              Stealth Companion Mode Active
            </span>
          </div>
          
          <div className="text-[9px] text-zinc-950/10 max-w-xs leading-normal">
            Screen Wake Lock is active. To onlookers, this device appears powered off. Double click or tap anywhere on screen to exit.
          </div>
        </div>
      ) : (
        /* Emergency check-in alert overlays the black screen */
        <div 
          className="m-auto glass max-w-sm w-full p-8 border border-rose-500/30 bg-slate-950/95 flex flex-col items-center gap-6 shadow-2xl text-white pointer-events-auto"
          onClick={(e) => e.stopPropagation()} // Prevent click events inside the card from bubbling
        >
          <div className="size-16 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center animate-bounce">
            <Shield className="text-rose-500" size={28} />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Are you OK?</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Companion mode requires verification. Confirm safety or the system will trigger emergency alerts.
            </p>
          </div>

          <div className="text-rose-500 font-extrabold text-3xl font-mono animate-pulse">
            {checkInCountdown}s
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={handleConfirmSafety}
              className="btn btn-primary w-full py-3 bg-teal-600 hover:bg-teal-500 font-bold tracking-wide uppercase text-xs cursor-pointer"
            >
              Yes, I am safe
            </button>
            
            <button 
              onClick={handleEscalate}
              className="btn btn-secondary w-full py-2 text-rose-500 hover:text-rose-400 text-xs border-white/5 cursor-pointer"
            >
              Trigger SOS Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
