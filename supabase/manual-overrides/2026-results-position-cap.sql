-- 2026 has 22 race drivers. Keep production aligned with the sync/scoring code.
alter table public.results
  drop constraint if exists results_actual_position_check;

alter table public.results
  add constraint results_actual_position_check
  check (actual_position >= 1 and actual_position <= 22);
