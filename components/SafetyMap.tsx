"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxAccessToken, MAPBOX_DARK_STYLE } from "@/lib/mapbox";
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

  const loadVibeTags = useCallback(async () => {
    const tags = await fetchVibeTags();
    setVibeTags(tags);
  }, []);

  const fetchRoutesAndHeatmap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/navigation/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: ORIGIN, destination: DESTINATION })
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
  }, []);

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
      antialias: true
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

      map.on("click", (e) => {
        setClickedCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        setVibeTagError(null);
        setShowVibeForm(true);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
        `<strong>Vibe Tag</strong><p>${v.tag}</p><p style="font-size:10px;opacity:0.6;">${new Date(v.created_at).toLocaleString()}</p>`
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

      <div className="p-6 bg-slate-900/40 border-t border-white/5">
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
