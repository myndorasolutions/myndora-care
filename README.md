# Myndora Care

Nigeria-first chronic care coordination platform for hypertension and diabetes management. A core product under **Myndora Solutions**.

## Architecture

```
┌─────────────┐     ┌─────────────┐
│ Flutter App │     │  React Web  │
│  (mobile/)  │     │   (web/)    │
└──────┬──────┘     └──────┬──────┘
       │    DevAuth JWT    │
       └─────────┬──────────┘
                 ▼
       ┌─────────────────────┐
       │  NestJS REST API    │
       │    (backend/)       │
       └─────────┬───────────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
  PostgreSQL 16        Redis 7
  (Prisma ORM)      (cache/pubsub)
```

Production web deploys to **Firebase Hosting** with `/api/v1/**` proxied to Cloud Run. Mobile uses the Render API or same Cloud Run endpoint.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Flutter 3.x (for mobile)
- Firebase project with Email/Password auth enabled (optional for local dev)

### 1. Environment
```bash
cp .env.example .env
# Place firebase-service-account.json in backend/ (optional for DevAuth pilot)
```

### 2. Start infrastructure
```bash
docker-compose up -d postgres redis
```

### 3. Backend
```bash
cd backend
npm ci
# Set DIRECT_URL for migrations (same as DATABASE_URL for local Docker)
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

Database migrations run **out-of-band** (Cloud Run Job or launch checklist), never on web service container boot. See `scripts/run-db-init-job.ps1`.

### 4. Web & API (monorepo)
```bash
npm install
npm run dev:backend   # NestJS API on :8080 (uses backend/dist)
npm run dev:web       # Vite dashboard on :5173
```

Or from package folders:
```bash
cd web && npm install && npm run dev
```

### 5. Mobile
```bash
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter run --dart-define=INTEGRATION_FLOW=true --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

Closed-test bundle (requires working Gradle/Java trust store):
```bash
flutter build appbundle --dart-define=INTEGRATION_FLOW=true --dart-define=API_BASE_URL=https://myndora-care-backend.onrender.com/api/v1
```

### 6. Dual-deploy pipeline (simulation then promote)

Single codebase; separate Cloud Run services, Firebase Hosting sites, and databases.

| | Simulation | Production |
|--|------------|------------|
| Web | `simulation.myndoracare.com` (site `myndora-care-simulation`) | `*.web.app` (site `project-681c9d16-2470-459b-8a1`) |
| API | `myndora-backend-api-sim` (`ENVIRONMENT=simulation`) | `myndora-backend-api` → `api.myndoracare.com` |
| DB | `SIMULATION_DATABASE_URL` (required, distinct) | prod pooler on Cloud Run |

```powershell
# Set isolated simulation DB (never reuse production URLs)
$env:SIMULATION_DATABASE_URL = "postgresql://postgres.<sim-ref>:...@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:SIMULATION_DIRECT_URL   = "postgresql://postgres.<sim-ref>:...@db.<sim-ref>.supabase.co:5432/postgres"
$env:SIMULATION_SUPABASE_PROJECT_REF = "<sim-ref>"

# 1) Validate on simulation
powershell -File scripts\deploy-simulation.ps1

# 2) After certification, promote the same image to production
powershell -File scripts\promote-production.ps1 -FromSimulation
```

Feature flags: backend `ENVIRONMENT=simulation|production` (alias `APP_ENV`); web `VITE_ENVIRONMENT` via `.env.simulation` / `.env.production`.

### 7. Legacy single-env deploy (Firebase Hosting + Cloud Run)

```powershell
# 1. Cloud Run API (prerequisite for Firebase /api/v1 rewrite)
powershell -File scripts\deploy-cloud-run.ps1 -ProjectId YOUR_GCP_PROJECT -DatabaseUrl "postgresql://..."

# 2. Firebase Hosting
cd web
npm run build
npm run deploy:hosting   # requires: firebase login
```

Or use the all-in-one hosting script:
```powershell
powershell -File scripts\deploy-firebase-hosting.ps1
```

### 8. Post-deploy verification

Automated smoke tests (7 checks including Firebase `/api/v1/health` rewrite):

```powershell
# Phase 1 only — migrate + seed production DB (use DIRECT_URL for Supabase)
powershell -File scripts\launch-checklist.ps1 -SeedOnly `
  -DatabaseUrl "postgresql://...@...:6543/postgres?pgbouncer=true" `
  -DirectUrl "postgresql://...@...:5432/postgres"

# Or Cloud Run Job
powershell -File scripts\run-db-init-job.ps1 -DirectUrl "postgresql://..." -DatabaseUrl "postgresql://..."

# Post-deploy smoke (assumes seed already ran)
powershell -File scripts\launch-checklist.ps1 -BaseUrl "https://YOUR_PROJECT.web.app" -SkipSeed

# Seed + smoke in one run
powershell -File scripts\launch-checklist.ps1 `
  -BaseUrl "https://YOUR_PROJECT.web.app" `
  -DatabaseUrl "postgresql://..."
```

## Demo Credentials

Password for all accounts: `DemoPass123!`

| Role | Email |
|------|-------|
| Patient (Yellow) | grace.patient@myndora.demo |
| Patient (Green) | musa.patient@myndora.demo |
| Patient (Red) | esther.patient@myndora.demo |
| Caregiver | tunde.caregiver@myndora.demo |
| CHW | amina.chw@myndora.demo |
| Pharmacy | pharmacy@myndora.demo |
| Clinician | doctor@myndora.demo |
| Lab | lab@myndora.demo |
| Admin | admin@myndora.demo |
| Super Admin | superadmin@myndora.demo |

## API

Base URL: `http://localhost:8080/api/v1`

Health: `GET /health`

CHW activation: `GET /chw/profile`, `PATCH /chw/activation` (admin)

Care services: `POST /remote-checks`, `POST /physical-visits`, `PATCH /physical-visits/:id/complete`

Escalations: `GET /escalations/review-queue`

## Mock Integrations

Set in `.env` for local development without external API keys:
- `MOCK_PAYSTACK=true`
- `MOCK_AT=true`
- `MOCK_GCS=true`

Swap to live by setting mocks to `false` and providing real credentials.

---
Powered by Myndora Solutions
