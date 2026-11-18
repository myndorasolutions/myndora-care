"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARTNER_ROLE_LABEL, PARTNER_ROLES, REVIEW_PATH, isPartnerRole, type PartnerRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const languages = [
  { value: "en", label: "English" },
  { value: "yo", label: "Yoruba" },
  { value: "ha", label: "Hausa" },
  { value: "ig", label: "Igbo" },
  { value: "pcm", label: "Nigerian Pidgin" },
];

const inputClass = "min-h-11 rounded-xl border border-line bg-white px-3 font-normal";

export function ApplyForm() {
  const router = useRouter();
  const [role, setRole] = useState<PartnerRole>("chw");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    if (!isPartnerRole(selected)) {
      setError("Choose a CHW, pharmacy, or clinician application.");
      return;
    }

    const fullName = String(form.get("full_name") ?? "").trim();
    const ward = String(form.get("service_area") ?? "").trim();
    const facility = String(form.get("provider_name") ?? "").trim();
    const qualification = String(form.get("cadre_or_specialty") ?? "").trim();

    if (selected === "chw" && !ward) {
      setError("Add the ward where you will work.");
      return;
    }
    if (selected === "pharmacy" && !facility) {
      setError("Add the pharmacy or facility name.");
      return;
    }
    if (selected === "clinician" && !qualification) {
      setError("Add a short qualification note. Do not enter a license number.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          phone: String(form.get("phone") ?? ""),
          primary_role: selected,
          preferred_language: String(form.get("preferred_language") ?? "en"),
          city: String(form.get("city") ?? "").trim(),
          state: String(form.get("state") ?? "").trim(),
          provider_name: selected === "pharmacy" ? facility : fullName,
          cadre_or_specialty: selected === "clinician" ? qualification : selected === "chw" ? qualification : "",
          service_area: selected === "chw" ? ward : "",
        },
      },
    });
    setPending(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setNotice("Application received. Confirm the email, then log in. An admin reviews it before a care dashboard opens.");
      return;
    }

    router.push(REVIEW_PATH);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Full name
        <input name="full_name" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Phone
        <input name="phone" type="tel" required autoComplete="tel" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Preferred language
        <select name="preferred_language" defaultValue="en" className={inputClass}>
          {languages.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        I am applying as
        <select
          name="role"
          value={role}
          onChange={(event) => {
            if (isPartnerRole(event.target.value)) setRole(event.target.value);
          }}
          className={inputClass}
        >
          {PARTNER_ROLES.map((option) => (
            <option key={option} value={option}>
              {PARTNER_ROLE_LABEL[option]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          City
          <input name="city" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          State
          <input name="state" required className={inputClass} />
        </label>
      </div>

      {role === "chw" ? (
        <>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Ward
            <input name="service_area" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Cadre note
            <input name="cadre_or_specialty" className={inputClass} placeholder="Optional, such as CHEW" />
          </label>
        </>
      ) : null}

      {role === "pharmacy" ? (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Pharmacy or facility name
          <input name="provider_name" required className={inputClass} />
        </label>
      ) : null}

      {role === "clinician" ? (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Qualification note
          <input name="cadre_or_specialty" required className={inputClass} placeholder="For example, registered nurse in Kwara" />
          <span className="font-normal text-muted">A short note only. Do not enter a license number.</span>
        </label>
      ) : null}

      <p className="rounded-xl bg-surface px-3 py-3 text-sm leading-6 text-muted">
        We collect only what an admin needs to review this application. Do not enter a NIN, voter ID, or upload a photo.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending application..." : "Submit application"}
      </button>
    </form>
  );
}
