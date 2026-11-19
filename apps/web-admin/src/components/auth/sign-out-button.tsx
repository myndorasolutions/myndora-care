"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function signOutToHome() {
  try {
    if (hasSupabaseEnv()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
  } finally {
    window.location.href = "/api/demo-role?clear=1";
  }
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => void signOutToHome()}
      className={className ?? "inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold"}
    >
      <LogOut size={16} />
      Log Out
    </button>
  );
}
