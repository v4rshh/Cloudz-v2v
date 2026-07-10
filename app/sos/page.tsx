"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const LOCATION_INTERVAL_MS = 5000;

export default function SosPage() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coordsRef = useRef({ lat: 37.7749, lng: -122.4194 });

  const [userId, setUserId] = useState<string | null>(null);
  const [sosId, setSosId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState(coordsRef.current);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pushLocation = useCallback(async (eventId: string, lat: number, lng: number) => {
    const res = await fetch(`/api/sos/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? "Failed to update location");
    }
  }, []);

  const startLocationInterval = useCallback(
    (eventId: string) => {
      stopTracking();

      intervalRef.current = setInterval(() => {
        coordsRef.current = {
          lat: coordsRef.current.lat + (Math.random() - 0.5) * 0.001,
          lng: coordsRef.current.lng + (Math.random() - 0.5) * 0.001,
        };
        setCoords({ ...coordsRef.current });

        void pushLocation(
          eventId,
          coordsRef.current.lat,
          coordsRef.current.lng
        ).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Location update failed";
          setError(message);
        });
      }, LOCATION_INTERVAL_MS);
    },
    [pushLocation, stopTracking]
  );

  async function triggerSos() {
    setError(null);
    setStatus("Triggering SOS…");
    stopTracking();

    let lat = coordsRef.current.lat;
    let lng = coordsRef.current.lng;

    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        coordsRef.current = { lat, lng };
        setCoords({ lat, lng });
      } catch {
        setStatus("Geolocation unavailable — using default coords");
      }
    }

    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, userId }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(payload.error ?? "Failed to create SOS event");
      setStatus("Error");
      return;
    }

    const newId = payload.id as string;
    setSosId(newId);
    setStatus("SOS active — streaming location every 5s");
    startLocationInterval(newId);
  }

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">SOS Trigger</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Creates an sos_events row and simulates movement for live tracking.
        </p>
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <p>
          <span className="font-medium">Status:</span> {status}
        </p>
        <p className="mt-1">
          <span className="font-medium">Coords:</span> {coords.lat.toFixed(6)},{" "}
          {coords.lng.toFixed(6)}
        </p>
        {userId ? (
          <p className="mt-1 text-zinc-500">Signed in as {userId.slice(0, 8)}…</p>
        ) : (
          <p className="mt-1 text-amber-700">
            Not signed in —{" "}
            <Link href="/auth" className="underline">
              sign in
            </Link>{" "}
            to attach SOS to your account
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void triggerSos()}
        className="rounded-full bg-red-600 px-6 py-4 text-lg font-semibold text-white shadow-lg"
      >
        TRIGGER SOS
      </button>

      {sosId && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-900">Tracking link (share with contacts):</p>
          <Link href={`/track/${sosId}`} className="mt-1 block break-all text-red-700 underline">
            /track/{sosId}
          </Link>
        </div>
      )}

      {error && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <Link href="/" className="text-sm text-zinc-500 underline">
        Back home
      </Link>
    </div>
  );
}
