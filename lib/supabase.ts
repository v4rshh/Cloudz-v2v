import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Strip accidental /rest/v1 suffix — the JS client adds that itself. */
function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { url: url ? normalizeSupabaseUrl(url) : "", anonKey: anonKey || "" };
}

/**
 * Browser Supabase client — import this from client components and hooks.
 * Call only in the browser (event handlers, useEffect).
 *
 * ```ts
 * import { createClient } from "@/lib/supabase";
 * const supabase = createClient();
 * ```
 */
export function createClient() {
  if (typeof window === "undefined") {
    throw new Error("createClient() must be called in the browser");
  }

  if (!browserClient) {
    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) {
      // Return local fallback bypass mock client so client-side code doesn't crash offline
      return supabase;
    }
    browserClient = createBrowserClient<Database>(url, anonKey);
  }
  return browserClient;
}

/**
 * Server-side service-role client for API routes and server actions.
 * Bypasses RLS — never import this into client components.
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` in env (not prefixed with NEXT_PUBLIC_).
 *
 * ```ts
 * import { createServiceClient } from "@/lib/supabase";
 * const supabase = createServiceClient();
 * ```
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient<Database>(normalizeSupabaseUrl(url), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
/** True when the server has what it needs to talk to Supabase. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

export const supabase = (function() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const keyToUse = serviceKey || anonKey;

  if (!url || !keyToUse) {
    // Return a mock bypass client for offline hackathon testing
    return {
      from: (table: string) => ({
        insert: (data: any) => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: "mock-id", status: "active", location_trail: [] }, error: null })
          }),
          then: (cb: any) => cb({ data, error: null })
        }),
        update: (data: any) => ({
          eq: (col: string, val: any) => Promise.resolve({ data, error: null })
        }),
        select: (cols: string) => ({
          eq: (col: string, val: any) => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        })
      }),
      rpc: (fn: string, args: any) => Promise.resolve({ data: "mock-rpc-id", error: null }),
      channel: (name: string) => ({
        on: () => ({
          subscribe: () => {}
        })
      }),
      removeChannel: () => {},
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: "mock-user-id" } } }, error: null }),
        getUser: () => Promise.resolve({ data: { user: { id: "mock-user-id" } }, error: null }),
      }
    } as any;
  }

  return createSupabaseClient<Database>(normalizeSupabaseUrl(url), keyToUse);
})();

