export type PickDriver = { id: string; name: string; team: string };

const BASE_GRID_2026_IDS = new Set([
  "1", "3", "5", "6", "10", "11", "12", "14", "16", "18", "23",
  "27", "30", "31", "41", "43", "44", "55", "63", "77", "81", "87"
]);

type RaceDriverOverride = {
  remove: string[];
  add: PickDriver[];
  teams?: Record<string, string>;
};

/**
 * Confirmed race-entry changes that differ from the season grid.
 * Dutch GP 2026: Hadjar injured; Lawson moves to Red Bull and Tsunoda
 * takes Lawson's Racing Bulls seat.
 */
const RACE_DRIVER_OVERRIDES: Record<string, RaceDriverOverride> = {
  "1292": {
    remove: ["6"],
    add: [{ id: "22", name: "Yuki Tsunoda", team: "Racing Bulls" }],
    teams: {
      "22": "Racing Bulls",
      "30": "Red Bull Racing"
    }
  }
};

export function eligibleDriverIdsForRace(raceId: string): Set<string> {
  const ids = new Set(BASE_GRID_2026_IDS);
  const override = RACE_DRIVER_OVERRIDES[raceId];

  for (const id of override?.remove ?? []) ids.delete(id);
  for (const driver of override?.add ?? []) ids.add(driver.id);

  return ids;
}

export function configuredReplacementDrivers(raceId: string): PickDriver[] {
  return RACE_DRIVER_OVERRIDES[raceId]?.add ?? [];
}

export function eligibleDriversForRace(raceId: string, drivers: PickDriver[]): PickDriver[] {
  const eligibleIds = eligibleDriverIdsForRace(raceId);
  const override = RACE_DRIVER_OVERRIDES[raceId];
  const byId = new Map(
    drivers
      .filter((driver) => eligibleIds.has(String(driver.id)))
      .map((driver) => [
        String(driver.id),
        {
          ...driver,
          team: override?.teams?.[String(driver.id)] ?? driver.team
        }
      ])
  );

  for (const driver of override?.add ?? []) {
    if (!byId.has(driver.id)) byId.set(driver.id, driver);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
