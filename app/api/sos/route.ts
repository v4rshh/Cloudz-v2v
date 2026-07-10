import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { sendSosSmsAlerts, type EmergencyContact } from "@/lib/twilio";

type SosRequestBody = {
  userId?: string | null;
  triggerType?: string;
  location?: { lat: number; lng: number };
  emergencyContacts?: any[];
  // Fallback fields from main
  lat?: number;
  lng?: number;
};

export async function POST(request: Request) {
  try {
    const body: SosRequestBody = await request.json();
    
    const userId = body.userId || "demo-web-user";
    const triggerType = body.triggerType || "button";
    const location = body.location || { lat: body.lat || 51.9225, lng: body.lng || 4.47917 };
    const emergencyContacts = body.emergencyContacts || [];

    if (typeof location.lat !== "number" || typeof location.lng !== "number") {
      return NextResponse.json(
        { error: "location/coordinates must include numeric lat and lng" },
        { status: 400 }
      );
    }

    const sosEventId = crypto.randomUUID();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const trackLink = `${siteUrl}/track/${sosEventId}`;

    const contacts: EmergencyContact[] = (emergencyContacts || []).map(
      (c: { name?: string; phone?: string }) => ({
        name: c.name || "Trusted Contact",
        phone: c.phone || "",
      })
    );

    // Trigger Twilio SMS alerts
    const sms = await sendSosSmsAlerts(contacts, trackLink, location);

    // Write to Supabase if configured
    if (isSupabaseConfigured) {
      // Try raw insert first
      const { data, error } = await supabase
        .from("sos_events")
        .insert({
          id: sosEventId,
          user_id: userId,
          trigger_type: triggerType,
          location_trail: [
            { lat: location.lat, lng: location.lng, timestamp: new Date().toISOString() },
          ],
          current_location: { lat: location.lat, lng: location.lng },
          contacts_notified: contacts,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert failed, trying RPC create_sos_event fallback:", error);
        // Fallback to RPC if insert fails
        const { data: rpcEventId, error: rpcError } = await supabase.rpc("create_sos_event", {
          p_user_id: userId,
          p_lat: location.lat,
          p_lng: location.lng,
          p_status: "active",
        });
        
        if (rpcError) {
          return NextResponse.json({ error: rpcError.message }, { status: 500 });
        }
        
        return NextResponse.json(
          {
            message: "SOS event recorded via RPC.",
            sosEventId: rpcEventId,
            trackLink: `${siteUrl}/track/${rpcEventId}`,
            sms,
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        {
          message: "SOS event recorded.",
          sosEventId,
          trackLink,
          sms,
          event: data,
        },
        { status: 201 }
      );
    }

    // Offline bypass mode
    return NextResponse.json(
      {
        message: "SOS triggered (offline bypass mode).",
        sosEventId,
        triggerType,
        trackLink,
        sms,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
