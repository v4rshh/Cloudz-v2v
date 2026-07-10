import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_sos_event", { p_id: id });

  if (error) {
    console.error("get_sos_event failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const event = data?.[0];
  if (!event) {
    return NextResponse.json({ error: "SOS event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

type LocationUpdateBody = {
  lat: number;
  lng: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: LocationUpdateBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lat, lng } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng must be numbers" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase.rpc("update_sos_location", {
    p_id: id,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    console.error("update_sos_location failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data, error: fetchError } = await supabase.rpc("get_sos_event", {
    p_id: id,
  });

  if (fetchError) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(data?.[0] ?? { ok: true });
}
