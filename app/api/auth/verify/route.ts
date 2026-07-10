import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "phone and otp are required" }, { status: 400 });
    }

    // Accepts any 6-digit OTP code for demo purposes
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Invalid OTP. Use any 6-digit code to log in." }, { status: 401 });
    }

    // Safe base64 token wrapping to avoid requiring jsonwebtoken library dependencies in root
    const token = Buffer.from(
      JSON.stringify({ phone, expiresAt: Date.now() + 3600 * 1000 })
    ).toString("base64");

    return NextResponse.json({ token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
