"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function SessionBar({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0" aria-label="Main Screen">
          <Logo className="h-8 w-auto" />
        </Link>
        <Link href="/" className="text-sm font-semibold text-primary">
          Main Screen
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">{roleLabel}</span>
        <SignOutButton className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm font-semibold" />
      </div>
    </div>
  );
}
