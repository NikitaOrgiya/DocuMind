import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

let cached: SupabaseClient | null = null;

/**
 * Service-role client for server-side use only (route handlers, scripts).
 * Never import this from a "use client" component or expose the key to the browser.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (!config.supabase.configured) {
    throw new Error("Supabase is not configured (missing URL or service role key).");
  }
  if (!cached) {
    cached = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return cached;
}
