import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "../env";

let client: SupabaseClient | null = null;

/** Anon client for public reads and Realtime (browser + RSC). */
export function getSupabasePublic(): SupabaseClient {
  if (client) return client;
  const env = getPublicEnv();
  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
