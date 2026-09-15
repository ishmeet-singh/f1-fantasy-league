create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists public.drivers (
  id text primary key,
  name text not null,
  team text not null
);

create table if not exists public.race_weekends (
  id text primary key,
  grand_prix text not null,
  race_date timestamptz not null,
  quali_start timestamptz not null,
  sprint_start timestamptz,
  race_start timestamptz not null,
  has_sprint boolean default false
);

create table if not exists public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint','race')),
  driver_id text not null references public.drivers(id),
  predicted_position int not null check (predicted_position >= 1 and predicted_position <= 10),
  created_at timestamptz default now(),
  unique (user_id, race_id, event_type, predicted_position),
  unique (user_id, race_id, event_type, driver_id)
);

create table if not exists public.results (
  id bigint generated always as identity primary key,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint','race')),
  driver_id text not null references public.drivers(id),
  actual_position int not null check (actual_position >= 1),
  unique (race_id, event_type, driver_id)
);

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

create table if not exists public.race_entries (
  race_id text not null references public.race_weekends(id) on delete cascade,
  driver_id text not null references public.drivers(id),
  driver_name text not null,
  team text not null,
  source text not null check (source in ('openf1','manual')),
  updated_at timestamptz not null default now(),
  primary key (race_id, driver_id)
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint','race')),
  points int not null,
  total_error int default 0,
  exact_matches int default 0,
  unique (user_id, race_id, event_type)
);

create table if not exists public.weekend_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  total_points int not null,
  total_error int default 0,
  exact_matches int default 0,
  unique (user_id, race_id)
);

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
    user_id, race_id, event_type, points, total_error, exact_matches
  )
  select
    row.user_id, row.race_id, row.event_type,
    row.points, row.total_error, row.exact_matches
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
    user_id, race_id, total_points, total_error, exact_matches
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

create or replace function public.replace_session_results_and_publish(
  p_race_id text,
  p_event_type text,
  p_source text,
  p_results jsonb
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int := 0;
begin
  if p_event_type not in ('quali', 'sprint', 'race') then
    raise exception 'Invalid event type';
  end if;
  if p_source not in ('openf1', 'jolpi', 'manual') then
    raise exception 'Invalid result source';
  end if;

  delete from public.results
  where race_id = p_race_id
    and event_type = p_event_type;

  insert into public.results (
    race_id, event_type, driver_id, actual_position
  )
  select
    p_race_id, p_event_type, row.driver_id, row.actual_position
  from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb)) as row(
    driver_id text,
    actual_position int
  )
  where row.actual_position >= 1;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Cannot publish an empty result set';
  end if;

  insert into public.result_sessions (
    race_id, event_type, status, source, result_count,
    last_synced_at, score_updated_at
  )
  values (
    p_race_id, p_event_type, 'official', p_source, v_rows, now(), null
  )
  on conflict (race_id, event_type) do update
  set
    status = excluded.status,
    source = excluded.source,
    result_count = excluded.result_count,
    last_synced_at = excluded.last_synced_at,
    score_updated_at = null;

  return v_rows;
end;
$$;

revoke execute on function public.replace_session_results_and_publish(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_session_results_and_publish(text, text, text, jsonb)
  to service_role;

create or replace function public.replace_race_entries(
  p_race_id text,
  p_entries jsonb
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int := 0;
begin
  if exists (
    select 1
    from public.race_entries
    where race_id = p_race_id
      and source = 'manual'
  ) then
    select count(*)::int into v_rows
    from public.race_entries
    where race_id = p_race_id;
    return v_rows;
  end if;

  delete from public.race_entries
  where race_id = p_race_id;

  insert into public.race_entries (
    race_id, driver_id, driver_name, team, source, updated_at
  )
  select
    p_race_id, row.driver_id, row.driver_name, row.team, 'openf1', now()
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as row(
    driver_id text,
    driver_name text,
    team text
  );

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke execute on function public.replace_race_entries(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_race_entries(text, jsonb) to service_role;

create or replace function public.admin_scoring_health()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with score_sums as (
    select
      user_id,
      race_id,
      sum(points)::int as points,
      sum(total_error)::int as error,
      sum(exact_matches)::int as exact
    from public.scores
    group by user_id, race_id
  ),
  mismatches as (
    select count(*)::int as count
    from public.weekend_scores as weekends
    full join score_sums as scores using (user_id, race_id)
    where coalesce(weekends.total_points, 0) <> coalesce(scores.points, 0)
       or coalesce(weekends.total_error, 0) <> coalesce(scores.error, 0)
       or coalesce(weekends.exact_matches, 0) <> coalesce(scores.exact, 0)
  ),
  latest_sync as (
    select status, started_at, finished_at, error
    from public.cron_runs
    where job = 'sync-results'
    order by started_at desc
    limit 1
  )
  select jsonb_build_object(
    'scoreRows', (select count(*) from public.scores),
    'weekendRows', (select count(*) from public.weekend_scores),
    'officialSessions', (
      select count(*) from public.result_sessions where status = 'official'
    ),
    'pendingSessions', (
      select count(*)
      from public.result_sessions
      where status = 'official' and score_updated_at is null
    ),
    'aggregateMismatches', (select count from mismatches),
    'lastSync', (select to_jsonb(latest_sync) from latest_sync)
  );
$$;

revoke execute on function public.admin_scoring_health() from public, anon, authenticated;
grant execute on function public.admin_scoring_health() to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.predictions enable row level security;
alter table public.scores enable row level security;
alter table public.weekend_scores enable row level security;
alter table public.results enable row level security;
alter table public.result_sessions enable row level security;
alter table public.race_entries enable row level security;
alter table public.race_weekends enable row level security;
alter table public.drivers enable row level security;

create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint','race')),
  interval_label text not null,
  sent_at timestamptz default now(),
  unique (user_id, race_id, event_type, interval_label)
);

alter table public.notification_log enable row level security;

create index if not exists predictions_race_id_idx
  on public.predictions (race_id);
create index if not exists scores_race_id_idx
  on public.scores (race_id);
create index if not exists weekend_scores_race_id_idx
  on public.weekend_scores (race_id);
create index if not exists notification_log_race_event_idx
  on public.notification_log (race_id, event_type);

-- Tracks every sync attempt per session so we can measure how long OpenF1/Jolpi
-- take to publish results after a session ends.
create table if not exists public.results_sync_log (
  id bigint generated always as identity primary key,
  race_id text not null,
  event_type text not null check (event_type in ('quali','sprint','race')),
  attempted_at timestamptz default now(),
  openf1_count int not null default 0,   -- rows returned by OpenF1 (0 = not available yet)
  jolpi_count int not null default 0,    -- rows returned by Jolpi fallback (0 = not available yet)
  rows_upserted int not null default 0,  -- rows actually saved to results table
  source text not null default 'none',   -- 'openf1' | 'jolpi' | 'none'
  error text                             -- error message if fetch failed
);

create policy "read all reference" on public.drivers for select using (true);
create policy "read all races" on public.race_weekends for select using (true);
create policy "read all results" on public.results for select using (true);
create policy "own profile read" on public.users for select using (auth.uid() = id);
create policy "own profile write" on public.users for insert with check (auth.uid() = id);
create policy "own profile update" on public.users for update using (auth.uid() = id);
create policy "own predictions all" on public.predictions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read scores" on public.scores for select using (true);
create policy "read weekend scores" on public.weekend_scores for select using (true);
