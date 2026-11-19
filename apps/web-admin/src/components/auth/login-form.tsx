"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accountHome, isAppRole, isPartnerRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!hasSupabaseEnv()) {
      setError("Add the Supabase URL and anon key to .env.local, or open a demo dashboard from the home page.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (signInError || !data.user) {
      setPending(false);
      setError(signInError?.message ?? "Sign-in failed.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("primary_role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !isAppRole(profile?.primary_role)) {
      setPending(false);
      setError("Your profile is not ready yet. Wait a moment, then try signing in again.");
      return;
    }
    const role = profile.primary_role;
    let verificationStatus: string | null = null;
    if (isPartnerRole(role)) {
      const { data: provider } = await supabase
        .from("providers")
        .select("verification_status")
        .eq("user_id", data.user.id)
        .maybeSingle();
      verificationStatus = provider?.verification_status ?? null;
    }
    setPending(false);
    router.push(accountHome(role, verificationStatus));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Log in"}
      </button>
    </form>
  );
}
