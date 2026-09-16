alter table public.race_entries
  drop constraint if exists race_entries_source_check;
alter table public.race_entries
  add constraint race_entries_source_check
  check (source in ('openf1', 'openf1-session', 'fia', 'manual'));

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
      and source in ('manual', 'fia', 'openf1-session')
  ) then
    select count(*)::int into v_rows
    from public.race_entries
    where race_id = p_race_id;
    return v_rows;
  end if;

  delete from public.race_entries where race_id = p_race_id;

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

create table if not exists public.race_entry_sync_log (
  id bigint generated always as identity primary key,
  race_id text not null references public.race_weekends(id) on delete cascade,
  source text not null check (source in ('openf1-session', 'fia')),
  document_url text,
  attempted_at timestamptz not null default now(),
  status text not null check (status in ('updated', 'unchanged', 'rejected', 'error')),
  entry_count int not null default 0,
  added_driver_ids text[] not null default '{}',
  removed_driver_ids text[] not null default '{}',
  affected_prediction_rows int not null default 0,
  error text
);

alter table public.race_entry_sync_log enable row level security;

create index if not exists race_entry_sync_log_race_attempted_idx
  on public.race_entry_sync_log (race_id, attempted_at desc);

create table if not exists public.calendar_sync_log (
  id bigint generated always as identity primary key,
  race_id text not null,
  grand_prix text not null,
  change_type text not null check (
    change_type in ('added', 'timing-changed', 'removed', 'removal-blocked')
  ),
  detected_at timestamptz not null default now(),
  previous_values jsonb,
  incoming_values jsonb,
  affected_prediction_rows int not null default 0,
  source text not null default 'openf1+jolpi'
);

alter table public.calendar_sync_log enable row level security;

create index if not exists calendar_sync_log_race_detected_idx
  on public.calendar_sync_log (race_id, detected_at desc);

create or replace function public.replace_race_entries_from_source(
  p_race_id text,
  p_source text,
  p_entries jsonb,
  p_document_url text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
  v_existing_count int;
  v_added text[];
  v_removed text[];
  v_affected int;
  v_status text;
begin
  if p_source not in ('openf1-session', 'fia') then
    raise exception 'Unsupported race entry source: %', p_source;
  end if;

  if exists (
    select 1 from public.race_entries
    where race_id = p_race_id and source = 'manual'
  ) then
    insert into public.race_entry_sync_log (
      race_id, source, document_url, status, error
    )
    values (
      p_race_id, p_source, p_document_url, 'rejected',
      'Manual race-entry override is locked'
    );
    return jsonb_build_object(
      'status', 'rejected',
      'reason', 'Manual race-entry override is locked'
    );
  end if;

  if p_source = 'fia' and exists (
    select 1 from public.race_entries
    where race_id = p_race_id and source = 'openf1-session'
  ) then
    insert into public.race_entry_sync_log (
      race_id, source, document_url, status, error
    )
    values (
      p_race_id, p_source, p_document_url, 'rejected',
      'Observed competitive-session roster has higher precedence'
    );
    return jsonb_build_object(
      'status', 'rejected',
      'reason', 'Observed competitive-session roster has higher precedence'
    );
  end if;

  select count(*)::int into v_count
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as row(
    driver_id text,
    driver_name text,
    team text
  )
  where nullif(trim(row.driver_id), '') is not null
    and nullif(trim(row.driver_name), '') is not null
    and nullif(trim(row.team), '') is not null;

  if v_count < 20 then
    insert into public.race_entry_sync_log (
      race_id, source, document_url, status, entry_count, error
    )
    values (
      p_race_id, p_source, p_document_url, 'rejected', v_count,
      'Upstream roster has fewer than 20 valid entries'
    );
    return jsonb_build_object(
      'status', 'rejected',
      'entryCount', v_count,
      'reason', 'Upstream roster has fewer than 20 valid entries'
    );
  end if;

  if v_count <> (
    select count(distinct row.driver_id)::int
    from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as row(driver_id text)
  ) then
    raise exception 'Upstream roster contains duplicate driver IDs';
  end if;

  select count(*)::int into v_existing_count
  from public.race_entries
  where race_id = p_race_id;

  select coalesce(array_agg(incoming.driver_id order by incoming.driver_id), '{}')
  into v_added
  from (
    select row.driver_id
    from jsonb_to_recordset(p_entries) as row(driver_id text)
    except
    select driver_id from public.race_entries where race_id = p_race_id
  ) as incoming;

  select coalesce(array_agg(existing.driver_id order by existing.driver_id), '{}')
  into v_removed
  from (
    select driver_id from public.race_entries where race_id = p_race_id
    except
    select row.driver_id from jsonb_to_recordset(p_entries) as row(driver_id text)
  ) as existing;

  select count(*)::int into v_affected
  from public.predictions
  where race_id = p_race_id
    and driver_id = any(v_removed);

  v_status := case
    when cardinality(v_added) = 0
      and cardinality(v_removed) = 0
      and v_existing_count = v_count
      and not exists (
        select 1
        from jsonb_to_recordset(p_entries) as incoming(
          driver_id text,
          driver_name text,
          team text
        )
        join public.race_entries existing
          on existing.race_id = p_race_id
         and existing.driver_id = incoming.driver_id
        where existing.driver_name is distinct from incoming.driver_name
           or existing.team is distinct from incoming.team
      )
    then 'unchanged'
    else 'updated'
  end;

  if v_status = 'updated' then
    delete from public.race_entries where race_id = p_race_id;

    insert into public.race_entries (
      race_id, driver_id, driver_name, team, source, updated_at
    )
    select
      p_race_id,
      row.driver_id,
      row.driver_name,
      row.team,
      p_source,
      now()
    from jsonb_to_recordset(p_entries) as row(
      driver_id text,
      driver_name text,
      team text
    );
  end if;

  insert into public.race_entry_sync_log (
    race_id, source, document_url, status, entry_count,
    added_driver_ids, removed_driver_ids, affected_prediction_rows
  )
  values (
    p_race_id, p_source, p_document_url, v_status, v_count,
    v_added, v_removed, v_affected
  );

  return jsonb_build_object(
    'status', v_status,
    'entryCount', v_count,
    'addedDriverIds', to_jsonb(v_added),
    'removedDriverIds', to_jsonb(v_removed),
    'affectedPredictionRows', v_affected
  );
end;
$$;

revoke execute on function public.replace_race_entries_from_source(text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.replace_race_entries_from_source(text, text, jsonb, text)
  to service_role;
