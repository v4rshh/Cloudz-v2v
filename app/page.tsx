"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import {
  DEMO_END,
  DEMO_START,
  DARK_MAP_STYLE,
  ROTTERDAM_CENTER,
  fetchDirections,
  fetchRouteAlternatives,
  formatDistance,
  formatDuration,
  geocodePlace,
  type DirectionsResult,
  type LngLat,
} from "@/lib/mapbox";
import { scoreRouteSafety, type SafetyBreakdown } from "@/lib/safety";
import {
  fetchReports,
  submitReport,
  type SafetyReport,
  type ReportClassification,
} from "@/lib/reports";

type ClickMode = "off" | "start" | "end" | "report";
type RouteKind = "fastest" | "safest";

type ScoredRoute = DirectionsResult & {
  kind: RouteKind;
  safety: SafetyBreakdown;
};

function severityColor(severity: number): string {
  const clamped = Math.max(1, Math.min(5, severity));
  const colors = ["#facc15", "#fbbf24", "#fb923c", "#f97316", "#ef4444"];
  return colors[clamped - 1];
}

function createMarkerElement(label: string, color: string): HTMLDivElement {
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
  return el;
}

function createReportMarkerElement(severity: number): HTMLDivElement {
  const el = document.createElement("div");
  const color = severityColor(severity);
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "2px solid rgba(15,20,31,0.9)";
  el.style.boxShadow = `0 0 10px ${color}aa`;
  el.style.cursor = "pointer";
  return el;
}

