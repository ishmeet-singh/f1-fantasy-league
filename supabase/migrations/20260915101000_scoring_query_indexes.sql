create index if not exists predictions_race_id_idx
  on public.predictions (race_id);

create index if not exists scores_race_id_idx
  on public.scores (race_id);

create index if not exists weekend_scores_race_id_idx
  on public.weekend_scores (race_id);

create index if not exists notification_log_race_event_idx
  on public.notification_log (race_id, event_type);
