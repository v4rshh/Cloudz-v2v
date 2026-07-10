import type { LngLat } from "./mapbox";

export type ReportCategory = "assault" | "stalking" | "harassment" | "infrastructure" | "other";
export type ReportStatus = "pending" | "approved" | "rejected";

export type SafetyReport = {
  id: string;
  raw_text: string;
  category: ReportCategory;
  severity: number; // 1-5
  confidence_score: number; // 0-1
  coords: LngLat;
  status: ReportStatus;
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
  status: ReportStatus;
  created_at: string;
};

function toSafetyReport(raw: RawReport): SafetyReport {
  return {
    id: raw.id,
    raw_text: raw.raw_text,
    category: raw.category,
    severity: raw.severity,
    confidence_score: raw.confidence_score,
    coords: [raw.lng, raw.lat],
    status: raw.status,
    created_at: raw.created_at,
  };
}

export async function fetchReports(): Promise<SafetyReport[]> {
  const res = await fetch("/api/reports", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const rows: RawReport[] = Array.isArray(data.reports) ? data.reports : [];
  return rows.map(toSafetyReport);
}

export async function submitReport(
  text: string,
  coords: LngLat,
  anonymous: boolean
): Promise<{ report: SafetyReport | null; classification: ReportClassification | null }> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      location: { lng: coords[0], lat: coords[1] },
      anonymous,
    }),
  });
  if (!res.ok) return { report: null, classification: null };
  const data = await res.json();
  return {
    report: data.report ? toSafetyReport(data.report) : null,
    classification: data.classification ?? null,
  };
}