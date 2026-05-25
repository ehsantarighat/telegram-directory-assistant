# Telegram Directory Assistant

Mobile-first PWA that turns posts from public Telegram channels into a
searchable, filterable, multilingual directory. MVP vertical: **Uzbekistan
real estate** — rent, sale, and daily rentals.

The schema, ingestion pipeline, and extractor interface are deliberately
category-agnostic. Adding cars, jobs, or services post-MVP means writing
a new extractor and seeding channels — no schema rewrites.

---

## What's in the MVP

- Search-first home page → /listings feed with infinite scroll
- Filters drawer (city, district, type, rooms, price range, area, currency, recency, photos-only)
- Listing detail page with media gallery, all source posts, contact, "Open in Telegram"
- Save listings + saved searches (auth-gated, durable to DB)
- Per-listing translation toggle (EN / RU / UZ / FA / AR) with persistent cache
- "Suggest a channel" flow with auth-gated form + community queue
- Report listing (removal request) flow with admin queue
- Full admin panel: dashboard, channels CRUD, suggestions review, listings table,
  removal queue, team management (promote/demote)
- Mock ingestion source + "Run sync" button in admin to exercise the pipeline
  end-to-end without a real Telegram worker
- PWA manifest + SVG icon, route-level loading skeletons, persistent transparency
  footer

What's **not** in the MVP, by design:

- Real Telegram ingestion worker (the pipeline is built and tested against a
  mock source; swapping in the real source is a Phase-Later task — see below)
- Real LLM translation provider (mock provider in place, swap-in is one file)
- Email/push alerts for saved searches (UI says "Alerts coming soon")
- AI-powered field extraction (rule-based regex extractor today)
- Image-hash dedup (signature-based dedup placeholder today)

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict |
| Routing entry | `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`) |
| Styling | Tailwind CSS v4 + shadcn (`base-nova` style, Base UI primitives) |
| Forms / dialogs | Base UI (`@base-ui/react`) + React 19 `useTransition` / `useActionState` |
| Database | Supabase Postgres via Drizzle ORM (postgres.js driver, SSL relaxed for Supabase pooler) |
| Auth | Supabase Auth via `@supabase/ssr` (cookie-based, session refreshed in proxy) |
| Toasts | `sonner` |
| Icons | `lucide-react` + custom SVG brand icon (`public/icon.svg`) |
| RTL font | Vazirmatn (woff2, self-hosted via `next/font/local`) for Persian/Arabic |
| Hosting (target) | Railway (web) + Supabase (DB + Auth) |
| Package manager | pnpm 10.33+ |
| Node | ≥ 20 |

---

## Setup

```bash
# 1. Install deps
pnpm install

# 2. Configure env (see "Required environment variables" below)
cp .env.example .env.local
# Fill in DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Sanity-check env vars + ping Supabase
pnpm env:check

# 4. Apply migrations (creates 11 tables + handle_new_user trigger)
pnpm db:migrate

# 5. (Optional) Run dev server
pnpm dev
```

Open <http://localhost:3000>. On a fresh DB you'll see an empty feed — the
admin "Run sync" button on `/admin/channels` exercises the mock ingestion
pipeline if you want sample data, or wipe and seed via the snippets below.

### First admin user

Two paths:

1. **Promote yourself in SQL** (recommended for the first admin):

   ```sql
   update public.user_profiles set role = 'admin' where email = 'you@example.com';
   ```

2. **Or via `/admin/team`** after another admin promotes you.

Once you have one admin, all subsequent admin/demote operations happen in
the UI at `/admin/team` — no more hardcoded admin emails, no env vars.
The `/admin` layout guards every admin route via `requireAdmin()`.

---

## Required environment variables

The deployed app needs four values. Validation flow:

- `src/lib/env.ts` — Zod schema, validated **lazily** on first access. The
  build doesn't crash on missing vars; the first request that touches `env.X`
  does, with a clear list of what's missing.
- `src/instrumentation.ts` — touches all required vars at server boot. If
  any are missing, the server refuses to start and logs `[env] ✗ FATAL` to
  the deploy logs. Healthy boots log `[env] ✓ all required env vars validated`.
