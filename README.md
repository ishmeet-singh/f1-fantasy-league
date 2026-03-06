# F1 Fantasy League

Minimal, production-ready Formula 1 prediction league for private groups.

## Tech stack
- Next.js 14 (App Router + TypeScript + Tailwind)
- Supabase (Postgres + Magic Link Auth)
- OpenF1 API for calendar/session results
- Vercel hosting + GitHub Actions scheduled jobs

## Core functionality
- Magic-link login
- Leaderboard with **best 20 weekend scores**
- Picks:
  - Qualifying Top 3
  - Sprint Top 10 (sprint weekends only)
  - Race Top 10
- Server-side deadline locking
- Deterministic scoring engine (full recomputation safe)
- Automatic OpenF1 sync (calendar + results)
- Admin actions (manual sync + recompute)

## Scoring
Per driver:

`points = max_points - (abs(predicted_position - actual_position) * penalty)`

Min per-driver score is `0`.
If a driver is outside Top 10 or DNF, actual position is treated as `20`.

### Parameters
- Qualifying: `max=12`, `penalty=4`
- Sprint: `max=10`, `penalty=2`
- Race: `max=12`, `penalty=2`

### Bonuses
- Exact qualifying top-3 order: `+6`
- Exact sprint podium order: `+10`
- Exact race podium order: `+10`

### Tiebreakers
1. Lowest total prediction error
2. Most exact position matches
3. Highest single weekend score

## Local setup
1. Configure npm access (important in restricted networks):
   ```bash
   npm run setup:npm
   npm run diagnose:network
   ```
   If your environment blocks npmjs, set a mirror first:
   ```bash
   export NPM_REGISTRY_URL=https://<your-internal-npm-registry>/
   npm run setup:npm
   npm run diagnose:network
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
4. Fill `.env.local` values.
5. In Supabase SQL editor, run:
   - `supabase/schema.sql`
6. Start app:
   ```bash
   npm run dev
   ```

## Environment variables
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENF1_BASE_URL=https://api.openf1.org
ADMIN_ALLOWLIST=you@example.com
CRON_SECRET=replace-with-a-long-random-string
```

## Supabase setup
1. Create a new Supabase project.
2. Enable Email provider with Magic Link auth.
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
4. Run `supabase/schema.sql`.
   - Includes RLS policies.
   - Includes `auth.users -> public.users` trigger.

## OpenF1 ingestion
Implemented via:
- `lib/openf1.ts`
- `lib/sync.ts`

What gets synced:
- Drivers
- Season meetings/calendar
- Session classifications (quali/sprint/race)

Sync behavior:
- Results sync endpoint re-syncs races inside a 48h window after race start.
- After ingest, full score recomputation runs.

## Vercel deployment (no CLI required)
Use the Vercel dashboard if `vercel` CLI is unavailable:
1. Push this repo to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Set all environment variables in Vercel Project Settings.
4. Deploy.
5. Add these GitHub repository secrets:
   - `APP_BASE_URL` = your production URL (e.g. `https://your-domain.com`)
   - `CRON_SECRET` = same value as Vercel `CRON_SECRET` env var
6. Enable workflow `.github/workflows/season-cron.yml`.

## Vercel deployment (CLI optional)
If Vercel CLI is available and authenticated:
```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## CI / build verification
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
- npm network diagnostics
- dependency install
- production build

## Cron setup (free tier)
Configured in `.github/workflows/season-cron.yml`:
- `/api/cron/sync-results` every 30 minutes
- `/api/cron/sync-calendar` every 6 hours
- `/api/cron/recompute` hourly

All cron routes require `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`) and will reject unauthenticated requests.

## Admin setup
- Put authorized emails in `ADMIN_ALLOWLIST`.
- Admin UI: `/admin`
- Actions:
  - Refresh race results
  - Recompute all scores

## Security notes
- Deadline lock is enforced server-side in `app/api/picks/route.ts`.
- Duplicate drivers per event are blocked client-side and server-side.
- Auth-protected routes are enforced via `middleware.ts`.
- Service role key is only used in server/admin/cron code.

## Build
```bash
npm run build
```
