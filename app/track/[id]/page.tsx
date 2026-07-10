"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { SosEventRow } from "@/lib/database.types";

export default function TrackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [event, setEvent] = useState<SosEventRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  // Allow browser scroll on the tracking page for smaller mobile/laptop viewports
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "auto";
    }
    return () => {
      if (typeof window !== "undefined") {
        document.body.style.overflow = "hidden";
      }
    };
  }, []);

  async function fetchEvent() {
    const res = await fetch(`/api/sos/${id}`);
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(payload.error ?? "Failed to load SOS event");
    }

    setEvent(payload as SosEventRow);
  }

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        await fetchEvent();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setError(message);
      }
    }

    void load();

    const supabase = createClient();
    const channel = supabase
      .channel(`sos-track-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sos_events",
          filter: `id=eq.${id}`,
        },
        () => {
          setLive(true);
          void fetchEvent().catch(() => {
            /* keep last known coords on transient fetch errors */
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id-scoped subscription
  }, [id]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Live SOS Tracking</h1>
        <p className="mt-2 text-sm text-slate-400">
          Unauthenticated view — updates via Supabase Realtime.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{error}</p>
      )}

      {!event && !error && (
        <p className="text-sm text-slate-500 animate-pulse">Loading SOS event…</p>
      )}

      {event && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 font-mono text-sm text-slate-300 backdrop-blur-md">
          <p>
            <span className="font-sans font-semibold text-slate-400">Event ID:</span>{" "}
            <span className="text-white select-all">{event.id}</span>
          </p>
          <p className="mt-3">
            <span className="font-sans font-semibold text-slate-400">Latitude:</span>{" "}
            <span className="text-teal-400">{event.lat}</span>
          </p>
          <p className="mt-2">
            <span className="font-sans font-semibold text-slate-400">Longitude:</span>{" "}
            <span className="text-teal-400">{event.lng}</span>
          </p>
          <p className="mt-3">
            <span className="font-sans font-semibold text-slate-400">Status:</span>{" "}
            <span className="badge badge-danger text-xs px-2 py-0.5 uppercase">{event.status}</span>
          </p>
          <p className="mt-3">
            <span className="font-sans font-semibold text-slate-400">Last updated:</span>{" "}
            <span className="text-slate-400">{new Date(event.updated_at).toLocaleString()}</span>
          </p>
          {live && (
            <p className="mt-4 font-sans text-xs text-teal-400 flex items-center gap-1.5 animate-pulse">
              <span className="size-2 bg-teal-500 rounded-full" />
              <span>Live updates active</span>
            </p>
          )}
        </div>
      )}

      <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 underline transition mt-2">
        Back home
      </Link>
    </div>
  );
}
