# Agent Handoff Context (Offline Execution)

This file is for a local/offline coding agent that will continue this project on your own machine.

## Project overview
- App: Private Formula 1 fantasy prediction league.
- Stack: Next.js 14 + TypeScript + Tailwind + Supabase + OpenF1.
- Auth: Supabase magic link.
- Infra target: Vercel + Supabase (free tiers).

## Repository contents
- Frontend pages: `app/*`
- API routes: `app/api/*`
- Shared logic: `lib/*`
- UI component(s): `components/*`
- DB schema: `supabase/schema.sql`
- Cron config: `vercel.json`
- Network setup helpers: `scripts/setup-npm.sh`, `scripts/diagnose-network.mjs`

## Current known gaps / missing production hardening
1. **No dependency install in this execution environment**
   - This environment blocks npm registry access (HTTP 403 via proxy).
   - Local agent should install dependencies in your local network.

2. **No successful local build run here**
   - `npm run build` has not been validated in this environment due to install failure.

3. **No end-to-end run against a live Supabase project here**
   - Local agent should connect real Supabase keys and run full auth/picks/results flow.

4. **No live deployment from this environment**
   - Vercel CLI is unavailable here; deploy from your local machine or dashboard.

5. **No automated test suite yet**
   - There is a CI build workflow, but no unit/integration tests.

## Local agent checklist (do these in order)

### 1) Setup dependencies
```bash
npm run setup:npm
npm run diagnose:network
npm install
```
If registry is blocked, set internal mirror:
```bash
export NPM_REGISTRY_URL=https://<your-internal-npm-registry>/
npm run setup:npm
npm run diagnose:network
npm install
```

### 2) Configure environment
```bash
cp .env.example .env.local
```
Fill:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENF1_BASE_URL` (default `https://api.openf1.org`)
- Optional `OPENF1_USERNAME` / `OPENF1_PASSWORD` — OpenF1 returns 401 for all endpoints while a live F1 session runs unless authenticated ([openf1.org/auth.html](https://openf1.org/auth.html)).
- `ADMIN_ALLOWLIST`

### 3) Supabase setup
- Create project.
- Enable email magic-link auth.
- Set auth redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://<your-domain>/auth/callback`
- Run SQL migration from `supabase/schema.sql`.

### 4) Local validation
```bash
npm run dev
npm run build
```
Then manually validate:
- Login via magic link
- Dashboard loads
- Picks save/lock behavior by deadlines
- Results page shows synced data
- Admin actions work for allowlisted email

### 5) Data sync validation
- Hit cron routes locally (or through deployment):
  - `/api/cron/sync-calendar`
  - `/api/cron/sync-results`
  - `/api/cron/recompute`
- Confirm DB rows populate for:
  - `drivers`
  - `race_weekends`
  - `results`
  - `scores`
  - `weekend_scores`

### 6) Missing next improvements (recommended)
- Add unit tests for `lib/scoring.ts`.
- Add integration tests for `/api/picks` deadline and uniqueness enforcement.
- Add better OpenF1 mapping for sprint weekend edge cases.
- Add pagination/filtering on leaderboard/results.
- Add audit logging table for admin sync/recompute jobs.
- Add rate limiting and better API error handling.
- Add DB indexes for large-season performance.

### 7) Deployment (local machine)
- Vercel dashboard import from GitHub repo (recommended), or CLI:
```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```
- Set env vars in Vercel.
- Ensure cron jobs from `vercel.json` are active.

## Definition of done for the local agent
- `npm install` succeeds.
- `npm run build` succeeds.
- End-to-end auth + picks + scoring validated against real Supabase.
- Project deployed to Vercel with cron jobs active.
- Basic tests added and passing.
