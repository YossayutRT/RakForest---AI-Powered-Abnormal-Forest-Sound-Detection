import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getCleanSupabaseUrl, getSupabaseAnonKey } from "./client";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(getCleanSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never)
          );
        } catch {
          // Server component read-only context
        }
      },
    },
  });
}

export function createServiceRoleSupabase() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey();
  return createAdminSupabaseClient(getCleanSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
