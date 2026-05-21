# Telegram Directory Assistant

Mobile-first PWA that imports posts from public Telegram channels, extracts
structured fields, and lets users search, filter, and open listings.

**MVP scope**: Uzbekistan real estate — rent, sale, daily rent.
The schema and code are deliberately category-agnostic so future verticals
(cars, jobs, services) plug in without major refactors.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase Postgres via Drizzle ORM (postgres.js driver)
- **Auth**: Supabase Auth via `@supabase/ssr`
- **PWA**: manifest in `public/manifest.json` (service worker arrives in Phase 5)
- **Hosting**: Railway (target) + Supabase (DB + Auth)

## Phase 1 status — what's done

| Area | Status |
| --- | --- |
| Next.js 16 scaffold (src/app, Tailwind, Turbopack) | ✅ |
| Drizzle schema (countries, categories, locations, channels, raw_messages, listings, user_profiles, saved_listings, saved_searches) | ✅ |
| Initial migration `drizzle/0000_init.sql` | ✅ |
| Idempotent seed script with ~45 realistic UZ listings | ✅ |
| Source-agnostic ingestion abstraction (mock + Telegram stub + real-estate extractor) | ✅ |
| Supabase clients (server, browser, session refresh in `src/proxy.ts`) | ✅ |
| `GET /api/listings` cursor-paginated with filters | ✅ |
| `GET /api/listings/[id]` detail | ✅ |
| Env validation via Zod, PWA manifest, placeholder landing page | ✅ |

No user-visible UI yet beyond the placeholder. Search UI is Phase 2.

## Setup

```bash
# 1. Install deps
pnpm install

# 2. Configure env
cp .env.example .env.local
# Fill in DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Use the Supabase "Transaction" pooled connection string (port 6543).

# 3. Apply schema + seed data
pnpm db:migrate
pnpm db:seed

# 4. Run dev server
pnpm dev
```

Open <http://localhost:3000>. Hit `/api/listings` to see the seeded feed.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate a new Drizzle migration from the schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev convenience; skips migration history) |
| `pnpm db:studio` | Drizzle Studio (visual DB explorer) |
| `pnpm db:seed` | Reset + load mock UZ real estate seed data |
| `pnpm ingest:mock` | Run the mock ingestion source through the pipeline |

## Project layout

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  Phase 1 placeholder landing
│   └── api/listings/
│       ├── route.ts              GET /api/listings (filters, cursor pagination)
│       └── [id]/route.ts         GET /api/listings/[id]
├── db/
│   ├── index.ts                  Drizzle client + closeDbPool()
│   ├── migrate.ts                One-shot migration runner
│   ├── seed.ts                   Idempotent seed
│   ├── schema/                   One file per table + barrel
│   └── seed-data/                Mock cities, channels, listings
├── lib/
│   ├── env.ts                    Zod-validated env (fails fast)
│   ├── listings/query.ts         fetchListings() + fetchListingById()
│   ├── supabase/
│   │   ├── client.ts             Browser client
│   │   ├── server.ts             Server Components / Route Handlers
│   │   └── middleware.ts         Session-refresh helper (used by proxy.ts)
│   └── ingestion/
│       ├── types.ts              IngestionSource interface
│       ├── mock.ts               Canned messages for tests / seed
│       ├── telegram.ts           Stub — implemented in Phase 4
│       ├── pipeline.ts           Source-agnostic ingest pipeline
│       ├── extract/
│       │   ├── types.ts          Extractor interface
│       │   └── real-estate.ts    Regex-based price/rooms/area parser
│       └── run-mock.ts           CLI entry: `pnpm ingest:mock`
└── proxy.ts                      Next.js 16 proxy (refreshes Supabase session)
```

## Architecture notes

### Category-agnostic listings

The `listings` table stores common fields (price, location, contact) as
columns and category-specific fields (`rooms`, `area_sqm`, `mileage`, ...)
in a JSONB `attributes` column with a GIN index. This keeps the schema
flexible — adding cars or jobs doesn't require new tables, just a new
extractor under `src/lib/ingestion/extract/`.

### Source-agnostic ingestion

`IngestionSource` is the only interface the pipeline knows about. The
mock implementation drives Phase 1; the Telegram implementation lands in
Phase 4 without changing anything downstream.

### Why `src/proxy.ts`, not `middleware.ts`

Next.js 16 renamed the `middleware` file convention to `proxy`. We use it
to call `supabase.auth.getUser()` on every matched request so the session
cookie stays fresh. The matcher excludes static assets.

## Acceptance tests for Phase 1

Before moving to Phase 2, verify:

- [ ] `pnpm install` succeeds on a clean checkout
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm db:migrate` against a real Supabase Postgres applies the
      single `0000_init` migration without errors
- [ ] `pnpm db:seed` produces ~45 listings, distributed across rent / sale / daily
- [ ] `curl http://localhost:3000/api/listings | jq '.items | length'` returns 20
- [ ] `curl 'http://localhost:3000/api/listings?type=daily&citySlug=tashkent'` returns daily-rent items only
- [ ] `curl http://localhost:3000/api/listings/<id>` returns a single listing with `city`, `channel`, `attributes`
- [ ] `pnpm ingest:mock` ingests the canned mock messages without errors and is idempotent on rerun

## What ships in Phase 2

- Mobile-first home screen with search bar, type filter chips, city filter
- Listing card + infinite scroll
- Listing detail page with media gallery, contact, "Open in Telegram"
- Saved-search UI scaffold
