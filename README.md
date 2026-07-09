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
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

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

### 6. Deploy (Firebase Hosting + Cloud Run)

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

### 7. Post-deploy verification

Automated smoke tests (7 checks including Firebase `/api/v1/health` rewrite):

```powershell
# Phase 1 only — migrate + seed production DB
powershell -File scripts\launch-checklist.ps1 -SeedOnly -DatabaseUrl "postgresql://..."

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

Vitals: `POST /vitals`, `GET /vitals/patient/:patientId/trend`, `GET /vitals/review-queue`

## Mock Integrations

Set in `.env` for local development without external API keys:
- `MOCK_PAYSTACK=true`
- `MOCK_AT=true`
- `MOCK_GCS=true`

Swap to live by setting mocks to `false` and providing real credentials.

---
Powered by Myndora Solutions
