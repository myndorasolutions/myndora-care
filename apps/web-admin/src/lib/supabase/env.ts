export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function hasSupabaseEnv() {
  return supabaseEnv() !== null;
}

export function demoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !hasSupabaseEnv();
}
