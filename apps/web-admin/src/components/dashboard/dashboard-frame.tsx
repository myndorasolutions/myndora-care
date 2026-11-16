import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isAppRole, type AppRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { demoModeEnabled, hasSupabaseEnv } from "@/lib/supabase/env";

export async function DashboardFrame({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  let signedIn = false;
  let accountRole: AppRole | null = null;

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      signedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (isAppRole(profile?.primary_role)) {
        accountRole = profile.primary_role;
      }
    }
  } else if (isAppRole(cookieStore.get("myndora_demo_role")?.value)) {
    accountRole = null;
  }

  return (
    <DashboardShell
      signedIn={signedIn}
      accountRole={accountRole}
      demoEnabled={demoModeEnabled()}
    >
      {children}
    </DashboardShell>
  );
}
