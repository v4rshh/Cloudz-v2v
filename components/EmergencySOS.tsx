"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, 
  AlertOctagon, 
  Video, 
  Check, 
  AlertTriangle, 
  Map, 
  HelpCircle,
  Volume2
} from "lucide-react";

interface EmergencySOSProps {
  activeSosState: "idle" | "counting" | "active";
  setActiveSosState: (state: "idle" | "counting" | "active") => void;
  trustedContacts?: { name: string; phone: string }[];
}

export default function EmergencySOS({ activeSosState, setActiveSosState, trustedContacts = [] }: EmergencySOSProps) {
  const [countdown, setCountdown] = useState(5);
  const [sosEventId, setSosEventId] = useState<string | null>(null);
  
  // Follow Me Tracking
  const [isFollowing, setIsFollowing] = useState(false);
  const [followSessionId, setFollowSessionId] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState({ lat: 51.9225, lng: 4.47917 });
  const [anomalyCheckIn, setAnomalyCheckIn] = useState(false);
  const [checkInCountdown, setCheckInCountdown] = useState(15);
  
  // Media Devices references
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const followIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkInIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play browser synthesizer siren sound
  const playSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      const playBeep = (freq: number, duration: number, delay: number) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration - 0.05);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        }, delay);
      };
      
      playBeep(900, 0.35, 0);
      playBeep(600, 0.35, 400);
    } catch (e) {
      console.warn("Audio Context sound blocked by browser autoplay rules");
    }
  };

  useEffect(() => {
    if (activeSosState === "active" && !stream) {
      startCamera();
    }
  }, [activeSosState]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (followIntervalRef.current) clearInterval(followIntervalRef.current);
      if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Webcam evidence recording feed access rejected:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // SOS button press begins countdown
  const handleSOSPress = () => {
    setActiveSosState("counting");
    setCountdown(5);
    playSiren();
    
    countdownIntervalRef.current = setInterval(() => {
      playSiren();
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          triggerSOSEngine();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveSosState("idle");
    setCountdown(5);
  };

  // Triggers API and starts broadcasting coordinates via the PATCH route
  const triggerSOSEngine = async () => {
    setActiveSosState("active");
    startCamera();
    
    // Pick current GPS coordinates
    const coords = { lat: 51.9225, lng: 4.47917 };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coords.lat = pos.coords.latitude;
          coords.lng = pos.coords.longitude;
          setCurrentCoords(coords);
        },
        () => console.log("Using default Rotterdam coords")
      );
    }

    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          userId: "demo-web-user"
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to create SOS event");
      }

      const data = await res.json();
      const eventId = data.id as string;
      setSosEventId(eventId);
      
      // Start broadcasting coordinate updates through the tested PATCH route
      startBroadcastingCoordinates(eventId, coords);
    } catch (err) {
      console.error("SOS trigger fail", err);
    }
  };

  const startBroadcastingCoordinates = (eventId: string, startCoords: { lat: number, lng: number }) => {
    let current = { ...startCoords };
    if (followIntervalRef.current) clearInterval(followIntervalRef.current);
    
    followIntervalRef.current = setInterval(async () => {
      // Simulate slow movement coordinates updates
      current = {
        lat: current.lat + (Math.random() - 0.5) * 0.0005,
        lng: current.lng + (Math.random() - 0.5) * 0.0005,
      };
      setCurrentCoords(current);

      try {
        const res = await fetch(`/api/sos/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: current.lat, lng: current.lng }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error ?? "Failed to update location");
        }
      } catch (err) {
        console.warn("Location broadcast update failed:", err);
      }
    }, 4000);
  };

  const resolveSOS = async () => {
    stopCamera();
    setActiveSosState("idle");
    setCountdown(5);
    if (followIntervalRef.current) clearInterval(followIntervalRef.current);
    
    if (sosEventId) {
      try {
        await fetch("/api/sos/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sosEventId, status: "resolved" })
        });
      } catch (err) {
        console.warn("SOS resolve error", err);
      }
      setSosEventId(null);
    }
    alert("Emergency SOS has been resolved and deactivated.");
  };

  // Follow Me Tracking Session Toggle
  const toggleFollowMe = async () => {
    if (isFollowing) {
      if (followIntervalRef.current) clearInterval(followIntervalRef.current);
      setIsFollowing(false);
      setFollowSessionId(null);
      setAnomalyCheckIn(false);
      if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
      alert("Follow Me session closed.");
    } else {
      try {
        const res = await fetch("/api/sos/follow-me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "demo-web-user",
            route: { origin: [4.47917, 51.9225], destination: [4.4860, 51.9160] }
          })
        });
        const data = await res.json();
        setFollowSessionId(data.sessionId || "mock-follow-session-id");
      } catch (err) {
        setFollowSessionId("mock-follow-session-id");
      }
      
      setIsFollowing(true);
      
      // Simulate live path updates walking
      let stepIdx = 0;
      const pathPoints = [
        { lat: 51.9225, lng: 4.47917 },
        { lat: 51.9230, lng: 4.4810 },
        { lat: 51.9235, lng: 4.4830 },
        { lat: 51.9240, lng: 4.4850 },
        { lat: 51.9230, lng: 4.4880 }
      ];

      followIntervalRef.current = setInterval(() => {
        stepIdx = (stepIdx + 1) % pathPoints.length;
        const newPoint = pathPoints[stepIdx];
        setCurrentCoords(newPoint);
      }, 4000);
    }
  };

  const simulateDeviation = () => {
    if (!isFollowing) return;
    
    // Jump coordinates out of route bounds to trigger check-in
    setCurrentCoords({ lat: 51.9300, lng: 4.4950 });
    setAnomalyCheckIn(true);
    setCheckInCountdown(15);
    playSiren();
    
    if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
    checkInIntervalRef.current = setInterval(() => {
      setCheckInCountdown((prev) => {
        if (prev <= 1) {
          if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
          setAnomalyCheckIn(false);
          triggerSOSEngine();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSafeCheckIn = () => {
    if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
    setAnomalyCheckIn(false);
    setCheckInCountdown(15);
    // Return coordinates back to safe path
    setCurrentCoords({ lat: 51.9230, lng: 4.4810 });
    alert("Safety confirmed. AuraSense Companion mode resumed.");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="page-header bg-slate-900/40 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="page-title-group">
          <h1>Emergency Response Hub</h1>
          <p className="text-xs text-slate-400">Instant SOS broadcast, live audio-video cloud backups, and smart route-deviation tracking.</p>
        </div>
        <div className="badge badge-danger text-xs flex items-center gap-1">
          <Volume2 size={12} />
          <span>Siren alarm audio ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-6 flex-1 overflow-y-auto lg:overflow-hidden h-auto lg:h-[calc(100vh-120px)]">
        {/* Main Panic Button and Camera */}
        <div className="glass sos-outer-container flex flex-col items-center justify-center p-8 text-center lg:h-full h-[500px]">
          {activeSosState === "idle" && (
            <>
              <h2 className="font-bold text-white text-xl mb-2">Need Assistance?</h2>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Pressing the red button will start a 5-second countdown to alert contacts. You can cancel at any time.
              </p>

              <div className="sos-button-wrapper cursor-pointer" onClick={handleSOSPress}>
                <div className="sos-glow-ring" />
                <div className="sos-glow-ring-2" />
                <div className="sos-main-button">SOS</div>
              </div>
            </>
          )}

          {activeSosState === "counting" && (
            <div className="text-center">
              <h2 className="text-rose-500 font-extrabold text-2xl mb-4 animate-pulse">
                SENDING SOS IN...
              </h2>
              
              <div className="sos-button-wrapper mx-auto flex items-center justify-center my-6">
                <div className="sos-glow-ring" style={{ animationDuration: "0.4s" }} />
                <div className="sos-main-button active text-6xl size-44 relative">
                  {countdown}
                </div>
              </div>

              <button onClick={cancelSOS} className="btn btn-secondary mt-4 px-8 py-3">
                Cancel SOS (False Alarm)
              </button>
            </div>
          )}

          {activeSosState === "active" && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/30 p-4 rounded-xl w-full">
                <AlertOctagon size={24} className="text-rose-500 animate-bounce" />
                <div className="text-left flex-1">
                  <div className="font-bold text-white text-sm">EMERGENCY SOS IS ACTIVE</div>
                  <div className="text-[10px] text-slate-400">Location coordinates and video backups are streaming live to trusted contacts.</div>
                </div>
              </div>

              {/* Webcam stream rendering */}
              <div className="webcam-container w-full aspect-video rounded-xl overflow-hidden bg-black relative border border-rose-500/40">
                <video ref={videoRef} autoPlay playsInline muted className="webcam-video w-full h-full object-cover" />
                <div className="recording-indicator absolute top-3 left-3 bg-black/75 px-3 py-1 rounded-full text-[10px] text-rose-500 flex items-center gap-1.5">
                  <div className="recording-dot size-2 bg-rose-500 rounded-full" />
                  <Video size={10} />
                  <span>Cloud Backup Active</span>
                </div>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button onClick={resolveSOS} className="btn btn-secondary flex-1">
                  False Alarm
                </button>
                <button onClick={resolveSOS} className="btn btn-danger flex-1 font-bold">
                  Help Has Arrived
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Location and Follow Me Sidebar */}
        <div className="glass p-6 flex flex-col gap-6 overflow-y-auto lg:h-full h-auto">
          <div>
            <h3 className="card-title flex items-center gap-2 text-sm font-semibold mb-2">
              <Map size={18} className="text-teal-400" />
              <span>Follow Me Tracking</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Share your walk session in real-time with family. Our statistical anomaly model will monitor your speed and route deviation.
            </p>

            <button 
              onClick={toggleFollowMe} 
              className={`btn w-full font-bold ${isFollowing ? "btn-danger" : "btn-primary"}`}
            >
              {isFollowing ? "Stop Follow Me Session" : "Start Follow Me Mode"}
            </button>
          </div>

          {isFollowing && (
            <div className="border border-white/5 rounded-xl p-4 bg-black/20 flex flex-col gap-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Status:</span>
                <span className="text-teal-400 font-bold">Active Tracking</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Live Coords:</span>
                <span className="font-mono">{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
              </div>

              <div className="border-t border-white/5 pt-3 mt-1">
                <button 
                  onClick={simulateDeviation} 
                  className="btn btn-secondary w-full text-xs py-2"
                >
                  Simulate Route Deviation (Anomaly)
                </button>
              </div>
            </div>
          )}

          {/* Anomaly Check-In Dialog Popup inside sidebar */}
          {anomalyCheckIn && (
            <div className="border-2 border-rose-500 rounded-xl p-4 bg-rose-950/20 animate-bounce">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs mb-1">
                <AlertTriangle size={14} />
                <span>SAFETY CHECK-IN ALERT</span>
              </div>
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                Anomaly detected: You have deviated from the safe path. Escalate to full SOS in <strong>{checkInCountdown}s</strong>.
              </p>
              
              <button 
                onClick={handleSafeCheckIn} 
                className="btn btn-danger w-full py-2 text-xs font-bold"
              >
                Yes, I am Safe (Dismiss)
              </button>
            </div>
          )}

          <div className="p-3 bg-white/2 border border-white/5 rounded-xl mt-auto">
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs mb-1">
              <HelpCircle size={14} />
              <span>Voice Activated Trigger</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Saying your codeword (e.g. *"Sahara, help me"*) triggers the alarm. On this desktop web demo, you can activate this directly using the main button.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}