const EMPTY_ROUTE: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function pickRoutes(candidates: DirectionsResult[], reports: SafetyReport[]): ScoredRoute[] {
  const scored = candidates.map((c) => ({
    ...c,
    kind: "fastest" as RouteKind,
    safety: scoreRouteSafety(c.coordinates, reports),
  }));

  const fastest = [...scored].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
  const safest = [...scored].sort((a, b) => b.safety.score - a.safety.score)[0];

  const results: ScoredRoute[] = [{ ...fastest, kind: "fastest" }];
  if (JSON.stringify(safest.coordinates) !== JSON.stringify(fastest.coordinates)) {
    results.push({ ...safest, kind: "safest" });
  }
  return results;
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function VibeRoutePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const endMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reportMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [originText, setOriginText] = useState("Rotterdam Centrum");
  const [destinationText, setDestinationText] = useState("Erasmus University Rotterdam");
  const [startCoords, setStartCoords] = useState<LngLat>(DEMO_START);
  const [endCoords, setEndCoords] = useState<LngLat>(DEMO_END);
  const [clickMode, setClickMode] = useState<ClickMode>("off");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [routes, setRoutes] = useState<ScoredRoute[]>([]);
  const [activeKind, setActiveKind] = useState<RouteKind>("fastest");

  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [pendingReportCoords, setPendingReportCoords] = useState<LngLat | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportAnonymous, setReportAnonymous] = useState(true);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [lastClassification, setLastClassification] = useState<ReportClassification | null>(null);

  const placeOrMoveMarker = useCallback(
    (kind: "start" | "end", coords: LngLat, label: string, color: string) => {
      const map = mapRef.current;
      if (!map) return;
      const ref = kind === "start" ? startMarkerRef : endMarkerRef;
      ref.current?.remove();
      ref.current = new maplibregl.Marker({ element: createMarkerElement(label, color), anchor: "bottom" })
        .setLngLat(coords)
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>${label}</strong>`))
        .addTo(map);
    },
    []
  );

  const renderReportMarkers = useCallback((list: SafetyReport[]) => {
    const map = mapRef.current;
    if (!map) return;
    reportMarkersRef.current.forEach((m) => m.remove());
    reportMarkersRef.current = list.map((r) => {
      const popupHtml = `
        <strong style="text-transform:capitalize;">${r.category} · severity ${r.severity}/5</strong>
        <p style="margin-top:4px;">${escapeHtml(r.raw_text)}</p>
        <p style="margin-top:4px;font-size:10px;opacity:0.6;">
          ${new Date(r.created_at).toLocaleDateString()} · confidence ${Math.round(r.confidence_score * 100)}%
        </p>
      `;
      return new maplibregl.Marker({ element: createReportMarkerElement(r.severity), anchor: "center" })
        .setLngLat(r.coords)
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(popupHtml))
        .addTo(map);
    });
  }, []);

  const loadReports = useCallback(async () => {
    const list = await fetchReports();
    setReports(list);
    renderReportMarkers(list);
    return list;
  }, [renderReportMarkers]);

  const drawRoutes = useCallback((allRoutes: ScoredRoute[], active: RouteKind) => {
    const map = mapRef.current;
    if (!map) return;
    for (const kind of ["fastest", "safest"] as RouteKind[]) {
      const source = map.getSource(`route-${kind}`) as maplibregl.GeoJSONSource | undefined;
      const match = allRoutes.find((r) => r.kind === kind);
      source?.setData(
        match
          ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: match.coordinates } }
          : EMPTY_ROUTE
      );
      map.setPaintProperty(
        `route-${kind}-layer`,
        "line-opacity",
        kind === active ? 0.95 : allRoutes.length > 1 ? 0.35 : 0
      );
    }
    const activeRoute = allRoutes.find((r) => r.kind === active) ?? allRoutes[0];
    if (activeRoute) {
      const bounds = activeRoute.coordinates.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(activeRoute.coordinates[0], activeRoute.coordinates[0])
      );
      map.fitBounds(bounds, { padding: 100, maxZoom: 15, duration: 800 });
    }
  }, []);

  const clearRoutes = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const kind of ["fastest", "safest"] as RouteKind[]) {
      const source = map.getSource(`route-${kind}`) as maplibregl.GeoJSONSource | undefined;
      source?.setData(EMPTY_ROUTE);
    }
  }, []);

  const resolveCoords = useCallback(async (text: string, fallback: LngLat): Promise<LngLat> => {
    const trimmed = text.trim();
    if (!trimmed) return fallback;
    const geocoded = await geocodePlace(trimmed);
    return geocoded ?? fallback;
  }, []);

  const handleRoute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = await resolveCoords(originText, startCoords);
      const end = await resolveCoords(destinationText, endCoords);
      setStartCoords(start);
      setEndCoords(end);
      placeOrMoveMarker("start", start, "Start", "#2dd4bf");
      placeOrMoveMarker("end", end, "End", "#fb7185");

      const latestReports = await loadReports();

      let candidates: DirectionsResult[];
      try {
        candidates = await fetchRouteAlternatives(start, end);
      } catch {
        candidates = [await fetchDirections(start, end)];
      }

      const picked = pickRoutes(candidates, latestReports);
      setRoutes(picked);
      setActiveKind("fastest");
      drawRoutes(picked, "fastest");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Routing failed";
      setError(message);
      setRoutes([]);
      clearRoutes();
    } finally {
      setLoading(false);
    }
  }, [originText, destinationText, startCoords, endCoords, resolveCoords, placeOrMoveMarker, drawRoutes, clearRoutes, loadReports]);

  const handleSubmitReport = useCallback(async () => {
    if (!pendingReportCoords || !reportText.trim()) return;
    setSubmittingReport(true);
    try {
      const { report, classification } = await submitReport(
        reportText.trim(),
        pendingReportCoords,
        reportAnonymous
      );
      setLastClassification(classification);
      if (report) {
        const updated = [...reports, report];
        setReports(updated);
        renderReportMarkers(updated);
        if (routes.length) {
          const rescored = routes.map((r) => ({ ...r, safety: scoreRouteSafety(r.coordinates, updated) }));
          setRoutes(rescored);
        }
      }
    } finally {
      setSubmittingReport(false);
      setPendingReportCoords(null);
      setReportText("");
      setReportAnonymous(true);
    }
  }, [pendingReportCoords, reportText, reportAnonymous, reports, routes, renderReportMarkers]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_MAP_STYLE,
      center: ROTTERDAM_CENTER,
      zoom: 13.5,
      pitch: 35,
      bearing: -12,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route-fastest", { type: "geojson", data: EMPTY_ROUTE });
      map.addLayer({
        id: "route-fastest-layer",
        type: "line",
        source: "route-fastest",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2dd4bf", "line-width": 5, "line-opacity": 0.95 },
      });

      map.addSource("route-safest", { type: "geojson", data: EMPTY_ROUTE });
      map.addLayer({
        id: "route-safest-layer",
        type: "line",
        source: "route-safest",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#a78bfa", "line-width": 5, "line-opacity": 0.35 },
      });

      placeOrMoveMarker("start", DEMO_START, "Start", "#2dd4bf");
      placeOrMoveMarker("end", DEMO_END, "End", "#fb7185");
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(DEMO_START);
      bounds.extend(DEMO_END);
      map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      setMapReady(true);
      loadReports();
    });

    return () => {
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      reportMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [placeOrMoveMarker, loadReports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || clickMode === "off") return;
    const cursor = clickMode === "start" ? "crosshair" : clickMode === "end" ? "pointer" : "cell";
    map.getCanvas().style.cursor = cursor;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const coords: LngLat = [e.lngLat.lng, e.lngLat.lat];
      if (clickMode === "start") {
        setStartCoords(coords);
        setOriginText(`${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`);
        placeOrMoveMarker("start", coords, "Start", "#2dd4bf");
        setClickMode("off");
      } else if (clickMode === "end") {
        setEndCoords(coords);
        setDestinationText(`${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`);
        placeOrMoveMarker("end", coords, "End", "#fb7185");
        setClickMode("off");
      } else if (clickMode === "report") {
        setPendingReportCoords(coords);
        setLastClassification(null);
        setClickMode("off");
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      map.getCanvas().style.cursor = "";
    };
  }, [clickMode, mapReady, placeOrMoveMarker]);

  useEffect(() => {
    if (routes.length) drawRoutes(routes, activeKind);
  }, [activeKind, routes, drawRoutes]);

  const fastestRoute = routes.find((r) => r.kind === "fastest");
  const safestRoute = routes.find((r) => r.kind === "safest");
  const hasChoice = routes.length > 1;
  const activeRoute = routes.find((r) => r.kind === activeKind);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">SafeSphere</p>
        <h1 className="text-sm font-semibold text-white">VibeRoute</h1>
        <p className="mt-1 text-xs text-slate-400">Step 5 · Real backend integration</p>
      </div>

      <button
        type="button"
        onClick={() => setClickMode(clickMode === "report" ? "off" : "report")}
        className={`absolute right-4 top-24 z-10 rounded-lg border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition ${
          clickMode === "report"
            ? "border-amber-400 bg-amber-500/20 text-amber-200"
            : "border-white/10 bg-slate-950/85 text-slate-200 hover:border-white/20"
        }`}
      >
        {clickMode === "report" ? "Tap map to flag…" : "⚠ Report unsafe spot"}
      </button>

      {pendingReportCoords && (
        <div className="absolute right-4 top-40 z-20 w-64 rounded-xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Describe what happened
          </p>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="e.g. Someone followed me from the station platform…"
            rows={4}
            maxLength={500}
            className="mb-2 w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50"
          />
          <label className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
            <input
              type="checkbox"
              checked={reportAnonymous}
              onChange={(e) => setReportAnonymous(e.target.checked)}
            />
            Submit anonymously
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingReportCoords(null)}
              className="flex-1 rounded-lg border border-white/10 bg-slate-900 py-1.5 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={submittingReport || !reportText.trim()}
              className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
            >
              {submittingReport ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      )}

      {lastClassification && !pendingReportCoords && (
        <div className="absolute right-4 top-40 z-20 w-64 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-300">Report received</p>
          <p className="mt-1 text-xs text-slate-300 capitalize">
            Classified as {lastClassification.category} · severity {lastClassification.severity}/5
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Pending review — will factor into route scoring once approved.
          </p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 z-10 mx-auto max-w-lg rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start</label>
          <input
            value={originText}
            onChange={(e) => setOriginText(e.target.value)}
            placeholder="e.g. Rotterdam Centraal"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-500/50"
          />
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End</label>
          <input
            value={destinationText}
            onChange={(e) => setDestinationText(e.target.value)}
            placeholder="e.g. Erasmus University Rotterdam"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-500/50"
          />
        </div>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setClickMode(clickMode === "start" ? "off" : "start")}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              clickMode === "start" ? "border-teal-500 bg-teal-500/20 text-teal-300" : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20"
            }`}
          >
            {clickMode === "start" ? "Tap map…" : "Set start on map"}
          </button>
          <button
            type="button"
            onClick={() => setClickMode(clickMode === "end" ? "off" : "end")}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              clickMode === "end" ? "border-rose-500 bg-rose-500/20 text-rose-300" : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20"
            }`}
          >
            {clickMode === "end" ? "Tap map…" : "Set end on map"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleRoute}
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Finding routes…" : "Get route"}
        </button>

        {routes.length > 0 && (
          <div className="mt-3 flex gap-2">
            {fastestRoute && (
              <button
                type="button"
                onClick={() => setActiveKind("fastest")}
                className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
                  activeKind === "fastest" ? "border-teal-500 bg-teal-500/10" : "border-white/10 bg-slate-900"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Fastest</p>
                <p className="text-xs text-slate-300">
                  {formatDistance(fastestRoute.distanceMeters)} · {formatDuration(fastestRoute.durationSeconds)}
                </p>
                <p className="text-[10px] text-slate-500">
                  Safety {fastestRoute.safety.score}/100
                  {fastestRoute.safety.riskHits > 0 && ` · ${fastestRoute.safety.matchedReports.length} report(s) nearby`}
                </p>
              </button>
            )}
            {hasChoice && safestRoute && (
              <button
                type="button"
                onClick={() => setActiveKind("safest")}
                className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
                  activeKind === "safest" ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-slate-900"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Safest</p>
                <p className="text-xs text-slate-300">
                  {formatDistance(safestRoute.distanceMeters)} · {formatDuration(safestRoute.durationSeconds)}
                </p>
                <p className="text-[10px] text-slate-500">
                  Safety {safestRoute.safety.score}/100
                  {safestRoute.safety.riskHits > 0 && ` · ${safestRoute.safety.matchedReports.length} report(s) nearby`}
                </p>
              </button>
            )}
          </div>
        )}

        {activeRoute?.safety.isNight && (
          <p className="mt-2 text-center text-[10px] text-amber-400">
            Night-time scoring applied (increased weight on nearby reports).
          </p>
        )}

        <p className="mt-2 text-center text-[10px] text-slate-500">
          {reports.length} approved safety report{reports.length === 1 ? "" : "s"} loaded
        </p>

        {error && <p className="mt-3 text-center text-xs text-rose-400">{error}</p>}
      </div>
    </div>
  );
}