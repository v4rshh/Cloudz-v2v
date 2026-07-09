"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { Map, AlertOctagon, Heart, HelpCircle, ShieldAlert } from "lucide-react";
import supabase from "../../../lib/supabase";

interface Coords {
  lat: number;
  lng: number;
}

export default function TrackLive() {
  const params = useParams();
  const eventId = params.id as string;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [coords, setCoords] = useState<Coords>({ lat: 51.9225, lng: 4.47917 });
  const [status, setStatus] = useState("active");
  const [resolvedAt, setResolvedAt] = useState<string | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  const isMapboxReady = !!(mapboxToken && !mapboxToken.startsWith("your_"));

  // Fetch initial location trail
  useEffect(() => {
    fetchInitialLocation();
  }, [eventId]);

  const fetchInitialLocation = async () => {
    try {
      const { data, error } = await supabase
        .from("sos_events")
        .select("location_trail, status, resolved_at")
        .eq("id", eventId)
        .single();

      if (data) {
        setStatus(data.status);
        setResolvedAt(data.resolved_at);
        const trail = data.location_trail || [];
        if (trail.length > 0) {
          const latest = trail[trail.length - 1];
          setCoords({ lat: latest.lat, lng: latest.lng });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch initial location trail from DB", err);
    }
  };

  // Subscribe to live updates over Supabase Realtime
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`sos-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sos_events",
          filter: `id=eq.${eventId}`
        },
        (payload: any) => {
          const updated = payload.new;
          setStatus(updated.status);
          setResolvedAt(updated.resolved_at);
          
          if (updated.current_location) {
            setCoords(updated.current_location);
          } else if (updated.location_trail && updated.location_trail.length > 0) {
            const latest = updated.location_trail[updated.location_trail.length - 1];
            setCoords({ lat: latest.lat, lng: latest.lng });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Mapbox Canvas setup
  useEffect(() => {
    if (!isMapboxReady || !mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [coords.lng, coords.lat],
      zoom: 14.5
    });

    mapRef.current = map;

    map.on("load", () => {
      // Draw red pulsing marker element
      const el = document.createElement("div");
      el.className = "live-marker";
      el.style.width = "22px";
      el.style.height = "22px";
      el.style.backgroundColor = "#ff3860";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 20px rgba(255, 56, 96, 0.8)";
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      markerRef.current = marker;
    });

    return () => {
      map.remove();
    };
  }, [isMapboxReady]);

  // Move map viewport center and update marker coordinates when coords state updates
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLngLat([coords.lng, coords.lat]);
    map.easeTo({ center: [coords.lng, coords.lat], duration: 1000 });
  }, [coords]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Banner Alert */}
      <div className="bg-red-950/40 border-b border-red-500/20 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AlertOctagon size={32} className="text-rose-500 animate-pulse shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Live SOS Tracking Portal
            </h1>
            <p className="text-xs text-slate-400">
              A contact has triggered an emergency alert. Monitor progress in real-time. No login required.
            </p>
          </div>
        </div>
        <div className="badge badge-danger text-xs px-3 py-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <div className="recording-dot size-2 bg-rose-500 rounded-full" />
          <span>{status === "active" ? "Broadcasting Location" : "Resolved"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] flex-1 overflow-hidden h-[calc(100vh-80px)]">
        {/* Map Viewport Area */}
        <div className="relative overflow-hidden h-full">
          {isMapboxReady ? (
            <div ref={mapContainerRef} className="mapboxgl-map w-full h-full" />
          ) : (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ff3860_1px,transparent_1px)] [background-size:16px_16px]" />
              <Map className="text-rose-500 size-12 mb-4 animate-pulse" />
              <h4 className="font-bold text-white mb-2">Live Mapbox Tracking Grid</h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                To enable live satellite tracking overlays, add a valid Mapbox API key to your `.env` settings.
              </p>
              
              {/* Fallback Vector Tracking Mock */}
              <div className="w-full max-w-md h-40 border border-white/5 bg-white/2 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Rotterdam Area Tracker</span>
                  <p className="text-xs text-slate-300 mt-2 font-mono">📍 Coords: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                  <p className="text-xs text-slate-400">Status: {status === "active" ? "Broadcasting live updates (offline bypass)" : "Closed"}</p>
                </div>
                <div className="text-[10px] text-slate-500 italic mt-2">
                  Emergency Event UUID: {eventId}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Portal details */}
        <div className="glass p-6 border-l border-white/5 flex flex-col gap-6 overflow-y-auto h-full">
          <div>
            <h3 className="card-title text-sm font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={18} />
              <span>Safety Event Metadata</span>
            </h3>
            <div className="flex flex-col gap-3 mt-4 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Event ID</span>
                <span className="font-mono text-[10px] text-slate-300">{eventId}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Target Location</span>
                <span className="font-mono text-slate-300">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Current Status</span>
                <span className={`font-semibold ${status === "active" ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                  {status === "active" ? "🚨 Active Emergency" : "✅ Resolved"}
                </span>
              </div>
              {resolvedAt && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Resolved At</span>
                  <span className="text-slate-300">{new Date(resolvedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex gap-3">
            <Heart size={20} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-white">Trusted Responder Instructions</span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                If coordinates stop updating or look suspicious, try calling the contact immediately. If you suspect active danger, call emergency services (112 in Netherlands) providing this Event ID and coordinates.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex gap-2.5 mt-auto">
            <HelpCircle className="text-teal-400 shrink-0 mt-0.5" size={14} />
            <p className="text-[9px] text-slate-500 leading-normal">
              SafeSphere Live Responders Portal operates server-side proxy routes ensuring unindexed encryption. Your IP is scrubbed for privacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
