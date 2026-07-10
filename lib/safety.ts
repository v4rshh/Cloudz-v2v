import type { LngLat } from "./mapbox";
import type { SafetyReport, ReportCategory } from "./reports";

// Radius scales with how serious the category typically is
const CATEGORY_RADIUS_METERS: Record<ReportCategory, number> = {
  assault: 250,
  stalking: 220,
  harassment: 180,
  infrastructure: 130,
  other: 120,
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

function sampleCoords(coords: LngLat[], maxSamples = 40): LngLat[] {
  if (coords.length <= maxSamples) return coords;
  const step = Math.ceil(coords.length / maxSamples);
  return coords.filter((_, i) => i % step === 0);
}

export type SafetyBreakdown = {
  score: number; // 0-100, higher = safer
  riskHits: number;
  matchedReports: SafetyReport[];
  isNight: boolean;
};

/**
 * Score a route's safety based on real, approved user reports.
 * severity (1-5) and confidence_score (0-1) both scale the penalty.
 * No nearby reports -> neutral score, never claims verified safety.
 */
export function scoreRouteSafety(
  coordinates: LngLat[],
  reports: SafetyReport[],
  atDate: Date = new Date()
): SafetyBreakdown {
  const samples = sampleCoords(coordinates);
  const hour = atDate.getHours();
  const isNight = hour >= 21 || hour < 6;

  let penalty = 0;
  let riskHits = 0;
  const matchedReports = new Set<SafetyReport>();

  for (const point of samples) {
    for (const report of reports) {
      const radius = CATEGORY_RADIUS_METERS[report.category] ?? 150;
      if (haversineMeters(point, report.coords) <= radius) {
        const severityWeight = report.severity / 5; // normalize 1-5 -> 0.2-1.0
        const weighted = severityWeight * report.confidence_score;
        penalty += weighted * (isNight ? 1.4 : 1);
        riskHits++;
        matchedReports.add(report);
      }
    }
  }

  const norm = Math.max(samples.length, 1);
  const raw = 80 - (penalty / norm) * 55;
  const score = Math.max(5, Math.min(95, Math.round(raw)));

  return {
    score,
    riskHits,
    matchedReports: Array.from(matchedReports),
    isNight,
  };
}