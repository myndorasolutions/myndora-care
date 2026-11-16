import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error("Supabase environment variables are not set.");
  }
  return createBrowserClient(env.url, env.key);
}
