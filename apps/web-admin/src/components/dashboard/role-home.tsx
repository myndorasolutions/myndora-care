import { ROLE_FIXTURES } from "@/lib/demo/fixtures";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";

export function RoleHome({ role }: { role: AppRole }) {
  const fixture = ROLE_FIXTURES[role];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-[var(--role-accent)]">{ROLE_LABEL[role]}</p>
        <h1 className="mt-1 text-3xl font-semibold">{fixture.person}</h1>
        <p className="text-sm text-muted">{fixture.place}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6">{fixture.summary}</p>
      </div>

      <p className="rounded-xl bg-[var(--role-soft)] px-3 py-2 text-sm">
        Preview data. These cards are sample records for the product walkthrough, not a live query.
      </p>

      <section className="grid gap-3 sm:grid-cols-2">
        {fixture.cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            <p className="mt-1 text-sm text-muted">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        {fixture.rows.map((row) => (
          <div key={row.title} className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
            <div>
              <p className="font-semibold">{row.title}</p>
              <p className="text-sm text-muted">{row.meta}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
              {row.status}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
