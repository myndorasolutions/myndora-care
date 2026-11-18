"use client";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  async function signOut() {
    if (hasSupabaseEnv()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    window.location.href = redirectTo;
  }

  return (
    <button type="button" onClick={() => void signOut()} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold">
      Sign out
    </button>
  );
}
