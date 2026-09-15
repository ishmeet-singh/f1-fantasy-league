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
