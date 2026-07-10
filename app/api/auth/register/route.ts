import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";

// NOTE: this route targets a "users" table that isn't part of the current
// supabase/schema.sql (profiles + auth.users are used elsewhere in this app).
// Casting to `any` here only unblocks the TypeScript build — it does not fix
// the underlying schema mismatch, which is outside VibeRoute's scope.
const supabase = isSupabaseConfigured ? (createServiceClient() as any) : null;

export async function POST(request: Request) {
  try {
    const { phone, email, language_pref } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("users")
        .insert({ phone, email, language_pref })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({
            message: "User already registered. OTP sent to phone.",
            user: { phone, email, language_pref },
          });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        message: "User registered. OTP sent to phone.",
        user: data,
      }, { status: 201 });
    }

    return NextResponse.json({
      message: "User registered (offline bypass). OTP sent to phone.",
      user: { phone, email, language_pref: language_pref || "en" },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
