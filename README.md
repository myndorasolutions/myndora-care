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
backend/workers    Cloudflare Workers API (placeholder)
supabase           Database migrations (placeholder)
shared-assets      Logos, audio, splash, and design reference
```

## Web admin

```bash
cd apps/web-admin
npm install
npm run dev
```

## Historical UI

These deployed builds are reference only. They are not this repository's runtime.

- Simulation: https://myndora-care-simulation.web.app/
- Platform: https://myndora-care-platform-b5ma-qgxw4ybmk.vercel.app/
