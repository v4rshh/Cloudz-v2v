import type { LngLat } from "./mapbox";

export type ReportCategory = "assault" | "stalking" | "harassment" | "infrastructure" | "other";

export type SafetyReport = {
  id: string;
  coords: LngLat; // [lng, lat]
  category: ReportCategory;
  severity: number; // 1-5
  confidence_score: number; // 0-1
  raw_text: string;
  status?: string;
  created_at: string;
};

export type ReportClassification = {
  category: ReportCategory;
  severity: number;
  confidence_score: number;
};

type RawReport = {
  id: string;
  raw_text: string;
  category: ReportCategory;
  severity: number;
  confidence_score: number;
  lat: number;
  lng: number;
  status?: string;
  created_at: string;
};

function toSafetyReport(raw: RawReport): SafetyReport {
  return {
    id: raw.id,
    coords: [raw.lng, raw.lat],
    category: raw.category,
    severity: raw.severity,
    confidence_score: raw.confidence_score,
    raw_text: raw.raw_text,
    status: raw.status,
    created_at: raw.created_at,
  };
}

/** Fetch approved safety reports (real Supabase data — offline fallback returns []). */
export async function fetchReports(): Promise<SafetyReport[]> {
  const res = await fetch("/api/reports", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const rows: RawReport[] = Array.isArray(data.reports) ? data.reports : [];
  return rows.map(toSafetyReport);
}

/** Submit a free-text incident report at a location. Returns the classification always,
 *  and the persisted report only when the backend actually stored one (Supabase configured). */
export async function submitReport(
  text: string,
  coords: LngLat, // [lng, lat]
  anonymous = true
): Promise<{ report: SafetyReport | null; classification: ReportClassification }> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, location: { lat: coords[1], lng: coords[0] }, anonymous }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Report submission failed (${res.status})`);
  }

  return {
    report: data.report ? toSafetyReport(data.report) : null,
    classification: data.classification as ReportClassification,
  };
}
