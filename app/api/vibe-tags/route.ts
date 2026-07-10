import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { lat, lng, tag } = await request.json();

    if (typeof lat !== "number" || typeof lng !== "number" || !tag) {
      return NextResponse.json(
        { error: "lat, lng, and tag are required" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured) {
      const supabase = createServiceClient();

      const { data, error } = await supabase.rpc("create_vibe_tag", {
        p_lat: lat,
        p_lng: lng,
        p_tag: tag,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          message: "Vibe tag saved.",
          tag: {
            id: data,
            tag,
            lat,
            lng,
            created_at: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        message: "Vibe tag classified (offline fallback — not persisted).",
        tag: {
          id: crypto.randomUUID(),
          tag,
          lat,
          lng,
          created_at: new Date().toISOString(),
        },
        pending: true,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (isSupabaseConfigured) {
      const supabase = createServiceClient();
      const { data, error } = await supabase.rpc("get_vibe_tags");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ tags: data });
    }

    const mockTags = [
      { id: "vibe-1", tag: "⚠️ Unlit block", lat: 51.9245, lng: 4.4830, created_at: new Date().toISOString() },
      { id: "vibe-2", tag: "👥 Crowded/Rowdy area", lat: 51.9190, lng: 4.4850, created_at: new Date().toISOString() },
    ];
    return NextResponse.json({ tags: mockTags });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}