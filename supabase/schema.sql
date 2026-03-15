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
  sprint_quali_start timestamptz,
  sprint_start timestamptz,
  race_start timestamptz not null,
  has_sprint boolean default false
);

create table if not exists public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint_quali','sprint','race')),
  driver_id text not null references public.drivers(id),
  predicted_position int not null check (predicted_position >= 1 and predicted_position <= 10),
  created_at timestamptz default now(),
  unique (user_id, race_id, event_type, predicted_position),
  unique (user_id, race_id, event_type, driver_id)
);

create table if not exists public.results (
  id bigint generated always as identity primary key,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint_quali','sprint','race')),
  driver_id text not null references public.drivers(id),
  actual_position int not null check (actual_position >= 1 and actual_position <= 20),
  unique (race_id, event_type, driver_id)
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint_quali','sprint','race')),
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
alter table public.race_weekends enable row level security;
alter table public.drivers enable row level security;

create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  race_id text not null references public.race_weekends(id) on delete cascade,
  event_type text not null check (event_type in ('quali','sprint_quali','sprint','race')),
  interval_label text not null,
  sent_at timestamptz default now(),
  unique (user_id, race_id, event_type, interval_label)
);

alter table public.notification_log enable row level security;

-- Tracks every sync attempt per session so we can measure how long OpenF1/Jolpi
-- take to publish results after a session ends.
create table if not exists public.results_sync_log (
  id bigint generated always as identity primary key,
  race_id text not null,
  event_type text not null check (event_type in ('quali','sprint_quali','sprint','race')),
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
