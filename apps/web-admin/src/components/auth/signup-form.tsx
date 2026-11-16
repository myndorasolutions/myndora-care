"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME, ROLE_LABEL, SIGNUP_ROLES, isSignupRole } from "@/lib/roles";
import { flagEnabled, loadFlags } from "@/lib/platform-state";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const languages = [
  { value: "en", label: "English" },
  { value: "yo", label: "Yoruba" },
  { value: "ha", label: "Hausa" },
  { value: "ig", label: "Igbo" },
  { value: "pcm", label: "Nigerian Pidgin" },
];

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<(typeof SIGNUP_ROLES)[number]>("patient");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selfSponsoredOn, setSelfSponsoredOn] = useState(true);
  const providerRole = role === "chw" || role === "pharmacy" || role === "clinician";

  useEffect(() => {
    void loadFlags().then((flags) => setSelfSponsoredOn(flagEnabled(flags, "self_sponsored_signup")));
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!hasSupabaseEnv()) {
      setError("Add the Supabase URL and anon key to .env.local, or open a demo dashboard from the home page.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const selected = String(form.get("role") ?? "");
    if (!isSignupRole(selected)) {
      setError("Choose a patient, sponsor, CHW, pharmacy, or clinician account.");
      return;
    }

    const fullName = String(form.get("full_name") ?? "");
    setPending(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      options: {
        data: {
          full_name: fullName,
          phone: String(form.get("phone") ?? ""),
          primary_role: selected,
          preferred_language: String(form.get("preferred_language") ?? "en"),
          is_self_sponsored: selected === "patient" && form.get("self_sponsored") === "on",
          city: String(form.get("city") ?? ""),
          state: String(form.get("state") ?? ""),
          provider_name: String(form.get("provider_name") ?? fullName),
          cadre_or_specialty: String(form.get("cadre_or_specialty") ?? ""),
        },
      },
    });
    setPending(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setNotice("Account created. Confirm the email, then log in. Your profile is created from the role you selected.");
      return;
    }

    router.push(ROLE_HOME[selected]);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Full name
        <input name="full_name" required className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Email
        <input name="email" type="email" required autoComplete="email" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Phone
        <input name="phone" type="tel" required autoComplete="tel" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Preferred language
        <select name="preferred_language" defaultValue="en" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal">
          {languages.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        I am joining as
        <select
          name="role"
          value={role}
          onChange={(event) => {
            if (isSignupRole(event.target.value)) setRole(event.target.value);
          }}
          className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal"
        >
          {SIGNUP_ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABEL[option]}
            </option>
          ))}
        </select>
      </label>

      {role === "patient" && selfSponsoredOn ? (
        <label className="flex items-start gap-3 rounded-xl bg-surface px-3 py-3 text-sm">
          <input name="self_sponsored" type="checkbox" className="mt-1" />
          <span>
            <span className="font-semibold">Self-sponsored patient</span>
            <span className="mt-1 block text-muted">
              You pay for your own care and can open the sponsor view for your record.
            </span>
          </span>
        </label>
      ) : null}

      {providerRole ? (
        <>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Provider name
            <input name="provider_name" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Cadre or specialty
            <input name="cadre_or_specialty" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
          </label>
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          City
          <input name="city" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          State
          <input name="state" className="min-h-11 rounded-xl border border-line bg-white px-3 font-normal" />
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
