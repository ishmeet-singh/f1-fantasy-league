/** 2026 active calendar after Bahrain & Saudi cancellations. */
export const SEASON_SCORING_RACES = 22;

/** Weekend totals that count at full season (22 − 4 drops). */
export const BEST_WEEKENDS_COUNT = 18;

/** Worst weekends dropped at full season. */
export const MAX_DROPPED_WEEKENDS = 4;

/** No drops while scored weekends ≤ this count. */
export const NO_DROP_UNTIL_WEEKENDS = 4;

export type WeekendStandingInput = {
  race_id: string;
  total_points: number | null;
  total_error?: number | null;
  exact_matches?: number | null;
};

export type SeasonStandingResult = {
  score: number;
  countingRaceIds: string[];
  droppedRaceIds: string[];
  racesCounting: number;
  racesDropped: number;
  error: number;
  exact: number;
  top: number;
};

export function dropsForScoredWeekends(scoredWeekends: number): number {
  return Math.min(MAX_DROPPED_WEEKENDS, Math.max(0, scoredWeekends - NO_DROP_UNTIL_WEEKENDS));
}

export function countingWeekendsFor(scoredWeekends: number): number {
  return scoredWeekends - dropsForScoredWeekends(scoredWeekends);
}

/** Prefer keeping later races when weekend points tie (earlier race is dropped). */
export function compareWeekendsBestFirst(
  a: WeekendStandingInput,
  b: WeekendStandingInput,
  raceStartById: ReadonlyMap<string, string>
): number {
  const pa = a.total_points ?? 0;
  const pb = b.total_points ?? 0;
  if (pb !== pa) return pb - pa;
  const sa = raceStartById.get(a.race_id) ?? "";
  const sb = raceStartById.get(b.race_id) ?? "";
  return sb.localeCompare(sa);
}

export function computeSeasonStanding(
  weekends: WeekendStandingInput[],
  raceStartById: ReadonlyMap<string, string>
): SeasonStandingResult {
  const n = weekends.length;
  const racesDropped = dropsForScoredWeekends(n);
  const racesCounting = countingWeekendsFor(n);

  if (n === 0) {
    return {
      score: 0,
      countingRaceIds: [],
      droppedRaceIds: [],
      racesCounting: 0,
      racesDropped: 0,
      error: 0,
      exact: 0,
      top: 0
    };
  }

  const sortedBestFirst = [...weekends].sort((a, b) =>
    compareWeekendsBestFirst(a, b, raceStartById)
  );
  const counting = sortedBestFirst.slice(0, racesCounting);
  const dropped = sortedBestFirst.slice(racesCounting);

  return {
    score: counting.reduce((sum, w) => sum + (w.total_points ?? 0), 0),
    countingRaceIds: counting.map((w) => w.race_id),
    droppedRaceIds: dropped.map((w) => w.race_id),
    racesCounting,
    racesDropped,
    error: counting.reduce((sum, w) => sum + (w.total_error ?? 0), 0),
    exact: counting.reduce((sum, w) => sum + (w.exact_matches ?? 0), 0),
    top: Math.max(0, ...weekends.map((w) => w.total_points ?? 0))
  };
}

export function formatSeasonStandingsSubtitle(completedRaces: number): string {
  if (completedRaces <= 0) return "";
  const drops = dropsForScoredWeekends(completedRaces);
  const counting = countingWeekendsFor(completedRaces);
  if (drops === 0) {
    return `All ${completedRaces} race${completedRaces === 1 ? "" : "s"} counting`;
  }
  return `Best ${counting} of ${completedRaces} counting · worst ${drops} dropped`;
}

export function raceStartMapFromWeekends(
  races: ReadonlyArray<{ id: string; race_start: string }>
): Map<string, string> {
  return new Map(races.map((r) => [r.id, r.race_start]));
}
