/** VibeRoute map + routing helpers. Uses real Mapbox GL JS + Directions API when
 *  NEXT_PUBLIC_MAPBOX_TOKEN is set; falls back to a free OSM/OSRM stack otherwise
 *  so the app still runs without a key. */

export type LngLat = [number, number];

export const ROTTERDAM_CENTER: LngLat = [4.47917, 51.9225];
export const DEMO_START: LngLat = [4.47917, 51.9225];
export const DEMO_END: LngLat = [4.486, 51.916];

/** Real Mapbox dark style — used when a Mapbox token is configured. */
export const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/** Free CartoDB dark style — used as a fallback with MapLibre when no token is set. */
export const DARK_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function getMapboxAccessToken(): string | null {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || null;
}

export const hasMapboxToken = Boolean(getMapboxAccessToken());

function buildDirectionsUrl(
  start: LngLat,
  end: LngLat,
  alternatives: boolean
): string {
  const token = getMapboxAccessToken();
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  if (token) {
    return (
      `https://api.mapbox.com/directions/v5/mapbox/walking/` +
      `${startLng},${startLat};${endLng},${endLat}` +
      `?overview=full&geometries=geojson&steps=false` +
      `${alternatives ? "&alternatives=true" : ""}` +
      `&access_token=${encodeURIComponent(token)}`
    );
  }

  return (
    `https://router.project-osrm.org/route/v1/foot/` +
    `${startLng},${startLat};${endLng},${endLat}` +
    `?overview=full&geometries=geojson&steps=false` +
    `${alternatives ? "&alternatives=true" : ""}`
  );
}

export type DirectionsResult = {
  coordinates: LngLat[];
  distanceMeters: number;
  durationSeconds: number;
};

/** Geocode a place name → [lng, lat] via our API proxy (Nominatim) */
export async function geocodePlace(query: string): Promise<LngLat | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (typeof data.lng !== "number" || typeof data.lat !== "number") return null;
  return [data.lng, data.lat];
}

/** Fetch a walking route from OSRM (free public demo server) */
export async function fetchDirections(
  start: LngLat,
  end: LngLat
): Promise<DirectionsResult> {
  const url = buildDirectionsUrl(start, end, false);

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing service unavailable");

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error("No route found between these points");
  }

  const route = data.routes[0];
  return {
    coordinates: route.geometry.coordinates as LngLat[],
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/** Fetch up to N candidate walking routes from OSRM (for fastest-vs-safest comparison) */
export async function fetchRouteAlternatives(
  start: LngLat,
  end: LngLat
): Promise<DirectionsResult[]> {
  const url = buildDirectionsUrl(start, end, true);

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing service unavailable");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found between these points");
  }

  return data.routes.map((route: any) => ({
    coordinates: route.geometry.coordinates as LngLat[],
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }));
}