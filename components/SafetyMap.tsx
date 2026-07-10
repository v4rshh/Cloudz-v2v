"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxAccessToken, MAPBOX_DARK_STYLE, geocodePlace } from "@/lib/mapbox";
import { fetchVibeTags, submitVibeTag, VIBE_TAG_OPTIONS, type VibeTag } from "@/lib/vibe-tags";
import {
  Navigation,
  Lightbulb,
  Eye,
  Users
} from "lucide-react";

const ROTTERDAM: [number, number] = [4.47917, 51.9225];
const ORIGIN = { lat: 51.9225, lng: 4.47917 };
const DESTINATION = { lat: 51.9160, lng: 4.4860 };

const token = getMapboxAccessToken();
if (token) {
  mapboxgl.accessToken = token;
}

interface Route {
  id: string;
  label: string;
  safety_score: number;
  color: string;
  details: string;
  path: number[][];
}

interface HeatmapZone {
  lat: number;
  lng: number;
  risk_intensity: number;
  reason: string;
}

export default function SafetyMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [heatmapZones, setHeatmapZones] = useState<HeatmapZone[]>([]);
  const [vibeTags, setVibeTags] = useState<VibeTag[]>([]);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWellLit, setShowWellLit] = useState(true);
  const [showFootTraffic, setShowFootTraffic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showVibeForm, setShowVibeForm] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vibeText, setVibeText] = useState<string>(VIBE_TAG_OPTIONS[0]);
  const [savingVibeTag, setSavingVibeTag] = useState(false);
  const [vibeTagError, setVibeTagError] = useState<string | null>(null);

  // Start & End States
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number }>(ORIGIN);
  const [endCoords, setEndCoords] = useState<{ lat: number; lng: number }>(DESTINATION);
  const [originText, setOriginText] = useState("Rotterdam Centraal");
  const [destinationText, setDestinationText] = useState("Erasmus University Rotterdam");
  const [clickMode, setClickMode] = useState<"off" | "start" | "end">("off");

  const clickModeRef = useRef(clickMode);
  useEffect(() => {
    clickModeRef.current = clickMode;
  }, [clickMode]);

  const loadVibeTags = useCallback(async () => {
    const tags = await fetchVibeTags();
    setVibeTags(tags);
  }, []);

  const placeOrMoveMarker = useCallback(
    (kind: "start" | "end", coords: { lat: number; lng: number }, label: string, color: string) => {
      const map = mapRef.current;
      if (!map) return;
      const ref = kind === "start" ? startMarkerRef : endMarkerRef;
      ref.current?.remove();
      
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="
            width:14px;height:14px;border-radius:9999px;
            background:${color};border:2px solid white;
            box-shadow:0 0 12px ${color}88;
          "></div>
          <span style="
            font-size:10px;font-weight:600;letter-spacing:0.04em;
            text-transform:uppercase;color:#e2e8f0;
            background:rgba(15,20,31,0.85);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:6px;padding:2px 6px;
          ">${label}</span>
        </div>
      `;
      
      ref.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
    },
    []
  );

  const fetchRoutesAndHeatmap = useCallback(async (start = startCoords, end = endCoords) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/navigation/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: start, destination: end })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `navigation/route failed (${res.status})`);
      }
      setRoutes(data.routes ?? []);
      setHeatmapZones(data.heatmap ?? []);
      if (data.routes?.length) setSelectedRouteId(data.routes[0].id);
    } catch (err) {
      console.error("Error loading routing navigation endpoints:", err);
      setLoadError(err instanceof Error ? err.message : "Could not load routes");
      setRoutes([]);
      setHeatmapZones([]);
    } finally {
      setLoading(false);
    }
  }, [startCoords, endCoords]);

  const handleRouteSearch = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let start = startCoords;
      let end = endCoords;

      if (originText && !originText.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
        const geocodedStart = await geocodePlace(originText);
        if (geocodedStart) {
          start = { lat: geocodedStart[1], lng: geocodedStart[0] };
          setStartCoords(start);
          placeOrMoveMarker("start", start, "Start", "#2dd4bf");
        }
      }

      if (destinationText && !destinationText.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
        const geocodedEnd = await geocodePlace(destinationText);
        if (geocodedEnd) {
          end = { lat: geocodedEnd[1], lng: geocodedEnd[0] };
          setEndCoords(end);
          placeOrMoveMarker("end", end, "End", "#fb7185");
        }
      }

      await fetchRoutesAndHeatmap(start, end);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Routing search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutesAndHeatmap();
    loadVibeTags();
  }, [fetchRoutesAndHeatmap, loadVibeTags]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: token ? MAPBOX_DARK_STYLE : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: ROTTERDAM,
      zoom: 13.5,
      pitch: 35,
      bearing: -12,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("heatmap-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "heatmap-src",
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 15, 30],
          "heatmap-opacity": 0.75
        }
      });

      placeOrMoveMarker("start", ORIGIN, "Start", "#2dd4bf");
      placeOrMoveMarker("end", DESTINATION, "End", "#fb7185");

      map.on("click", (e) => {
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;
        
        if (clickModeRef.current === "start") {
          setStartCoords({ lat, lng });
          setOriginText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          placeOrMoveMarker("start", { lat, lng }, "Start", "#2dd4bf");
          setClickMode("off");
        } else if (clickModeRef.current === "end") {
          setEndCoords({ lat, lng });
          setDestinationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          placeOrMoveMarker("end", { lat, lng }, "End", "#fb7185");
          setClickMode("off");
        } else {
          setClickedCoords({ lat, lng });
          setVibeTagError(null);
          setShowVibeForm(true);
        }
      });
    });

    return () => {
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [placeOrMoveMarker]);

  // Draw / refresh route lines whenever routes load.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      routes.forEach(r => {
        const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: r.path }
        };

        const source = map.getSource(`route-src-${r.id}`) as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData(geojson);
          return;
        }

        map.addSource(`route-src-${r.id}`, { type: "geojson", data: geojson });
        map.addLayer({
          id: `route-layer-${r.id}`,
          type: "line",
          source: `route-src-${r.id}`,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": r.color,
            "line-width": r.id === selectedRouteId ? 6 : 3,
            "line-opacity": r.id === selectedRouteId ? 0.9 : 0.25
          }
        });
      });

      if (routes.length) {
        const bounds = routes[0].path.reduce(
          (b, coord) => b.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(routes[0].path[0] as [number, number], routes[0].path[0] as [number, number])
        );
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [routes, selectedRouteId]);

  // Update line emphasis when the selected route changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || routes.length === 0) return;

    routes.forEach(r => {
      const isSelected = r.id === selectedRouteId;
      if (map.getLayer(`route-layer-${r.id}`)) {
        map.setPaintProperty(`route-layer-${r.id}`, "line-opacity", isSelected ? 0.9 : 0.25);
        map.setPaintProperty(`route-layer-${r.id}`, "line-width", isSelected ? 6 : 3);
      }
    });
  }, [selectedRouteId, routes]);

  // Update the heatmap source with real incident data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("heatmap-src") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: showHeatmap
        ? heatmapZones.map(z => ({
            type: "Feature",
            properties: { intensity: z.risk_intensity },
            geometry: { type: "Point", coordinates: [z.lng, z.lat] }
          }))
        : []
    };
    source.setData(data);
  }, [heatmapZones, showHeatmap]);

  // Vibe-tag markers (real data from Supabase, via /api/vibe-tags).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    vibeTags.forEach(v => {
      const el = document.createElement("div");
      el.style.fontSize = "18px";
      el.style.cursor = "pointer";
      el.innerHTML = "📍";

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(
        `<div style="color: #0f172a; font-family: sans-serif; min-width: 140px; padding: 4px;">
          <strong style="color: #14b8a6; font-size: 12px; font-weight: 700; display: block; margin-bottom: 2px;">Vibe Tag</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #334155; font-weight: 500;">${v.tag}</p>
          <p style="margin: 6px 0 0; font-size: 10px; color: #64748b;">${new Date(v.created_at).toLocaleString()}</p>
        </div>`
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat(v.coords)
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [vibeTags]);

  const handleAddVibeTag = async () => {
    if (!clickedCoords) return;
    setSavingVibeTag(true);
    setVibeTagError(null);
    try {
      const saved = await submitVibeTag(vibeText, [clickedCoords.lng, clickedCoords.lat]);
      if (!saved) {
        setVibeTagError("Couldn't save this tag. Try again.");
        return;
      }
      setVibeTags(prev => [...prev, saved]);
      setShowVibeForm(false);
      setClickedCoords(null);
      setVibeText(VIBE_TAG_OPTIONS[0]);
    } finally {
      setSavingVibeTag(false);
    }
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
        <div ref={mapContainerRef} className="w-full h-full" />

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

        {showVibeForm && clickedCoords && (
          <div className="absolute bottom-4 left-4 z-10 glass p-4 w-64 bg-slate-950/90 backdrop-blur-md border-teal-500/30">
            <h4 className="text-xs font-bold text-teal-400 mb-2">Drop Vibe Tag Here?</h4>
            <select
              value={vibeText}
              onChange={(e) => setVibeText(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-white/10 rounded p-2 mb-2 text-white"
            >
              {VIBE_TAG_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {vibeTagError && (
              <p className="text-[10px] text-rose-400 mb-2">{vibeTagError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowVibeForm(false); setVibeTagError(null); }}
                disabled={savingVibeTag}
                className="btn btn-secondary text-[10px] py-1 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVibeTag}
                disabled={savingVibeTag}
                className="btn btn-primary text-[10px] py-1 px-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
              >
                {savingVibeTag ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900/40 border-t border-white/5 flex flex-col gap-4">
        {/* Route Setting Controls */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Location</label>
              <input
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder="Start Coordinates or Place Name"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-teal-500/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Location</label>
              <input
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder="End Coordinates or Place Name"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-teal-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setClickMode(clickMode === "start" ? "off" : "start")}
              className={`flex items-center justify-center rounded-xl py-2.5 px-3 text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer shadow-md ${
                clickMode === "start" 
                  ? "bg-teal-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(45,212,191,0.25)]" 
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
              }`}
            >
              <span>{clickMode === "start" ? "Tap Map to Select..." : "Set start on map"}</span>
            </button>

            <button
              type="button"
              onClick={() => setClickMode(clickMode === "end" ? "off" : "end")}
              className={`flex items-center justify-center rounded-xl py-2.5 px-3 text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer shadow-md ${
                clickMode === "end" 
                  ? "bg-rose-500 text-white font-bold shadow-[0_0_12px_rgba(251,113,133,0.25)]" 
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
              }`}
            >
              <span>{clickMode === "end" ? "Tap Map to Select..." : "Set end on map"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRouteSearch}
            disabled={loading}
            className="w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 px-4 text-xs font-bold tracking-wider transition-all duration-300 cursor-pointer hover:from-teal-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_4px_12px_rgba(20,184,166,0.25)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.4)]"
          >
            <span>{loading ? "Finding Safest Route..." : "Get Route"}</span>
          </button>
        </div>

        <div className="border-t border-white/5 my-2"></div>

        <h4 className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Candidate Routes</h4>
        {loadError && <p className="text-xs text-rose-400 mb-3">{loadError}</p>}
        <div className="flex flex-col gap-3">
          {routes.length === 0 && !loading && !loadError && (
            <p className="text-xs text-slate-500">No routes yet.</p>
          )}
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
        <p className="mt-3 text-[10px] text-slate-500">{vibeTags.length} vibe tag{vibeTags.length === 1 ? "" : "s"} on map</p>
      </div>
    </div>
  );
}
