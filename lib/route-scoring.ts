import type { LngLat } from "@/lib/mapbox";

export type IncidentRow = {
  lat: number;
  lng: number;
  severity: number;
  confidence_score: number;
  created_at: string;
};

export type VibeTagRow = {
  lat: number;
  lng: number;
  tag: string;
  created_at: string;
};

export type SegmentScore = {
  from: LngLat;
  to: LngLat;
  score: number;
  riskLevel: "safe" | "amber" | "risky";
};

export function haversineMeters(a: LngLat, b: LngLat): number {
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

/**
 * Scores each segment of a route 0-100 (higher = safer) using nearby
 * incident_reports (density + recency) and vibe_tags, with a time-of-day
 * penalty applied at night. This is the single source of truth for
 * route-safety scoring — both /api/route-safety and /api/navigation/route
 * import it rather than keeping their own copies.
 */
export function scoreSegments(
  coordinates: LngLat[],
  incidents: IncidentRow[],
  vibeTags: VibeTagRow[],
  atDate: Date = new Date()
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

export function overallScoreOf(segments: SegmentScore[]): number {
  return segments.length
    ? Math.round(segments.reduce((sum, segment) => sum + segment.score, 0) / segments.length)
    : 0;
}
