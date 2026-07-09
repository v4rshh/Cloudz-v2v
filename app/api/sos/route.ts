import { NextResponse } from "next/server";
import twilio from "twilio";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export async function POST(request: Request) {
  try {
    const { userId, triggerType, location, emergencyContacts } = await request.json();

    if (!userId || !triggerType || !location) {
      return NextResponse.json({ error: "userId, triggerType, and location are required" }, { status: 400 });
    }

    const sosEventId = crypto.randomUUID();

    // Build unauthenticated public tracking link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const trackLink = `${siteUrl}/track/${sosEventId}`;
    const smsMessage = `SafeSphere SOS Alert! A contact needs help. Track live location: ${trackLink}`;

    let twilioStatus = "not_configured";

    if (twilioClient && emergencyContacts && emergencyContacts.length > 0) {
      try {
        await Promise.all(
          emergencyContacts.map((contact: any) =>
            twilioClient.messages.create({
              body: smsMessage,
              from: process.env.TWILIO_FROM_NUMBER || "",
              to: contact.phone,
            })
          )
        );
        twilioStatus = "sent";
      } catch (smsErr: any) {
        console.error("[Twilio API Error] Failed to send SMS:", smsErr);
        twilioStatus = `error: ${smsErr.message}`;
      }
    } else {
      console.log(`[Twilio Bypass Mode] Contacts would receive: "${smsMessage}" for:`, emergencyContacts);
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("sos_events")
        .insert({
          id: sosEventId,
          user_id: userId,
          trigger_type: triggerType,
          location_trail: [{ lat: location.lat, lng: location.lng, timestamp: new Date().toISOString() }],
          contacts_notified: emergencyContacts || [],
          status: "active"
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        message: "SOS event recorded. Contacts notified.",
        sosEventId,
        twilioStatus,
        event: data
      }, { status: 201 });
    }

    return NextResponse.json({
      message: "SOS triggered (offline bypass mode).",
      sosEventId,
      triggerType,
      twilioStatus,
      trackLink
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
