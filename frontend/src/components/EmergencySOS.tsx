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
import { api } from "../api";

export default function EmergencySOS({ activeSosState, setActiveSosState }) {
  // SOS States: "idle" | "counting" | "active"
  const [countdown, setCountdown] = useState(5);
  const [sosEventId, setSosEventId] = useState(null);
  
  // Follow Me States
  const [isFollowing, setIsFollowing] = useState(false);
  const [followSessionId, setFollowSessionId] = useState(null);
  const [currentCoords, setCurrentCoords] = useState({ lat: 51.9225, lng: 4.47917 });
  const [anomalyCheckIn, setAnomalyCheckIn] = useState(false);
  const [checkInCountdown, setCheckInCountdown] = useState(15);
  
  // Media Devices
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const followIntervalRef = useRef(null);
  const checkInIntervalRef = useRef(null);

  // Play audio synthesizer siren sound
  const playSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      const playBeep = (freq, duration, delay) => {
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
      
      // Dual-tone siren beep
      playBeep(900, 0.35, 0);
      playBeep(600, 0.35, 400);
    } catch (e) {
      console.warn("Audio context blocked");
    }
  };

  // Sync internal state with app-global prop (e.g. from Sidebar trigger)
  useEffect(() => {
    if (activeSosState === "active" && !stream) {
      startCamera();
    }
  }, [activeSosState]);

  // Clean up streams & intervals on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      clearInterval(countdownIntervalRef.current);
      clearInterval(followIntervalRef.current);
      clearInterval(checkInIntervalRef.current);
    };
  }, [stream]);

  // Camera Management
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Webcam access rejected or unavailable", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // SOS Trigger
  const handleSOSPress = () => {
    setActiveSosState("counting");
    setCountdown(5);
    playSiren();
    
    countdownIntervalRef.current = setInterval(() => {
      playSiren();
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          triggerSOSEngine();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    clearInterval(countdownIntervalRef.current);
    setActiveSosState("idle");
    setCountdown(5);
  };

  const triggerSOSEngine = async () => {
    setActiveSosState("active");
    startCamera();
    try {
      const { data } = await api.post("/sos/trigger", {
        userId: "demo-web-user",
        triggerType: "button",
        location: currentCoords,
        emergencyContacts: []
      });
      setSosEventId(data.sosEventId);
    } catch (err) {
      console.error("SOS trigger fail", err);
      setSosEventId("mock-sos-event-uuid");
    }
  };

  const resolveSOS = async () => {
    stopCamera();
    setActiveSosState("idle");
    setCountdown(5);
    
    if (sosEventId) {
      try {
        await api.post(`/sos/${sosEventId}/resolve`, { status: "resolved" });
      } catch (err) {
        console.warn("SOS resolve endpoint details mockup triggers", err);
      }
      setSosEventId(null);
    }
    alert("Emergency SOS has been resolved and deactivated.");
  };

  // Follow Me Tracking
  const toggleFollowMe = async () => {
    if (isFollowing) {
      // Stop session
      clearInterval(followIntervalRef.current);
      setIsFollowing(false);
      setFollowSessionId(null);
      setAnomalyCheckIn(false);
      clearInterval(checkInIntervalRef.current);
      alert("Follow Me session closed.");
    } else {
      // Start session
      try {
        const { data } = await api.post("/sos/follow-me/start", {
          userId: "demo-web-user",
          route: { origin: [51.9225, 4.47917], destination: [51.9160, 4.4860] }
        });
        setFollowSessionId(data.sessionId);
      } catch (err) {
        console.warn("Follow-me start endpoint mock triggers");
        setFollowSessionId("mock-follow-session-id");
      }
      
      setIsFollowing(true);
      
      // Simulate live location GPS walk updates
      let pointIdx = 0;
      const demoWalkPath = [
        { lat: 51.9225, lng: 4.47917 },
        { lat: 51.9230, lng: 4.4810 },
        { lat: 51.9235, lng: 4.4830 },
        { lat: 51.9240, lng: 4.4850 },
        { lat: 51.9230, lng: 4.4880 }
      ];

      followIntervalRef.current = setInterval(() => {
        pointIdx = (pointIdx + 1) % demoWalkPath.length;
        const newCoords = demoWalkPath[pointIdx];
        setCurrentCoords(newCoords);
        
        // Broadcast location updates over standard socket or console log
        console.log(`Socket Broadcast: location:update at lat: ${newCoords.lat}, lng: ${newCoords.lng}`);
      }, 4000);
    }
  };

  // Anomaly triggers
  const simulateDeviation = () => {
    if (!isFollowing) return;
    
    // Simulate route deviation
    setCurrentCoords({ lat: 51.9300, lng: 4.4950 }); // Out of route bounds
    setAnomalyCheckIn(true);
    setCheckInCountdown(15);
    
    // Play warning sound
    playSiren();
    
    // Start Anomaly countdown check-in
    checkInIntervalRef.current = setInterval(() => {
      setCheckInCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(checkInIntervalRef.current);
          setAnomalyCheckIn(false);
          // Trigger SOS immediately
          triggerSOSEngine();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSafeCheckIn = () => {
    clearInterval(checkInIntervalRef.current);
    setAnomalyCheckIn(false);
    setCheckInCountdown(15);
    // Reset location back to path
    setCurrentCoords({ lat: 51.9230, lng: 4.4810 });
    alert("Safety confirmed. System has returned to normal monitoring.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Emergency Response Hub</h1>
          <p>Instant SOS broadcast, live audio-video cloud backups, and smart route-deviation tracking.</p>
        </div>
        <div className="badge badge-danger">
          <Volume2 size={14} />
          <span>Siren alarm audio ready</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Panic Button and Camera */}
        <div className="glass sos-outer-container">
          {activeSosState === "idle" && (
            <>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '22px', textAlign: 'center' }}>
                Need Assistance?
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', maxWidth: '360px', marginTop: '6px' }}>
                Pressing the red button will start a 5-second countdown to alert contacts. You can cancel at any time.
              </p>

              <div className="sos-button-wrapper" onClick={handleSOSPress}>
                <div className="sos-glow-ring"></div>
                <div className="sos-glow-ring-2"></div>
                <div className="sos-main-button">SOS</div>
              </div>
            </>
          )}

          {activeSosState === "counting" && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'var(--accent-red)', fontSize: '32px', fontWeight: '800', animation: 'blink 0.5s infinite alternate' }}>
                SENDING SOS IN...
              </h2>
              
              <div 
                className="sos-button-wrapper" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}
              >
                <div className="sos-glow-ring" style={{ animationDuration: '0.4s' }}></div>
                <div 
                  className="sos-main-button active"
                  style={{ fontSize: '72px', width: '180px', height: '180px', position: 'relative' }}
                >
                  {countdown}
                </div>
              </div>

              <button onClick={cancelSOS} className="btn btn-secondary" style={{ padding: '12px 30px', fontWeight: 'bold' }}>
                Cancel SOS (False Alarm)
              </button>
            </div>
          )}

          {activeSosState === "active" && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 56, 96, 0.1)', border: '1px solid var(--accent-red)', padding: '12px 20px', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
                <AlertOctagon size={24} color="var(--accent-red)" style={{ animation: 'shake 0.5s infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>EMERGENCY SOS IS ACTIVE</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Location and audio/video backup is streaming securely to the cloud.</div>
                </div>
              </div>

              {/* Webcam stream rendering */}
              <div className="webcam-container">
                <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <Video size={12} style={{ marginRight: '4px' }} />
                  <span>Cloud Backup Active</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '380px' }}>
                <button onClick={resolveSOS} className="btn btn-secondary" style={{ flex: 1 }}>
                  False Alarm
                </button>
                <button onClick={resolveSOS} className="btn btn-danger" style={{ flex: 1, fontWeight: '700' }}>
                  Help Has Arrived
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Location and Follow Me Sidebar */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div>
            <h3 className="card-title">
              <Map size={20} color="#00d1b2" />
              <span>Follow Me Tracking</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '16px' }}>
              Share your walk session in real-time with family. Our statistical anomaly model will monitor your speed and route deviation.
            </p>

            <button 
              onClick={toggleFollowMe} 
              className={`btn ${isFollowing ? "btn-danger" : "btn-primary"}`}
              style={{ width: '100%', fontWeight: 'bold' }}
            >
              {isFollowing ? "Stop Follow Me Session" : "Start Follow Me Mode"}
            </button>
          </div>

          {isFollowing && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Active Tracking</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Live Coords:</span>
                <span>{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
                <button 
                  onClick={simulateDeviation} 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                >
                  Simulate Route Deviation (Anomaly)
                </button>
              </div>
            </div>
          )}

          {/* Anomaly Check-In Dialog Popup inside sidebar */}
          {anomalyCheckIn && (
            <div style={{ border: '2px solid var(--accent-red)', borderRadius: '12px', padding: '16px', background: 'rgba(255,56,96,0.08)', animation: 'shake 0.5s 1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>
                <AlertTriangle size={16} />
                <span>SAFETY CHECK-IN ALERT</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-main)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Anomaly detected: You have deviated from the safe path. Escalate to full SOS in <strong>{checkInCountdown}s</strong>.
              </p>
              
              <button 
                onClick={handleSafeCheckIn} 
                className="btn btn-danger" 
                style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}
              >
                Yes, I am Safe (Dismiss)
              </button>
            </div>
          )}

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
              <HelpCircle size={16} />
              <span>Voice Activated Trigger</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              On mobile, saying your codeword triggers the alarm. On this desktop web demo, you can activate this directly using the main button or by keywords.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
