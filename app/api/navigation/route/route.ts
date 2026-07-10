import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { fetchRouteAlternatives, fetchDirections, type LngLat } from "@/lib/mapbox";
import { scoreSegments, overallScoreOf, type IncidentRow, type VibeTagRow } from "@/lib/route-scoring";

type LatLng = { lat: number; lng: number };

type NavRoute = {
  id: string;
  label: string;
  safety_score: number;
  color: string;
  details: string;
  path: number[][];
};

type HeatmapZone = {
  lat: number;
  lng: number;
  risk_intensity: number;
  reason: string;
};

function colorFor(score: number): string {
  if (score >= 70) return "#48c78e";
  if (score >= 40) return "#ffe08a";
  return "#ff3860";
}

function labelFor(rank: number, score: number): string {
  if (rank === 0) return score >= 70 ? "Safest AI-Corridor" : "Best Available Route";
  if (score >= 40) return "Well-Lit Walkway";
  return "Fastest Route";
}

function detailsFor(score: number, distanceMeters: number, durationSeconds: number): string {
  const mins = Math.round(durationSeconds / 60);
  const km = (distanceMeters / 1000).toFixed(1);
  if (score >= 70) return `${km} km · ~${mins} min. Low incident density along this path.`;
  if (score >= 40) return `${km} km · ~${mins} min. Some flagged segments — stay alert.`;
  return `${km} km · ~${mins} min. Passes through recently reported areas.`;
}

export async function POST(request: Request) {
  try {
    const { origin, destination } = (await request.json()) as { origin?: LatLng; destination?: LatLng };

    if (!origin || !destination || typeof origin.lat !== "number" || typeof destination.lat !== "number") {
      return NextResponse.json({ error: "origin and destination {lat, lng} are required" }, { status: 400 });
    }

    const start: LngLat = [origin.lng, origin.lat];
    const end: LngLat = [destination.lng, destination.lat];

    // Real routing via Mapbox Directions (falls back to OSRM inside lib/mapbox if no token set).
    let candidates;
    try {
      candidates = await fetchRouteAlternatives(start, end);
    } catch {
      candidates = [await fetchDirections(start, end)];
    }

    // Real incident/vibe-tag data from Supabase — empty arrays (neutral scoring) if not configured yet.
    let incidents: IncidentRow[] = [];
    let vibeTags: VibeTagRow[] = [];

    if (isSupabaseConfigured) {
      const supabase = createServiceClient();
      const [{ data: incidentRows, error: incidentsError }, { data: vibeRows, error: vibeTagsError }] = await Promise.all([
        supabase.rpc("get_incident_reports", { p_status: "approved" }),
        supabase.rpc("get_vibe_tags"),
      ]);

      if (incidentsError) {
        return NextResponse.json({ error: incidentsError.message }, { status: 500 });
      }
      if (vibeTagsError) {
        return NextResponse.json({ error: vibeTagsError.message }, { status: 500 });
      }

      incidents = (incidentRows ?? []) as IncidentRow[];
      vibeTags = (vibeRows ?? []) as VibeTagRow[];
    }

    const scoredCandidates = candidates.map((c) => {
      const segments = scoreSegments(c.coordinates, incidents, vibeTags);
      return { ...c, overallScore: overallScoreOf(segments) };
    });

    // Rank safest-first, dedupe identical paths, cap at 3 so the panel stays readable.
    const ranked = [...scoredCandidates].sort((a, b) => b.overallScore - a.overallScore);
    const seen = new Set<string>();
    const routes: NavRoute[] = [];

    ranked.forEach((c, rank) => {
      const key = JSON.stringify(c.coordinates);
      if (seen.has(key)) return;
      seen.add(key);
      if (routes.length >= 3) return;

      routes.push({
        id: `route_${routes.length + 1}`,
        label: labelFor(rank, c.overallScore),
        safety_score: c.overallScore,
        color: colorFor(c.overallScore),
        details: detailsFor(c.overallScore, c.distanceMeters, c.durationSeconds),
        path: c.coordinates,
      });
    });

    // Heatmap driven by real incident_reports (empty until Supabase is configured / has data).
    const heatmap: HeatmapZone[] = incidents.map((incident) => ({
      lat: incident.lat,
      lng: incident.lng,
      risk_intensity: Math.min(1, (incident.severity / 5) * incident.confidence_score),
      reason: `Reported incident (severity ${incident.severity}/5)`,
    }));

    return NextResponse.json({ routes, heatmap, source: isSupabaseConfigured ? "supabase" : "routing-only" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute routes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
