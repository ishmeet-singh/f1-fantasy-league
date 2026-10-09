-- GitHub Actions was dropping the 5-minute schedule (runs were created hours
-- apart, and the ones that started finished in seconds). pg_cron calls the
-- deployed app directly. Secrets live in Vault, not in this file:
--   app_base_url, supabase_cron_secret

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create extension if not exists pg_net;

create schema if not exists private;

create or replace function private.invoke_app_cron(path text)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, net, vault
as $$
declare
  base_url text;
  secret text;
  request_id bigint;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'app_base_url'
  limit 1;

  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'supabase_cron_secret'
  limit 1;

  if base_url is null or secret is null then
    raise exception 'app cron vault secrets are not configured';
  end if;

  select net.http_get(
    url := rtrim(base_url, '/') || path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 120000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on schema private from public, anon, authenticated;
revoke all on function private.invoke_app_cron(text) from public, anon, authenticated;
grant usage on schema private to postgres;
grant execute on function private.invoke_app_cron(text) to postgres;

do $$
begin
  perform cron.unschedule('app-send-reminders');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('app-sync-results');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('app-cron-history-cleanup');
exception when others then null;
end $$;

select cron.schedule(
  'app-send-reminders',
  '*/5 * * * *',
  $$select private.invoke_app_cron('/api/cron/send-reminders')$$
);

select cron.schedule(
  'app-sync-results',
  '2-57/5 * * * *',
  $$select private.invoke_app_cron('/api/cron/sync-results')$$
);

select cron.schedule(
  'app-cron-history-cleanup',
  '15 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
