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
    race_id,
    event_type,
    driver_id,
    actual_position
  )
  select
    p_race_id,
    p_event_type,
    row.driver_id,
    row.actual_position
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
    race_id,
    event_type,
    status,
    source,
    result_count,
    last_synced_at,
    score_updated_at
  )
  values (
    p_race_id,
    p_event_type,
    'official',
    p_source,
    v_rows,
    now(),
    null
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
