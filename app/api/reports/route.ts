import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function classifyIncidentText(text: string) {
  const lowercase = text.toLowerCase();
  let category = "infrastructure";
  let severity = 2;
  let confidence_score = 0.85;

  if (lowercase.includes("assault") || lowercase.includes("attack") || lowercase.includes("fight") || lowercase.includes("hit")) {
    category = "assault";
    severity = 5;
  } else if (lowercase.includes("stalk") || lowercase.includes("follow") || lowercase.includes("chase") || lowercase.includes("behind me")) {
    category = "stalking";
    severity = 4;
  } else if (lowercase.includes("harass") || lowercase.includes("catcall") || lowercase.includes("abuse") || lowercase.includes("shout")) {
    category = "harassment";
    severity = 3;
  } else if (lowercase.includes("light") || lowercase.includes("dark") || lowercase.includes("lamp") || lowercase.includes("broken")) {
    category = "infrastructure";
    severity = 2;
  } else {
    category = "other";
    severity = 1;
    confidence_score = 0.6;
  }

  return { category, severity, confidence_score };
}

export async function POST(request: Request) {
  try {
    const { text, location, anonymous } = await request.json();

    if (!text || !location) {
      return NextResponse.json({ error: "text and location are required" }, { status: 400 });
    }

    const classification = classifyIncidentText(text);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("incident_reports")
        .insert({
          raw_text: text,
          category: classification.category,
          severity: classification.severity,
          confidence_score: classification.confidence_score,
          // WKT format for PostGIS Geography POINT mapping
          location: `POINT(${location.lng} ${location.lat})`,
          status: "pending"
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        message: "Report submitted to database.",
        classification,
        report: data
      }, { status: 201 });
    }

    return NextResponse.json({
      message: "Report classified (offline fallback).",
      classification,
      anonymous: !!anonymous,
      location,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ reports: data });
    }

    // Static mock list for local demo stability
    const mockReports = [
      { id: "rep-1", raw_text: "Streetlights are completely broken on this block, very dark.", category: "infrastructure", severity: 2, location: { lat: 51.9215, lng: 4.4865 }, created_at: new Date().toISOString() },
      { id: "rep-2", raw_text: "An individual was following me from Rotterdam Station.", category: "stalking", severity: 4, location: { lat: 51.9175, lng: 4.4840 }, created_at: new Date().toISOString() }
    ];
    return NextResponse.json({ reports: mockReports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
