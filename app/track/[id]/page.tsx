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
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Live SOS Tracking</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Unauthenticated view — updates via Supabase Realtime.
        </p>
      </div>

      {error && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {!event && !error && (
        <p className="text-sm text-zinc-500">Loading SOS event…</p>
      )}

      {event && (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm">
          <p>
            <span className="font-sans font-medium">Event ID:</span> {event.id}
          </p>
          <p className="mt-2">
            <span className="font-sans font-medium">Latitude:</span> {event.lat}
          </p>
          <p className="mt-1">
            <span className="font-sans font-medium">Longitude:</span> {event.lng}
          </p>
          <p className="mt-2">
            <span className="font-sans font-medium">Status:</span> {event.status}
          </p>
          <p className="mt-2">
            <span className="font-sans font-medium">Last updated:</span>{" "}
            {new Date(event.updated_at).toLocaleString()}
          </p>
          {live && (
            <p className="mt-3 font-sans text-xs text-green-700">
              ● Live — received Realtime update
            </p>
          )}
        </div>
      )}

      <Link href="/" className="text-sm text-zinc-500 underline">
        Back home
      </Link>
    </div>
  );
}
