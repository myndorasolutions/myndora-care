# Prisma schema notes

The Prisma schema in `schema.prisma` currently models **7 active tables** used by the pilot API:

- `users`, `patients`, `caregivers_patients`, `authorized_helpers`, `consent_records`
- `vitals`, `chw_visits`

## Migration history vs schema

The initial migration (`20250605000000_init`) created ~35 tables for the full product guide (alerts, payments, prescriptions, lab orders, disputes, etc.). Those tables may exist in the database but are **not yet wired** to NestJS controllers.

**Sprint scope:** only reconcile models needed for vitals sync, clinical review, and CHW visits. Full schema sync is deferred.

## Dormant tables (no API yet)

Examples from the init migration without corresponding Prisma models or services:

- `alerts`, `notifications`
- `payments`, `payouts`, `escrow_holds`
- `prescriptions`, `pharmacy_refills`
- `lab_orders`, `service_jobs`
- `disputes`, `policy_violations`

Do not drop these tables without a migration plan — they may be activated in future sprints.

## Seed

Run `npx prisma db seed` after migrate to load playtest users and Grace Okafor patient data (`playtest-patient-grace`).
