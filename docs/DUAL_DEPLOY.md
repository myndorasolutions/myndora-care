# Dual-deploy workflow (simulation → production)

Single repository. Separate runtime stacks. Promote only certified images.

## Commands

```powershell
# Required once: isolated simulation database (must NOT match production)
$env:SIMULATION_DATABASE_URL = "postgresql://postgres.<sim-ref>:...@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:SIMULATION_DIRECT_URL   = "postgresql://postgres.<sim-ref>:...@db.<sim-ref>.supabase.co:5432/postgres"
$env:SIMULATION_SUPABASE_PROJECT_REF = "<sim-ref>"

# Validate fixes on simulation
powershell -File scripts\deploy-simulation.ps1

# After certification, promote the same image tag to production
powershell -File scripts\promote-production.ps1 -FromSimulation
```

## Topology

| Layer | Simulation | Production |
|-------|------------|------------|
| Flag | `ENVIRONMENT=simulation` / `VITE_ENVIRONMENT=simulation` | `ENVIRONMENT=production` |
| Cloud Run | `myndora-backend-api-sim` | `myndora-backend-api` → `https://api.myndoracare.com` |
| Hosting site | `myndora-care-simulation` | `project-681c9d16-2470-459b-8a1` |
| Web URL | `https://myndora-care-simulation.web.app` (custom domain when remapped) | `https://project-681c9d16-2470-459b-8a1.web.app` |
| Custom domain | `https://simulation.myndoracare.com` | — |
| Database | `SIMULATION_*` URLs | Existing prod Cloud Run `DATABASE_URL` |
| DB job | `myndora-db-init-sim` | `myndora-db-init` |

## Safety rails

- `Assert-DistinctDatabaseUrls` refuses sim deploy if pooler fingerprint matches production.
- `promote-production.ps1` requires `-FromSimulation` or `-ImageTag` (certified artifact in `scripts/.last-simulation-image`).
- Simulation forces `MOCK_PAYSTACK=true` / `MOCK_AT=true` at boot.
- Simulation SPA ships `robots.txt` with `Disallow: /`.

## Health

`GET /api/v1/health` returns `{ environment, mockPaystack, ... }` for isolation checks.

## Custom domain note

If `map-simulation-domain.ps1` cannot move `simulation.myndoracare.com` onto `myndora-care-simulation` (Firebase DELETE 500), remapping the domain in the Firebase Console Hosting UI, then re-run:

```powershell
powershell -File scripts\map-simulation-domain.ps1 -SiteId myndora-care-simulation -Poll
```

Until remapped, use `https://myndora-care-simulation.web.app` for isolated UI validation.
