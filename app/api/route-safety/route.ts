import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { scoreSegments, overallScoreOf, type IncidentRow, type VibeTagRow } from "@/lib/route-scoring";
import type { LngLat } from "@/lib/mapbox";

type RoutePayload = {
  coordinates?: LngLat[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RoutePayload;
    const coordinates = body.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json({ error: "coordinates[] with at least two points is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      const segments = scoreSegments(coordinates, [], []);
      return NextResponse.json({ segments, overallScore: overallScoreOf(segments), source: "mock" });
    }

    const supabase = createServiceClient();
    const [{ data: incidents, error: incidentsError }, { data: vibeTags, error: vibeTagsError }] = await Promise.all([
      supabase.rpc("get_incident_reports", { p_status: "approved" }),
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

    return NextResponse.json({ segments, overallScore: overallScoreOf(segments), source: "supabase" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to score route";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
