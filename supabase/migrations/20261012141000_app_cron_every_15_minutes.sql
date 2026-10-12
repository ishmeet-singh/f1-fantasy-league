-- Reduce pg_cron load (~67% fewer ticks vs every 5 minutes).
-- Reminder catch-up window is 12h, so 15-minute cadence is still safe.

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

select cron.schedule(
  'app-send-reminders',
  '*/15 * * * *',
  $$select private.invoke_app_cron('/api/cron/send-reminders')$$
);

select cron.schedule(
  'app-sync-results',
  '2-57/15 * * * *',
  $$select private.invoke_app_cron('/api/cron/sync-results')$$
);
