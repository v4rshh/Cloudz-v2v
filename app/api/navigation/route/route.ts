import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: "origin and destination are required" }, { status: 400 });
    }

    // Legacy dashboard preview route.
    // Canonical Member B scoring now lives in /api/route-safety.
    const routes = [
      {
        id: "route_3",
        label: "Safest AI-Corridor",
        safety_score: 94.6,
        color: "#48c78e",
        details: "AI Safe Corridor. High camera density & active community responders.",
        path: [
          [4.47917, 51.9225],
          [4.4810, 51.9240],
          [4.4880, 51.9230],
          [4.4890, 51.9180],
          [4.4860, 51.9160]
        ]
      },
      {
        id: "route_2",
        label: "Well-Lit Walkway",
        safety_score: 74.2,
        color: "#ffe08a",
        details: "Runs along main commercial streets with 90% streetlight coverage.",
        path: [
          [4.47917, 51.9225],
          [4.4840, 51.9230],
          [4.4870, 51.9200],
          [4.4860, 51.9160]
        ]
      },
      {
        id: "route_1",
        label: "Fastest Route",
        safety_score: 38.5,
        color: "#ff3860",
        details: "Fastest path, but goes through isolated alleys & poor lighting.",
        path: [
          [4.47917, 51.9225],
          [4.4820, 51.9210],
          [4.4830, 51.9180],
          [4.4860, 51.9160]
        ]
      }
    ];

    // Pre-loaded crowdsourced risk indicators in Rotterdam
    const heatmap = [
      { lat: 51.9200, lng: 4.4825, risk_intensity: 0.82, reason: "Recent dark harassment report" },
      { lat: 51.9215, lng: 4.4865, risk_intensity: 0.65, reason: "Unlit street construction" },
      { lat: 51.9175, lng: 4.4840, risk_intensity: 0.74, reason: "Stalking incident reported" }
    ];

    return NextResponse.json({ routes, heatmap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
