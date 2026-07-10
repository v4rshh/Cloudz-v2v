import { NextResponse } from "next/server";

/** Bias search results toward Rotterdam */
const ROTTERDAM_VIEWBOX = "4.35,51.98,4.65,51.85"; // left,top,right,bottom

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("viewbox", ROTTERDAM_VIEWBOX);
  url.searchParams.set("bounded", "0");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "SafeSphere-VibeRoute/1.0 (hackathon demo)",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }

  const results = await res.json();
  const hit = results[0];

  if (!hit) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  return NextResponse.json({
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    label: hit.display_name as string,
  });
}