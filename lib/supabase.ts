import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Resilient fallback client structure for offline demo testing
const mockSupabase = {
  channel: (name: string) => ({
    on: (event: string, filter: any, callback: Function) => {
      // Simulate location update trigger for demo purposes on local intervals
      if (typeof window !== "undefined" && name.startsWith("sos-")) {
        const interval = setInterval(() => {
          // Slowly wander Rotterdam coordinates to simulate live path updates
          const lat = 51.9225 + (Math.random() - 0.5) * 0.005;
          const lng = 4.47917 + (Math.random() - 0.5) * 0.005;
          callback({
            new: {
              id: name.replace("sos-", ""),
              current_location: { lat, lng },
              status: "active"
            }
          });
        }, 3000);
        (window as any)[`mock_interval_${name}`] = interval;
      }
      return mockSupabase.channel(name);
    },
    subscribe: () => ({
      unsubscribe: () => {
        if (typeof window !== "undefined") {
          const key = `mock_interval_${name}`;
          if ((window as any)[key]) {
            clearInterval((window as any)[key]);
          }
        }
      }
    }),
    send: async () => ({ error: null }),
    track: () => {},
  }),
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
      limit: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: (data: any) => Promise.resolve({ data: [data], error: null }),
    update: (data: any) => ({
      eq: () => Promise.resolve({ data: [data], error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: [], error: null }),
    }),
  }),
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (mockSupabase as any);
export default supabase;
