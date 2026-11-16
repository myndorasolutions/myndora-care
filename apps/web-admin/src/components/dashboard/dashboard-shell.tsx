"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PwaStatusBar } from "@/components/pwa-status-bar";
import { DemoSwitcher } from "@/components/dashboard/demo-switcher";
import { ROLE_LABEL, ROLE_THEME, roleFromPath, type AppRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export function DashboardShell({
  children,
  signedIn,
  accountRole,
  demoEnabled,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  accountRole: AppRole | null;
  demoEnabled: boolean;
}) {
  const pathname = usePathname();
  const routeRole = roleFromPath(pathname) ?? "patient";
  const [open, setOpen] = useState(false);

  async function signOut() {
    if (hasSupabaseEnv()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    window.location.href = "/api/demo-role?clear=1";
  }

  return (
    <div data-theme={ROLE_THEME[routeRole]} className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-line bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="shrink-0">
            <Logo className="h-8 w-auto" />
          </Link>
          <p className="hidden text-sm font-semibold sm:block">{ROLE_LABEL[routeRole]} dashboard</p>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <PwaStatusBar />
      </header>

      {open ? (
        <div className="border-b border-line bg-card px-4 py-4">
          <nav className="flex flex-col gap-3 text-sm">
            <p className="font-semibold">{ROLE_LABEL[routeRole]} overview</p>
            {accountRole ? (
              <p className="text-muted">Signed in as {ROLE_LABEL[accountRole]}</p>
            ) : (
              <p className="text-muted">Previewing without an account</p>
            )}
            {demoEnabled ? <DemoSwitcher active={routeRole} /> : null}
            {signedIn ? (
              <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center gap-2 font-semibold">
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary">
                Log in
              </Link>
            )}
          </nav>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-5">
        {demoEnabled ? (
          <div className="hidden sm:block">
            <DemoSwitcher active={routeRole} />
          </div>
        ) : null}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
