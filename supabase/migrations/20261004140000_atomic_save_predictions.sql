alter table public.predictions
  add column if not exists updated_at timestamptz;

create or replace function public.save_predictions(
  p_user_id uuid,
  p_race_id text,
  p_event_type text,
  p_picks jsonb,
  p_created_at timestamptz default null
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_first_submitted timestamptz;
  v_rows int := 0;
begin
  if p_event_type not in ('quali', 'sprint', 'race') then
    raise exception 'Invalid event type';
  end if;

  -- Serialise concurrent saves (two tabs / devices) for the same user session.
  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_race_id || ':' || p_event_type, 0)
  );

  select min(created_at)
  into v_first_submitted
  from public.predictions
  where user_id = p_user_id
    and race_id = p_race_id
    and event_type = p_event_type;

  delete from public.predictions
  where user_id = p_user_id
    and race_id = p_race_id
    and event_type = p_event_type;

  insert into public.predictions (
    user_id,
    race_id,
    event_type,
    driver_id,
    predicted_position,
    created_at,
    updated_at
  )
  select
    p_user_id,
    p_race_id,
    p_event_type,
    pick.driver_id,
    pick.predicted_position,
    coalesce(p_created_at, v_first_submitted, now()),
    now()
  from jsonb_to_recordset(coalesce(p_picks, '[]'::jsonb)) as pick(
    driver_id text,
    predicted_position int
  );

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke execute on function public.save_predictions(uuid, text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.save_predictions(uuid, text, text, jsonb, timestamptz)
  to service_role;
