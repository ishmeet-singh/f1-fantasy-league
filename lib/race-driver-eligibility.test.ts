import { describe, expect, it } from "vitest";
import {
  eligibleDriverIdsForRace,
  eligibleDriversForRace
} from "./race-driver-eligibility";

const storedDrivers = [
  { id: "3", name: "Max Verstappen", team: "Red Bull Racing" },
  { id: "6", name: "Isack Hadjar", team: "Red Bull Racing" },
  { id: "30", name: "Liam Lawson", team: "Racing Bulls" },
  { id: "41", name: "Arvid Lindblad", team: "Racing Bulls" },
  { id: "25", name: "Colton Herta", team: "Cadillac" },
  { id: "72", name: "Frederik Vesti", team: "Mercedes" }
];

describe("eligibleDriversForRace", () => {
  it("filters reserve and FP1 drivers from a normal 2026 race", () => {
    const drivers = eligibleDriversForRace("1291", storedDrivers);

    expect(drivers.map((driver) => driver.id)).toEqual(["41", "6", "30", "3"]);
  });

  it("applies the confirmed Dutch GP substitutions", () => {
    const drivers = eligibleDriversForRace("1292", storedDrivers);

    expect(eligibleDriverIdsForRace("1292").size).toBe(22);
    expect(drivers.some((driver) => driver.id === "6")).toBe(false);
    expect(drivers.some((driver) => driver.id === "25")).toBe(false);
    expect(drivers).toContainEqual({
      id: "22",
      name: "Yuki Tsunoda",
      team: "Racing Bulls"
    });
    expect(drivers.find((driver) => driver.id === "30")?.team).toBe("Red Bull Racing");
  });
});
