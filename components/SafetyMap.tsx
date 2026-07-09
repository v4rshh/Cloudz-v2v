"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { 
  Navigation, 
  MapPin, 
  Eye, 
  Lightbulb, 
  Users, 
  ShieldCheck, 
  Sparkles,
  AlertTriangle,
  Plus
} from "lucide-react";

// Rotterdam default coords
const ROTTERDAM: [number, number] = [4.47917, 51.9225]; // [lng, lat] for Mapbox

interface Route {
  id: string;
  label: string;
  safety_score: number;
  color: string;
  details: string;
  path: number[][]; // [[lng, lat], ...]
}

interface HeatmapZone {
  lat: number;
  lng: number;
  risk_intensity: number;
  reason: string;
}

interface VibeTag {
  id: string;
  lat: number;
  lng: number;
  tag: string;
  created_at: string;
}

export default function SafetyMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [origin, setOrigin] = useState("Centrum, Rotterdam");
  const [destination, setDestination] = useState("Erasmus University Area, Rotterdam");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("route_3");
  const [heatmapZones, setHeatmapZones] = useState<HeatmapZone[]>([]);
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([
    { id: "v1", lat: 51.9245, lng: 4.4830, tag: "⚠️ Unlit alleyway", created_at: new Date().toISOString() },
    { id: "v2", lat: 51.9190, lng: 4.4850, tag: "👥 Crowded area", created_at: new Date().toISOString() }
  ]);

  // Map Filter Layers
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWellLit, setShowWellLit] = useState(true);
  const [showFootTraffic, setShowFootTraffic] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Vibe tag creation helper states
  const [showVibeForm, setShowVibeForm] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vibeText, setVibeText] = useState("⚠️ Unlit block");

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  const isMapboxReady = !!(mapboxToken && !mapboxToken.startsWith("your_"));

  // Fetch routes and heatmap details
  useEffect(() => {
    fetchRoutesAndHeatmap();
  }, []);

  const fetchRoutesAndHeatmap = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/navigation/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: 51.9225, lng: 4.47917 },
          destination: { lat: 51.9160, lng: 4.4860 }
        })
      });
      const data = await res.json();
      if (data.routes) setRoutes(data.routes);
      if (data.heatmap) setHeatmapZones(data.heatmap);
    } catch (err) {
      console.error("Error loading routing navigation endpoints:", err);
      // Client-side local stubs fallback
      setRoutes([
        {
          id: "route_3",
          label: "Safest AI-Corridor",
          safety_score: 94.6,
          color: "#48c78e",
          details: "AI Safe Corridor. High camera density & active community responders.",
          path: [
            [4.47917, 51.9225],
            [4.4810, 51.9240],
            [4.4880, 51.9230],
            [4.4890, 51.9180],
            [4.4860, 51.9160]
          ]
        },
        {
          id: "route_2",
          label: "Well-Lit Walkway",
          safety_score: 74.2,
          color: "#ffe08a",
          details: "Runs along main commercial streets with 90% streetlight coverage.",
          path: [
            [4.47917, 51.9225],
            [4.4840, 51.9230],
            [4.4870, 51.9200],
            [4.4860, 51.9160]
          ]
        },
        {
          id: "route_1",
          label: "Fastest Route",
          safety_score: 38.5,
          color: "#ff3860",
          details: "Fastest path, but goes through isolated alleys & poor lighting.",
          path: [
            [4.47917, 51.9225],
            [4.4820, 51.9210],
            [4.4830, 51.9180],
            [4.4860, 51.9160]
          ]
        }
      ]);
      setHeatmapZones([
        { lat: 51.9200, lng: 4.4825, risk_intensity: 0.82, reason: "Recent dark harassment report" },
        { lat: 51.9215, lng: 4.4865, risk_intensity: 0.65, reason: "Unlit street construction" },
        { lat: 51.9175, lng: 4.4840, risk_intensity: 0.74, reason: "Stalking incident reported" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (!isMapboxReady || !mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: ROTTERDAM,
      zoom: 13.5,
      pitch: 35,
      antialias: true
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add route layers
      drawRoutes(map);
      // Add click handler to drop vibe tags
      map.on("click", (e) => {
        setClickedCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        setShowVibeForm(true);
      });
    });

    return () => {
      map.remove();
    };
  }, [isMapboxReady, routes]);

  // Redraw path geometries depending on selection state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || routes.length === 0) return;

    routes.forEach(r => {
      const isSelected = r.id === selectedRouteId;
      const opacity = isSelected ? 0.9 : 0.25;
      const width = isSelected ? 6 : 3;

      if (map.getLayer(`route-layer-${r.id}`)) {
        map.setPaintProperty(`route-layer-${r.id}`, "line-opacity", opacity);
        map.setPaintProperty(`route-layer-${r.id}`, "line-width", width);
      }
    });
  }, [selectedRouteId, routes]);

  // Update map markers for safe zones and vibe tags
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add safe zone markers
    const safeZones = [
      { name: "Centrum Police Station", lat: 51.9238, lng: 4.4851 },
      { name: "Erasmus Haven", lat: 51.9175, lng: 4.4805 }
    ];

    safeZones.forEach(z => {
      const el = document.createElement("div");
      el.className = "custom-marker-police";
      el.style.backgroundColor = "#485fc7";
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = "white";
      el.style.fontWeight = "bold";
      el.style.fontSize = "10px";
      el.innerHTML = "P";

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4>${z.name}</h4><p>24/7 Verified Safe Hub</p>`);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([z.lng, z.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add vibe tags
    vibeTags.forEach(v => {
      const el = document.createElement("div");
      el.style.fontSize = "18px";
      el.style.cursor = "pointer";
      el.innerHTML = "📍";

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`<strong>Vibe Tag</strong><p>${v.tag}</p>`);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([v.lng, v.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

  }, [vibeTags, routes]);

  const drawRoutes = (map: mapboxgl.Map) => {
    routes.forEach(r => {
      const geojson: any = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: r.path
        }
      };

      map.addSource(`route-src-${r.id}`, {
        type: "geojson",
        data: geojson
      });

      map.addLayer({
        id: `route-layer-${r.id}`,
        type: "line",
        source: `route-src-${r.id}`,
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": r.color,
          "line-width": r.id === selectedRouteId ? 6 : 3,
          "line-opacity": r.id === selectedRouteId ? 0.9 : 0.25
        }
      });
    });
  };

  const handleAddVibeTag = () => {
    if (!clickedCoords) return;
    const newTag: VibeTag = {
      id: crypto.randomUUID(),
      lat: clickedCoords.lat,
      lng: clickedCoords.lng,
      tag: vibeText,
      created_at: new Date().toISOString()
    };
    setVibeTags([...vibeTags, newTag]);
    setShowVibeForm(false);
    setClickedCoords(null);
  };

  return (
    <div className="card glass flex flex-col h-full overflow-hidden" style={{ minHeight: "500px" }}>
      <div className="card-title px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Navigation className="text-teal-400" />
          <h3>VibeRoute Safety Map</h3>
        </div>
        {loading && <span className="text-xs text-slate-400 animate-pulse">Computing safest routes...</span>}
      </div>

      <div className="flex-1 relative overflow-hidden" style={{ height: "400px" }}>
        {/* Mapbox Canvas Mount */}
        {isMapboxReady ? (
          <div ref={mapContainerRef} className="mapboxgl-map w-full h-full" />
        ) : (
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#485fc7_1px,transparent_1px)] [background-size:16px_16px]" />
            <AlertTriangle className="text-amber-400 size-12 mb-4 animate-bounce" />
            <h4 className="font-bold text-white mb-2">Premium Mapbox Overlay Standby</h4>
            <p className="text-sm text-slate-400 max-w-sm mb-4">
              Add a valid <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> inside your <code>.env</code> key configurations to unlock dark overlays and heatmaps.
            </p>
            {/* Interactive Vector Mock Overlay Map */}
            <div className="w-full max-w-md h-48 border border-white/5 bg-white/2 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between text-left">
              <div>
                <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">Rotterdam Local Mode</span>
                <p className="text-xs text-slate-300 mt-2">📍 Origin: {origin}</p>
                <p className="text-xs text-slate-300">🏁 Destination: {destination}</p>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-[10px] bg-slate-800 text-teal-400 px-2 py-1 rounded">Offline Bypass Routing Active</span>
                <button 
                  onClick={() => {
                    setVibeTags([...vibeTags, {
                      id: crypto.randomUUID(),
                      lat: 51.921,
                      lng: 4.481,
                      tag: "⚠️ Mock Vibe dropped on block",
                      created_at: new Date().toISOString()
                    }]);
                  }}
                  className="btn btn-secondary text-[11px] py-1 px-3"
                >
                  <Plus size={12} /> Drop Tag
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Filters Overlay Control */}
        <div className="map-control-panel glass absolute top-4 right-4 z-10 p-4 w-60 bg-slate-900/80 backdrop-blur-md">
          <h4 className="text-xs text-slate-400 font-bold mb-3 tracking-wider uppercase">Overlay Layers</h4>
          <div className="flex flex-col gap-3">
            <div className="toggle-row">
              <span className="text-xs flex items-center gap-2"><Users size={12} className="text-red-400" /> Heatmap</span>
              <label className="switch">
                <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span className="text-xs flex items-center gap-2"><Lightbulb size={12} className="text-amber-400" /> Streetlights</span>
              <label className="switch">
                <input type="checkbox" checked={showWellLit} onChange={(e) => setShowWellLit(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span className="text-xs flex items-center gap-2"><Eye size={12} className="text-teal-400" /> Foot Traffic</span>
              <label className="switch">
                <input type="checkbox" checked={showFootTraffic} onChange={(e) => setShowFootTraffic(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Vibe Tag Floating drop form */}
        {showVibeForm && clickedCoords && (
          <div className="absolute bottom-4 left-4 z-10 glass p-4 w-64 bg-slate-950/90 backdrop-blur-md border-teal-500/30">
            <h4 className="text-xs font-bold text-teal-400 mb-2">Drop Vibe Tag Here?</h4>
            <select 
              value={vibeText} 
              onChange={(e) => setVibeText(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-white/10 rounded p-2 mb-3 text-white"
            >
              <option value="⚠️ Unlit block">⚠️ Unlit block</option>
              <option value="👥 Crowded/Rowdy area">👥 Crowded/Rowdy area</option>
              <option value="🚨 Suspicious activity">🚨 Suspicious activity</option>
              <option value="💡 Safe Spot / 24H Shop">💡 Safe Spot / 24H Shop</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowVibeForm(false)} className="btn btn-secondary text-[10px] py-1 px-3">Cancel</button>
              <button onClick={handleAddVibeTag} className="btn btn-primary text-[10px] py-1 px-3 bg-teal-600 hover:bg-teal-500">Save</button>
            </div>
          </div>
        )}
      </div>

      {/* Routes list description panels */}
      <div className="p-6 bg-slate-900/40 border-t border-white/5">
        <h4 className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Candidate Routes</h4>
        <div className="flex flex-col gap-3">
          {routes.map((r) => {
            const isSelected = r.id === selectedRouteId;
            return (
              <div 
                key={r.id} 
                onClick={() => setSelectedRouteId(r.id)}
                className={`route-list-item ${isSelected ? "selected" : ""}`}
              >
                <div>
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.label}
                  </span>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">{r.details}</p>
                </div>
                <div className={`safety-score-pill ${r.safety_score >= 80 ? "score-high" : r.safety_score >= 50 ? "score-medium" : "score-low"}`}>
                  {Math.round(r.safety_score)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
