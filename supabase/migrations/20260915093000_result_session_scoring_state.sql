alter table public.result_sessions
  add column if not exists score_updated_at timestamptz;

-- The first migration verified that existing event scores and weekend totals
-- were consistent before this marker was introduced.
update public.result_sessions
set score_updated_at = coalesce(score_updated_at, now());
