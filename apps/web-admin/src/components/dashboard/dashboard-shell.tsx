"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PwaStatusBar } from "@/components/pwa-status-bar";
import { DemoSwitcher } from "@/components/dashboard/demo-switcher";
import { SessionBar } from "@/components/dashboard/session-bar";
import { ROLE_LABEL, ROLE_THEME, roleFromPath, type AppRole } from "@/lib/roles";

export function DashboardShell({
  children,
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
  const roleLabel = ROLE_LABEL[accountRole ?? routeRole];
  const wide = routeRole === "admin" || routeRole === "super_admin";
  const [open, setOpen] = useState(false);

  return (
    <div data-theme={ROLE_THEME[routeRole]} className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-line bg-card">
        <SessionBar roleLabel={roleLabel} />
        {demoEnabled ? (
          <div className="flex justify-end px-4 pb-2 sm:hidden">
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
        ) : null}
        <PwaStatusBar />
      </header>

      {demoEnabled && open ? (
        <div className="border-b border-line bg-card px-4 py-4 sm:hidden">
          <DemoSwitcher active={routeRole} />
        </div>
      ) : null}

      <div className={`mx-auto flex w-full min-w-0 flex-1 flex-col gap-4 px-4 py-5 ${wide ? "max-w-[90rem]" : "max-w-5xl"}`}>
        {demoEnabled ? (
          <div className="hidden sm:block">
            <DemoSwitcher active={routeRole} />
          </div>
        ) : null}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
