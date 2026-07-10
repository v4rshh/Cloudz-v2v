import type { LngLat } from "./mapbox";

export type VibeTag = {
  id: string;
  coords: LngLat; // [lng, lat]
  tag: string;
  created_at: string;
};

export const VIBE_TAG_OPTIONS = [
  "⚠️ Unlit block",
  "👥 Crowded/Rowdy area",
  "🚨 Suspicious activity",
  "💡 Safe Spot / 24H Shop",
] as const;

type RawVibeTag = {
  id: string;
  tag: string;
  lat: number;
  lng: number;
  created_at: string;
};

function toVibeTag(raw: RawVibeTag): VibeTag {
  return {
    id: raw.id,
    coords: [raw.lng, raw.lat],
    tag: raw.tag,
    created_at: raw.created_at,
  };
}

export async function fetchVibeTags(): Promise<VibeTag[]> {
  const res = await fetch("/api/vibe-tags", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const rows: RawVibeTag[] = Array.isArray(data.tags) ? data.tags : [];
  return rows.map(toVibeTag);
}

export async function submitVibeTag(
  tag: string,
  coords: LngLat // [lng, lat]
): Promise<VibeTag | null> {
  const res = await fetch("/api/vibe-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: coords[1], lng: coords[0], tag }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.tag ? toVibeTag(data.tag) : null;
}