# Myndora Care

Nigeria-first chronic care coordination platform for hypertension and diabetes management. A core product under **Myndora Solutions**.

The legacy Google Cloud and Firebase stack is archived on the `legacy-gcp-archive` branch. This repository is the clean-slate monorepo for the serverless stack.

## Stack

| Surface | Technology | Location |
| --- | --- | --- |
| Web admin | Next.js (App Router, TypeScript, Tailwind CSS) | `apps/web-admin` |
| CHW mobile | Flutter | `apps/mobile-chw` |
| API | Cloudflare Workers | `backend/workers` |
| Database and auth | Supabase | `supabase` |

Brand logos, audio prompts, splash screens, and UI design references live in `shared-assets`.

## Layout

```
apps/web-admin     Next.js web admin
apps/mobile-chw    Flutter CHW app (placeholder)
backend/workers    Cloudflare Workers API
supabase           Database migrations (placeholder)
shared-assets      Logos, audio, splash, and design reference
```

## Web admin

```bash
cd apps/web-admin
npm install
npm run dev
```

## Cloudflare Workers

The web admin deploys as the Worker `myndora-care` with OpenNext. Cloudflare should build before deploy:

- Root directory: `apps/web-admin`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

`npm run build` runs `opennextjs-cloudflare build`, which produces `.open-next/worker.js`. `WORKER_SELF_REFERENCE` points at `myndora-care`. Incremental cache uses static assets, so no `NEXT_INC_CACHE_R2_BUCKET` binding is required.

## Workers API

Paystack checkout, Africa's Talking notifications, and R2 visit proofs run in `backend/workers`.

```bash
cd backend/workers
npm install
npx wrangler dev
```

The local worker listens on `http://localhost:8787`. Copy `.dev.vars.example` to `.dev.vars` before adding live keys. Empty Paystack and Africa's Talking keys stay in mock mode. The web admin reads `NEXT_PUBLIC_WORKER_API_URL` and falls back to the same mock checkout when the worker is unreachable.

## Historical UI

These deployed builds are reference only. They are not this repository's runtime.

- Simulation: https://myndora-care-simulation.web.app/
- Platform: https://myndora-care-platform-b5ma-qgxw4ybmk.vercel.app/
