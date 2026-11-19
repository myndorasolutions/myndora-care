import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PARTNER_ROLE_LABEL, ROLE_HOME, accountHome, isAppRole, isClearedVerification, isPartnerRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default function ApplyStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
          <p className="text-sm text-muted">Checking your application...</p>
        </main>
      }
    >
      <ApplyStatus />
    </Suspense>
  );
}

async function ApplyStatus() {
  if (!hasSupabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role, full_name")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = isAppRole(profile?.primary_role) ? profile.primary_role : null;
  if (!role || !isPartnerRole(role)) redirect(role ? ROLE_HOME[role] : "/login");

  const { data: provider } = await supabase
    .from("providers")
    .select("verification_status, city, service_area")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const status = provider?.verification_status ?? null;
  if (isClearedVerification(status)) redirect(accountHome(role, status));

  const suspended = status === "suspended";
  const place = [provider?.service_area, provider?.city].filter(Boolean).join(", ");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <div>
        <p className="text-sm font-semibold text-primary">{PARTNER_ROLE_LABEL[role]}</p>
        <h1 className="mt-2 text-3xl font-semibold">{suspended ? "Application suspended" : "Application under review"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {suspended
            ? "Myndora has paused this application. Patient records stay closed. Contact Myndora if this should be reviewed again."
            : "An admin is reviewing this application. You can sign in to check this page. The care dashboard opens after approval."}
        </p>
        {place ? <p className="mt-3 text-sm font-semibold">{place}</p> : null}
      </div>
      <SignOutButton />
    </main>
  );
}