- `scripts/check-env.ts` — `pnpm env:check`: a CLI you run locally before
  every deploy. Validates every required var, parses URLs, flags stray
  quotes, and live-pings Supabase Postgres.

| Variable | Required | Source |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Supabase → Connect → **ORM** → Transaction pooler (port 6543). Must end with `?sslmode=require`. **No surrounding quotes anywhere in the value.** |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → Data API → `Project URL` (`https://<project-id>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API Keys → publishable key (`sb_publishable_…` or legacy `eyJ…`) |
| `NEXT_PUBLIC_SITE_URL` | optional | Public origin (`https://your.app`). Used for absolute URLs in Supabase email links. Defaults to localhost. |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only; reserved for future admin operations. Not consumed yet. |

### Keeping env vars safe on Railway

Railway doesn't lock vars against deletion. Defense in depth:

1. **Keep a copy outside Railway** (password manager). Re-adding takes 60s, not an evening.
2. **Run `pnpm env:check` before every deploy.** Catches missing vars, typos, paused Supabase projects, and stray `"` in `DATABASE_URL` *before* push.
3. **Watch for the boot log** — `[env] ✓ all required env vars validated`. If missing, the line above it says exactly which key broke.
4. **Build never crashes on missing vars.** Lazy env means the build always succeeds; the failure is loud at server boot, not silent at first request.
5. **Use Railway project-level shared variables** if you grow to multiple services.

If a variable goes missing in production:

1. Railway boot-fails. Deploy logs show `[env] ✗ FATAL — server refusing to start:` with the bad keys.
2. Re-add the value from your password manager.
3. Railway auto-redeploys; next boot logs `[env] ✓` and traffic resumes.
4. Run `pnpm env:check` locally afterwards to catch any drift.

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run the built server |
| `pnpm typecheck` | `tsc --noEmit` against the whole repo |
| `pnpm lint` | ESLint (Next core-web-vitals + react-hooks v6 rules) |
| `pnpm env:check` | Validate every required env var + live-ping Supabase |
| `pnpm db:generate` | Generate a new Drizzle migration from `src/db/schema/*` |
| `pnpm db:migrate` | Apply pending migrations against `DATABASE_URL` |
| `pnpm db:push` | Push schema directly (dev convenience — skips history) |
| `pnpm db:studio` | Drizzle Studio (visual DB explorer) |
| `pnpm db:seed` | Wipe + load mock channels / listings / translations |
| `pnpm db:wipe -- --yes` | Truncate listing-related tables; keep auth users + categories |
| `pnpm ingest:mock` | CLI: run the mock ingestion source through the pipeline |

---

## Routes

User-facing (group `(marketing)`):

| Route | Purpose |
| --- | --- |
| `/` | Search-first landing, popular cities / property-types, sample feed |
| `/listings` | Full feed with search, filters drawer, sort, infinite scroll, "Save search" |
| `/listings/[id]` | Detail: media gallery, facts grid, sources list, contact, translate, save, share, report |
| `/saved` | Signed-in user's saved listings |
| `/profile` | Account preferences, role, saved searches |
| `/suggest-channel` | Auth-gated submit form + the user's queue of past suggestions |

Auth (group `(auth)`):

| Route | Purpose |
| --- | --- |
| `/login` | Email + password sign-in |
| `/signup` | Email + password sign-up (handle_new_user trigger creates `user_profiles`) |
| `/auth/callback` | Supabase OAuth/email-confirm landing |

Admin (`requireAdmin()` gate on the layout):

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard: 8 KPIs (channels, listings by type, suggestions queue, removal queue, last ingest) |
| `/admin/channels` | CRUD telegram channels; "Run sync" button to fire the mock ingestion |
| `/admin/channel-suggestions` | Review user-submitted channel suggestions (accept / reject) |
| `/admin/listings` | Listings table with status filter; soft-delete + restore |
| `/admin/removal-requests` | Removal queue from reports; approve removes the listing |
| `/admin/team` | Promote / demote admins; guards against demoting the last admin or self |

API (`/api/*`):

| Route | Purpose |
| --- | --- |
| `GET /api/listings` | Cursor-paginated feed (same shape the UI uses) |
| `GET /api/listings/[id]` | Detail JSON |
| `POST /api/listings/[id]/save` / `DELETE` | Save / unsave (auth required) |
| `POST /api/listings/[id]/translate?lang=…` | On-demand translation, cache-first |

---

## Search, filters, saves

- **Search bar** is debounced (`SearchBar` + `useDebouncedValue`). State lives in URL params, so back/forward, deep-links and "Save search" all work.
- **Filters drawer** (`FiltersDrawer`) holds basic and advanced filters; clear/all controls in the chip strip (`ActiveFilterChips`).
- **Sort** options: newest first, price ↑/↓, area ↑/↓ (`SortSelect`).
- **Save search** (`/listings`) snapshots the current query string into `saved_searches`. List + manage from `/profile`. Alerts are a Later Prompt — UI labels say "Alerts coming soon" rather than faking it.
- **Save listing** uses a transactional `save_listings.insert` + `listings.saved_count += 1`. The unsave path mirrors it. Optimistic UI in `SaveButton`.

---

## Translation

`src/lib/translation/` is a tiny abstraction:

```
types.ts      TranslationProvider interface + TargetLanguage union
mock.ts       MockTranslationProvider (returns a tagged echo)
cache.ts      Read/write listing_translations rows
index.ts      translateListing(): cache-first, falls back to provider, swallows errors
```

The detail page reads `?lang=` from the URL via `TranslationToggle`, calls
`POST /api/listings/[id]/translate?lang=…`, and the response is rendered with
`dir="rtl"` for `fa`/`ar`. The Vazirmatn font ships RTL-correct.

Swapping in a real LLM (OpenAI / Claude / Gemini) is two lines:

1. Add `openai.ts` (or `claude.ts`) implementing `TranslationProvider`
2. Change `const provider = new MockTranslationProvider();` to the new class

All cached rows stay valid; new rows record the new provider name.

---

## Ingestion

End-to-end real ingestion against any public Telegram channel.

### Source: `TelegramWebSource`

`src/lib/ingestion/telegram-web.ts` scrapes `https://t.me/s/<username>`
— Telegram's server-rendered public preview page. No auth, no Bot API,
no MTProto. Works for any channel marked "public" in Telegram.

- Paginates backwards via `?before=<message_id>` until either **100 posts**
  or **6 months** is reached (whichever hits first)
- Telegram-grouped photo albums (one logical post split across many
  message ids) collapse naturally into a single message wrap with
  multiple photo URLs — that's where multi-photo listings come from
- Subsequent syncs honour `telegram_channels.last_synced_at` so only
  new posts get processed
- Hot-links photos from `*.telesco.pe` via `next/image` (re-hosting in
  Supabase Storage is a later optimisation)

### Extraction: composite (LLM + regex)

Each scraped post is run through `CompositeRealEstateExtractor`
(`src/lib/ingestion/extract/composite.ts`):

1. **LLM first** — `LlmRealEstateExtractor` calls Anthropic Claude
   Haiku via `tool_use` for strict structured output. The model reads
   each post on its own terms (bullet template, free prose, mixed
   RU/UZ/EN, abbreviated tags) and projects it onto our schema.
   Enabled when `ANTHROPIC_API_KEY` is set.
2. **Regex fallback** — `RealEstateExtractor` handles the common UZ
   realty bullet format (`• Количество комнат:`, `• Площадь:`, `• Цена:`,
   …) plus free-text regex. Used when the LLM is unavailable, errors,
   times out, or returns invalid output.

Re-ingestion safety in `pipeline.ts` (the `primary_raw_post_id` check)
prevents re-charging the LLM for the same raw post on subsequent syncs.
First successful sync pays; everything else is free.

### Dedup

`src/lib/ingestion/dedup.ts` is signature-based today (md5 of
title + price + phone). Image-hash + LLM-similarity dedup is a future
enhancement. The unique index on `(telegram_channel_id, telegram_message_id)`
in `raw_telegram_posts` already makes the whole pipeline idempotent at
the raw-post layer.

### Entry points

- **Admin UI**: `/admin/channels` → **Run sync** on any channel row.
- **CLI (mock fixtures only)**: `pnpm ingest:mock` runs a canned source
  through the same pipeline.
- **Auto on channel add**: inserting a channel via the admin form
  immediately triggers an initial backfill (100 posts / 6 months).
- **Cron (`pnpm sync:due`)**: picks every channel whose
  `last_synced_at + sync_interval_minutes` has elapsed and syncs them
  sequentially. See "Auto-sync cadence" below.

### Auto-sync cadence

Each `telegram_channels` row has a `sync_interval_minutes` column
(default `60`). The admin edit form exposes it — set busy channels to
`15-30`, slow channels to `360`+, or `0` to disable auto-sync for a
specific channel (manual **Run sync** still works).

To run the cron automatically, add a **Railway cron service** in the
same project:

1. Railway dashboard → your project → **+ New service** → **Empty Service**.
2. Settings → **Source** → connect the same GitHub repo as the web app.
3. Settings → **Deploy** → **Start command**: `pnpm sync:due`.
4. Settings → **Cron** → `*/10 * * * *` (every 10 min). Adjust to taste:
   `*/5` for more frequent, `0 * * * *` for hourly.
5. Settings → **Variables** → click **"Shared Variables"** so it
   inherits `DATABASE_URL`, `SUPABASE_*`, `ANTHROPIC_API_KEY` from the
   web service. Without these the script can't run.

The script exits **0** even when individual channels fail (so the cron
doesn't keep alerting). Per-channel failures show up in the admin
**/admin/channels** page like any other sync — `lastSyncError` carries
a readable summary.

**Tick-vs-cadence interplay**: the cron tick should be **lower** than
your shortest `sync_interval_minutes`. A 60-min interval with a 10-min
cron tick means the channel is checked 6 times per hour, but only
synced once (when its interval has elapsed). A 60-min interval with a
60-min cron tick can drift to 119 min between syncs in the worst case
— so keep the tick frequent and let the per-channel intervals do the
scheduling.

**External alternative** (cron-job.org, GitHub Actions): also works.
Expose `pnpm sync:due` behind a `/api/cron/sync` endpoint protected by
a `CRON_SECRET` header check, then point an external scheduler at it.
Adds a network hop and a shared secret to manage, but works if you
don't want a second Railway service.

---

## Project layout

```
src/
├── app/
│   ├── (auth)/                       login + signup
│   ├── (marketing)/                  landing, /listings, /listings/[id], /saved, /profile, /suggest-channel
│   ├── admin/                        admin shell + 6 pages (gated by requireAdmin)
│   ├── api/listings/                 GET /api/listings + [id] + save + translate
│   ├── auth/callback/                Supabase email-confirm / OAuth landing
│   ├── layout.tsx                    Root layout (font, metadata, icons)
│   ├── globals.css                   Tailwind v4 entry + base-nova tokens
│   └── loading.tsx / error.tsx / not-found.tsx
├── components/
│   ├── filters/                      FiltersDrawer, ActiveFilterChips, filter-state
│   ├── listings/                     ListingCard, MediaGallery, SourcesPanel, FactsGrid, ContactCard, Save/Share/Report, TranslationToggle
│   ├── search/                       SearchBar, SortSelect, ListingFeedInfinite, SaveSearchButton
│   ├── shell/                        TopBar, MobileNav, AppShell, AdminShell, AdminSidebar, SourceFooter
│   ├── states/                       Empty, Error, PageSection, Skeleton primitives
│   └── ui/                           shadcn base-nova components
├── db/
│   ├── index.ts                      postgres.js client + relaxed SSL for Supabase pooler
│   ├── migrate.ts                    One-shot migration runner
│   ├── seed.ts                       Idempotent seed entry
│   ├── schema/                       One file per table + barrel (11 tables)
│   └── seed-data/                    Mock channels / listings / translations
├── lib/
│   ├── admin/                        Server actions + queries: channels, suggestions, listings, removals, team, ingestion, stats
│   ├── auth/                         getUser / getProfile / requireUser / requireAdmin / actions / profile-actions
│   ├── channel-suggestions/          Submit action + queue queries + URL/username normalizer
│   ├── env.ts                        Lazy Zod-validated env (Proxy)
│   ├── format/                       Price / date / label helpers
│   ├── ingestion/                    Source-agnostic pipeline + mock + real-estate extractor + dedup
│   ├── listings/                     fetchListings + fetchListingById + facets + save/unsave
│   ├── removal-requests/             Report submit action
│   ├── saved-searches/               Submit + list queries
│   ├── supabase/                     server / browser / middleware clients
│   ├── translation/                  Provider abstraction + cache + mock + index
│   └── utils.ts                      cn() etc.
├── instrumentation.ts                Boot-time env validation (Node runtime only)
└── proxy.ts                          Refreshes Supabase session cookie on every request

drizzle/
├── 0000_init.sql                     11-table schema + indexes
└── 0001_user_profile_trigger.sql     handle_new_user(): inserts user_profiles row on auth.users insert

scripts/
├── check-env.ts                      pnpm env:check
└── wipe-data.ts                      pnpm db:wipe -- --yes

public/
├── icon.svg                          PWA icon (gradient + send glyph)
└── manifest.json                     PWA manifest
```

---

## Architecture notes

### Category-agnostic, but real-estate-first

The `listings` table stores common fields (price, location, contact, media)
as columns *plus* real-estate-specific top-level columns (`rooms`, `area_sqm`,
`floor`, `furnished`, …). This was a deliberate choice over a JSONB
`attributes` blob: top-level columns are easier to query, index, and
sort by. When we add cars, we'll spin up a `vehicles` table with the same
shape (FK to `listings`) rather than overload `attributes`. See
`src/db/schema/listings.ts`.

### Source-agnostic ingestion

`IngestionSource` is the only interface the pipeline knows about
(`src/lib/ingestion/types.ts`). The mock source drives Phase 10; the
real Telegram source plugs in without touching downstream code.

### Why `src/proxy.ts`, not `middleware.ts`

Next.js 16 renamed `middleware` → `proxy` to disambiguate from
general-purpose middleware (and partly in response to CVE-2025-29927).
We use it to call `supabase.auth.getUser()` on every matched request so
the session cookie stays fresh. The matcher excludes static assets.

### Defense-in-depth env protection

`src/lib/env.ts` (lazy validation), `src/instrumentation.ts` (boot-time
fail-fast), and `scripts/check-env.ts` (`pnpm env:check`) form three
layers: build never crashes on env, boot is loud about missing keys, and
deploys never go out without a pre-flight check. See the env section above.

---

## Known limitations

- **Public channels only.** `TelegramWebSource` reads `t.me/s/<username>`,
  which only works for channels Telegram exposes as "public preview".
  Private channels need an MTProto-based ingester (Telethon-style worker).
- **Mock translation.** `MockTranslationProvider` returns a tagged echo.
  Real LLM is a one-file swap (see Translation section above).
- **LLM extractor is opt-in.** Without `ANTHROPIC_API_KEY`, ingestion
  uses the rule-based extractor only, which is good enough for the
  common UZ realty bullet format but degrades on unstructured posts.
- **No alerts.** Saved searches are durable; sending email/push is a Later Prompt. UI says so explicitly.
- **No image-similarity dedup.** Signature-based dedup (md5 of title + price + phone) is a placeholder; image-hash + LLM-similarity is a Later Prompt.
- **No rate limiting.** Auth endpoints rely on Supabase's defaults. Add CDN-level limits if you open ingestion endpoints to the public.
- **Single-region deploy.** Railway web + Supabase AP-Southeast-1. Add edge cache + multi-region read replicas only if traffic justifies it.

---

## Acceptance — what "MVP done" means

- `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean on a fresh checkout
- `pnpm db:migrate` applies both migrations against a real Supabase Postgres
- `pnpm db:seed` (or "Run sync" in admin) populates listings, sources, translations
- Anonymous user: home → search → filter → open detail → toggle translation → "Open in Telegram"
- Signed-in user: save listing → /saved → save search → /profile
- Admin (`/admin`): every CRUD flow round-trips; team management refuses to demote the last admin or self
- Boot logs `[env] ✓ all required env vars validated` on every successful Railway deploy
