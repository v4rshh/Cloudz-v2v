"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function AuthPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const normalized = phone.startsWith("+") ? phone : `+${phone}`;

    const { error } = await createClient().auth.signInWithOtp({ phone: normalized });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSessionPhone(normalized);
    setStep("otp");
    setMessage("OTP sent. Check your phone.");
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!sessionPhone) return;

    setLoading(true);
    setMessage(null);

    const { error } = await createClient().auth.verifyOtp({
      phone: sessionPhone,
      token: otp,
      type: "sms",
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Signed in. Redirecting…");
    window.location.href = "/sos";
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">SafeSphere Sign In</h1>
        <p className="mt-2 text-sm text-zinc-600">Phone OTP — include country code (e.g. +1…)</p>
      </div>

      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Phone number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
              required
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            OTP code
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setMessage(null);
            }}
            className="text-sm text-zinc-600 underline"
          >
            Use a different number
          </button>
        </form>
      )}

      {message && (
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-800">{message}</p>
      )}

      <Link href="/" className="text-sm text-zinc-500 underline">
        Back home
      </Link>
    </div>
  );
}
