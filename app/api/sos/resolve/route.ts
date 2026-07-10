import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { id, status } = await request.json(); // status: "resolved" | "false_alarm"

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    if (!["resolved", "false_alarm"].includes(status)) {
      return NextResponse.json({ error: "status must be 'resolved' or 'false_alarm'" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("sos_events")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: "SOS status updated in database.", event: data });
    }

    return NextResponse.json({
      message: `SOS status updated locally to: ${status} (offline bypass).`,
      id,
      status
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
