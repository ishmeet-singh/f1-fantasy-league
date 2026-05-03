-- 2026 Miami GP — Sunday race moved earlier for weather (~13:00 EDT / 17:00 UTC).
-- Use if you cannot run "Sync season calendar" (e.g. OpenF1 401). Safe to re-run.
UPDATE race_weekends
SET race_start = '2026-05-03T17:00:00+00'::timestamptz
WHERE grand_prix ILIKE '%Miami%'
  AND race_start >= '2026-05-03T00:00:00+00'::timestamptz
  AND race_start < '2026-05-04T00:00:00+00'::timestamptz;
