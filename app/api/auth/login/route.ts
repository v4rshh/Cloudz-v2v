import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    // Stub out OTP sending trigger (e.g. Twilio Verify / Supabase Auth SMS)
    return NextResponse.json({
      message: `OTP sent to ${phone} (stub)`,
      phone,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
