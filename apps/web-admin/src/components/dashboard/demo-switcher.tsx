import Link from "next/link";
import { ROLE_LABEL, ROLES, type AppRole } from "@/lib/roles";

export function DemoSwitcher({ active }: { active: AppRole }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Demo preview</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROLES.map((role) => (
          <Link
            key={role}
            href={`/api/demo-role?role=${role}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              role === active ? "bg-[var(--role-accent)] text-white" : "bg-white text-ink"
            }`}
            aria-current={role === active ? "page" : undefined}
          >
            {ROLE_LABEL[role]}
          </Link>
        ))}
      </div>
    </div>
  );
}
