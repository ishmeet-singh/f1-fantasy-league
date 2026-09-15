create table if not exists public.result_sessions (
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint','race')),
  status text not null check (status in ('official')),
  source text not null check (source in ('openf1','jolpi','manual','backfill')),
  result_count int not null check (result_count >= 0),
  last_synced_at timestamptz not null default now(),
  score_updated_at timestamptz,
  primary key (race_id, event_type)
);

alter table public.result_sessions enable row level security;

alter table public.results
  drop constraint if exists results_actual_position_check;
alter table public.results
  add constraint results_actual_position_check check (actual_position >= 1);

-- Existing saved sessions predate explicit publication metadata. They were
-- sourced from official OpenF1/Jolpi classifications or admin simulation.
insert into public.result_sessions (
  race_id,
  event_type,
  status,
  source,
  result_count,
  last_synced_at,
  score_updated_at
)
select
  race_id,
  event_type,
  'official',
  'backfill',
  count(*)::int,
  now(),
  now()
from public.results
group by race_id, event_type
on conflict (race_id, event_type) do nothing;

create or replace function public.persist_race_scores(
  p_race_id text,
  p_scores jsonb
)
returns table (score_rows int, weekend_rows int)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_score_rows int := 0;
  v_weekend_rows int := 0;
begin
  delete from public.scores
  where race_id = p_race_id;

  insert into public.scores (
    user_id,
    race_id,
    event_type,
    points,
    total_error,
    exact_matches
  )
  select
    row.user_id,
    row.race_id,
    row.event_type,
    row.points,
    row.total_error,
    row.exact_matches
  from jsonb_to_recordset(coalesce(p_scores, '[]'::jsonb)) as row(
    user_id uuid,
    race_id text,
    event_type text,
    points int,
    total_error int,
    exact_matches int
  )
  where row.race_id = p_race_id
  on conflict (user_id, race_id, event_type) do update
  set
    points = excluded.points,
    total_error = excluded.total_error,
    exact_matches = excluded.exact_matches;

  get diagnostics v_score_rows = row_count;

  insert into public.weekend_scores (
    user_id,
    race_id,
    total_points,
    total_error,
    exact_matches
  )
  select
    users.id,
    p_race_id,
    coalesce(sum(scores.points), 0)::int,
    coalesce(sum(scores.total_error), 0)::int,
    coalesce(sum(scores.exact_matches), 0)::int
  from public.users
  left join public.scores
    on scores.user_id = users.id
   and scores.race_id = p_race_id
  group by users.id
  on conflict (user_id, race_id) do update
  set
    total_points = excluded.total_points,
    total_error = excluded.total_error,
    exact_matches = excluded.exact_matches;

  get diagnostics v_weekend_rows = row_count;

  return query select v_score_rows, v_weekend_rows;
end;
$$;

revoke execute on function public.persist_race_scores(text, jsonb) from public, anon, authenticated;
grant execute on function public.persist_race_scores(text, jsonb) to service_role;
