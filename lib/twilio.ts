import twilio from "twilio";

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface SosSmsResult {
  name: string;
  phone: string;
  status: "sent" | "failed" | "skipped";
  sid?: string;
  error?: string;
}

export interface SosSmsResponse {
  configured: boolean;
  status: "sent" | "partial" | "failed" | "bypass" | "not_configured";
  results: SosSmsResult[];
  message: string;
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export const isTwilioConfigured = !!(accountSid && authToken && fromNumber);

function getTwilioClient() {
  if (!isTwilioConfigured) return null;
  return twilio(accountSid!, authToken!);
}

/** Normalize phone numbers to E.164 (strip spaces/dashes, ensure leading +). */
export function normalizePhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) {
    return cleaned.length >= 8 ? cleaned : null;
  }

  // Dutch mobile without country code: 06xxxxxxxx → +316xxxxxxxx
  if (/^06\d{8}$/.test(cleaned)) {
    return `+31${cleaned.slice(1)}`;
  }

  // US 10-digit without country code
  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }

  return cleaned.length >= 8 ? `+${cleaned}` : null;
}

export function buildSosSmsBody(trackLink: string, location?: { lat: number; lng: number }): string {
  const coords = location
    ? ` Last known location: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}.`
    : "";
  return (
    `SafeSphere SOS ALERT: A contact needs immediate help.` +
    ` Track their live location here (no login required): ${trackLink}.${coords}` +
    ` If you cannot open the link, call emergency services.`
  );
}

export async function sendSosSmsAlerts(
  contacts: EmergencyContact[],
  trackLink: string,
  location?: { lat: number; lng: number }
): Promise<SosSmsResponse> {
  const client = getTwilioClient();
  const body = buildSosSmsBody(trackLink, location);

  if (!client) {
    console.log(`[Twilio Bypass] Would send to ${contacts.length} contact(s): "${body}"`);
    return {
      configured: false,
      status: contacts.length > 0 ? "bypass" : "not_configured",
      results: contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        status: "skipped" as const,
        error: "Twilio not configured",
      })),
      message: contacts.length
        ? "SOS recorded. SMS bypass mode — configure TWILIO_* env vars to send real texts."
        : "SOS recorded. No emergency contacts provided.",
    };
  }

  if (!contacts.length) {
    return {
      configured: true,
      status: "not_configured",
      results: [],
      message: "SOS recorded. Add trusted contacts in Profile Settings to receive SMS alerts.",
    };
  }

  const results: SosSmsResult[] = [];

  for (const contact of contacts) {
    const to = normalizePhoneNumber(contact.phone);
    if (!to) {
      results.push({
        name: contact.name,
        phone: contact.phone,
        status: "failed",
        error: "Invalid phone number format",
      });
      continue;
    }

    try {
      const message = await client.messages.create({
        body,
        from: fromNumber!,
        to,
      });
      results.push({
        name: contact.name,
        phone: to,
        status: "sent",
        sid: message.sid,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown Twilio error";
      console.error(`[Twilio] Failed to SMS ${contact.name} (${to}):`, errorMessage);
      results.push({
        name: contact.name,
        phone: to,
        status: "failed",
        error: errorMessage,
      });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  let status: SosSmsResponse["status"];
  if (sent > 0 && failed === 0) status = "sent";
  else if (sent > 0 && failed > 0) status = "partial";
  else status = "failed";

  return {
    configured: true,
    status,
    results,
    message:
      sent > 0
        ? `SMS sent to ${sent} of ${contacts.length} contact(s).`
        : "SOS recorded but SMS delivery failed for all contacts.",
  };
}
