import { describe, expect, it } from "vitest";
import { CANCELLED_RACES_2026, computeSeasonProgress, filterActiveRaceWeekends } from "./cancelled-races";

describe("cancelled races season count", () => {
  const allRaceIds = [
    "1278", "1279", "1280", "1281",
    "1282", // Bahrain — cancelled
    "1283", // Saudi — cancelled
    "1284", "1285", "1286", "1287"
  ];

  it("excludes cancelled races from the season total", () => {
    const active = filterActiveRaceWeekends(allRaceIds.map((id) => ({ id })));
    expect(active).toHaveLength(8);
    expect(active.some((r) => r.id === "1282")).toBe(false);
    expect(active.some((r) => r.id === "1283")).toBe(false);
  });

  it("counts only completed active races as past", () => {
    const completed = new Set(["1278", "1279", "1280", "1282"]);
    const { total, past } = computeSeasonProgress({ raceIds: allRaceIds, completedRaceIds: completed });
    expect(total).toBe(8);
    expect(past).toBe(3);
  });

  it("documents the two cancelled GPs with stable IDs", () => {
    expect(CANCELLED_RACES_2026.map((r) => r.grand_prix)).toEqual([
      "Bahrain Grand Prix",
      "Saudi Arabian Grand Prix"
    ]);
  });
});
