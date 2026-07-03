/** Distinct race IDs that have a race (not quali/sprint) result row. */
export function distinctRaceIdsFromRaceResults(rows: { race_id: string }[]): Set<string> {
  return new Set(rows.map((r) => r.race_id));
}
