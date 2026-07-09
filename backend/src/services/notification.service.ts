import twilio from "twilio";

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

interface NotifyContactsArgs {
  contacts: { name?: string; phone: string; relation?: string }[];
  location: { lat: number; lng: number };
  sosEventId: string;
}

/**
 * Notify emergency contacts via SMS with live location and SOS event link.
 * Falls back to logging if Twilio isn't configured (useful for local dev).
 */
export async function notifyEmergencyContacts({ contacts, location, sosEventId }: NotifyContactsArgs) {
  const message = `SafeRoute SOS Alert: A contact needs help. Live location: https://maps.google.com/?q=${location.lat},${location.lng} | Event ID: ${sosEventId}`;

  if (!client) {
    console.log("[notification.service] Twilio not configured. Would send:", message, contacts);
    return { sent: false, reason: "Twilio not configured (dev mode)" };
  }

  const results = await Promise.allSettled(
    (contacts || []).map((contact) =>
      client.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER || "",
        to: contact.phone,
      })
    )
  );

  return { sent: true, results };
}
