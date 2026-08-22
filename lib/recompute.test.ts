import { describe, expect, it } from "vitest";
import { buildRecomputeRows, hasCompleteResults } from "./recompute";
import { eligibleDriverIdsForRace } from "./race-driver-eligibility";
import { scoreEvent } from "./scoring";

describe("buildRecomputeRows", () => {
  it("scores every user when cumulative predictions exceed 1,000 rows", () => {
    const users = Array.from({ length: 106 }, (_, index) => ({ id: `user-${index}` }));
    const fullGrid = [...eligibleDriverIdsForRace("1291")];
    const driverIds = fullGrid.slice(0, 10);
    const predictions = users.flatMap((user) =>
      driverIds.map((driverId, index) => ({
        user_id: user.id,
        race_id: "1291",
        event_type: "race",
        driver_id: driverId,
        predicted_position: index + 1
      }))
    );
    const results = fullGrid.map((driverId, index) => ({
      race_id: "1291",
      event_type: "race",
      driver_id: driverId,
      actual_position: index + 1
    }));

    expect(predictions).toHaveLength(1060);
    const built = buildRecomputeRows(
      [{ id: "1291", has_sprint: false, sprint_start: null }],
      users,
      predictions,
      results
    );

    expect(built.scoreRows).toHaveLength(106);
    expect(built.scoreRows.find((row) => row.user_id === "user-105")?.points).toBe(130);
  });
});

describe("hasCompleteResults", () => {
  it("requires every eligible race driver before scoring", () => {
    const drivers = [...eligibleDriverIdsForRace("1292")].map((driver_id) => ({ driver_id }));

    expect(hasCompleteResults("1292", drivers)).toBe(true);
    expect(hasCompleteResults("1292", drivers.slice(0, -1))).toBe(false);
  });

  it("supports legacy Jolpi race IDs with textual driver IDs", () => {
    const drivers = Array.from({ length: 22 }, (_, index) => ({ driver_id: `driver-${index}` }));

    expect(hasCompleteResults("jolpi-2026-12", drivers)).toBe(true);
    expect(hasCompleteResults("jolpi-2026-12", drivers.slice(0, -1))).toBe(false);
  });
});

describe("Dutch GP sprint regression", () => {
  it("calculates chandrahasd's complete picks as 14 points, not the truncated 1 point", () => {
    const predictions = [
      ["12", 1], ["3", 2], ["1", 3], ["44", 4], ["16", 5],
      ["81", 6], ["63", 7], ["87", 8], ["30", 9], ["10", 10]
    ].map(([driver_id, predicted_position]) => ({ driver_id: String(driver_id), predicted_position: Number(predicted_position) }));
    const actualPositions: Record<string, number> = {
      "63": 1, "16": 2, "1": 3, "12": 4, "81": 5,
      "3": 6, "44": 7, "10": 8, "41": 10, "30": 11, "87": 15
    };
    const results = Object.entries(actualPositions).map(([driver_id, actual_position]) => ({
      driver_id,
      actual_position
    }));

    expect(scoreEvent("sprint", predictions, results, true).points).toBe(14);
  });
});
