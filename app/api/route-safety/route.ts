import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import type { LngLat } from "@/lib/mapbox";

type RoutePayload = {
  coordinates?: LngLat[];
};

type IncidentRow = {
  lat: number;
  lng: number;
  severity: number;
  confidence_score: number;
  created_at: string;
};

type VibeTagRow = {
  lat: number;
  lng: number;
  tag: string;
  created_at: string;
};

type SegmentScore = {
  from: LngLat;
  to: LngLat;
  score: number;
  riskLevel: "safe" | "amber" | "risky";
};

function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function segmentCenter(a: LngLat, b: LngLat): LngLat {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function scoreSegments(
  coordinates: LngLat[],
  incidents: IncidentRow[],
  vibeTags: VibeTagRow[],
  atDate = new Date()
): SegmentScore[] {
  const hour = atDate.getHours();
  const isNight = hour >= 21 || hour < 6;

  return coordinates.slice(0, -1).map((from, index) => {
    const to = coordinates[index + 1];
    const center = segmentCenter(from, to);
    const segmentLength = Math.max(haversineMeters(from, to), 1);

    let penalty = 0;

    for (const incident of incidents) {
      const incidentPoint: LngLat = [incident.lng, incident.lat];
      if (haversineMeters(center, incidentPoint) > 260) continue;

      const ageHours = Math.max((atDate.getTime() - new Date(incident.created_at).getTime()) / 36e5, 0);
      const recencyFactor = clamp(1.6 - ageHours / 168, 0.4, 1.6);
      penalty += (incident.severity / 5) * incident.confidence_score * recencyFactor;
    }

    for (const tag of vibeTags) {
      const tagPoint: LngLat = [tag.lng, tag.lat];
      if (haversineMeters(center, tagPoint) > 180) continue;

      const tagWeight = /isolated|unlit|dark|empty/i.test(tag.tag)
        ? 1.2
        : /crowded|busy|patrol/i.test(tag.tag)
          ? -0.35
          : 0.25;
      penalty += tagWeight;
    }

    const nightMultiplier = isNight ? 1.18 : 1;
    const densityFactor = clamp(penalty / (segmentLength / 100), 0, 10);
    const score = clamp(Math.round(100 - densityFactor * 9 * nightMultiplier), 0, 100);

    return {
      from,
      to,
      score,
      riskLevel: score >= 70 ? "safe" : score >= 40 ? "amber" : "risky",
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RoutePayload;
    const coordinates = body.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json({ error: "coordinates[] with at least two points is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        segments: scoreSegments(coordinates, [], []),
        overallScore: 72,
        source: "mock",
      });
    }

    const supabase = createServiceClient();
    const [{ data: incidents, error: incidentsError }, { data: vibeTags, error: vibeTagsError }] = await Promise.all([
      (supabase as any).rpc("get_incident_reports", { p_status: "approved" }),
      supabase.rpc("get_vibe_tags"),
    ]);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    if (vibeTagsError) {
      return NextResponse.json({ error: vibeTagsError.message }, { status: 500 });
    }

    const segments = scoreSegments(
      coordinates,
      (incidents ?? []) as IncidentRow[],
      (vibeTags ?? []) as VibeTagRow[]
    );

    const overallScore = segments.length
      ? Math.round(segments.reduce((sum, segment) => sum + segment.score, 0) / segments.length)
      : 0;

    return NextResponse.json({ segments, overallScore, source: "supabase" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to score route";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}