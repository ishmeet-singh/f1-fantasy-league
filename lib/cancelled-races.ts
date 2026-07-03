/**
 * 2026 races cancelled mid-season (FIA / league decision).
 * OpenF1 meeting_key IDs — excluded from calendar sync and season totals.
 */
export type CancelledRace = {
  id: string;
  grand_prix: string;
  /** Scheduled race Sunday (UTC), from 2026 FIA calendar before cancellation */
  race_start: string;
};

export const CANCELLED_RACES_2026: CancelledRace[] = [
  {
    id: "1282",
    grand_prix: "Bahrain Grand Prix",
    race_start: "2026-04-12T15:00:00.000Z"
  },
  {
    id: "1283",
    grand_prix: "Saudi Arabian Grand Prix",
    race_start: "2026-04-19T17:00:00.000Z"
  }
];

export const CANCELLED_RACE_IDS = new Set(CANCELLED_RACES_2026.map((r) => r.id));

export function isCancelledRaceId(raceId: string): boolean {
  return CANCELLED_RACE_IDS.has(raceId);
}

export function filterActiveRaceWeekends<T extends { id: string }>(races: T[]): T[] {
  return races.filter((r) => !isCancelledRaceId(r.id));
}

export type SeasonProgressInput = {
  raceIds: string[];
  completedRaceIds: ReadonlySet<string>;
};

/** Season bar: total = active calendar races, past = those with race results. */
export function computeSeasonProgress(input: SeasonProgressInput): { total: number; past: number } {
  const activeIds = input.raceIds.filter((id) => !isCancelledRaceId(id));
  const past = activeIds.filter((id) => input.completedRaceIds.has(id)).length;
  return { total: activeIds.length, past };
}
