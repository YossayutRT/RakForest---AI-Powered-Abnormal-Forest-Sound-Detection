import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function getCleanSupabaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://oigbuzijffxghwlbekwy.supabase.co";
  return raw.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2J1emlqZmZ4Z2h3bGJla3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NDA2NTgsImV4cCI6MjEwOTExNjY1OH0.xqd8Ahu08Wfh9fv4D_DuoYg8LH2qhZVYxHQj_dgVCx4"
  );
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return createSupabaseClient(getCleanSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });
  }
  if (!browserClient) {
    browserClient = createBrowserClient(getCleanSupabaseUrl(), getSupabaseAnonKey());
  }
  return browserClient;
}
