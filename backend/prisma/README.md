# Prisma schema notes

The MVP schema in `schema.prisma` models the structural care loop:

- `users`, `sponsors`, `patients`, `chw_profiles`
- `remote_checks`, `physical_visits`, `escalation_cases`
- `subscriptions`, `payments`, `disputes`, `audio_prompts`, `audit_logs` (deferred HTTP surface)

## Migration baseline (wipe rationale)

Legacy pilot migrations (`20250605000000_init`, clinical review, interventions) were removed to avoid drift against the production MVP model. A single baseline migration (`20250710000000_mvp_structural_baseline`) replaces them.

**Do not** apply old migration folders to a fresh database — use only the MVP baseline.

## Supabase dual-URL pattern

```env
# Pooler (Transaction mode, port 6543) — Cloud Run runtime
DATABASE_URL=postgresql://...@...:6543/postgres?pgbouncer=true

# Direct (port 5432) — migrate/seed Cloud Run Job only
DIRECT_URL=postgresql://...@...:5432/postgres
```

Prisma uses `DATABASE_URL` for queries and `directUrl` (`DIRECT_URL`) for migrations. Local Docker can set both to the same connection string.

## Database initialization

Migrations and seed run **out-of-band** via:

- `scripts/run-db-init-job.ps1` (Cloud Run Job)
- `scripts/launch-checklist.ps1 -SeedOnly` (local/staging)
- `npx prisma migrate deploy && npx prisma db seed` with `DIRECT_URL` set

The Cloud Run **web service** does not run migrate on boot.

## Seed

`npx prisma db seed` loads playtest users, Grace Okafor patient, HOME_VISIT_APPROVED CHW, and a flagged physical visit for the escalation review queue.
