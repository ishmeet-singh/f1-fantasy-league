create table if not exists public.race_entries (
  race_id text not null references public.race_weekends(id) on delete cascade,
  driver_id text not null references public.drivers(id),
  driver_name text not null,
  team text not null,
  source text not null check (source in ('openf1','manual')),
  updated_at timestamptz not null default now(),
  primary key (race_id, driver_id)
);

alter table public.race_entries enable row level security;

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
    race_id,
    driver_id,
    driver_name,
    team,
    source,
    updated_at
  )
  select
    p_race_id,
    row.driver_id,
    row.driver_name,
    row.team,
    'openf1',
    now()
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
