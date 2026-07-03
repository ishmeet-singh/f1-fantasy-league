import { describe, expect, it } from "vitest";
import { selectPicksRace } from "@/lib/loaders/picks";
import type { RaceWeekendRow } from "@/lib/cached-reference-data";
import { selectResultsRace } from "@/lib/loaders/results";

const races: RaceWeekendRow[] = [
  {
    id: "r1",
    grand_prix: "Bahrain",
    race_date: "2026-03-02",
    quali_start: "2026-03-01T12:00:00Z",
    sprint_start: null,
    race_start: "2026-03-02T14:00:00Z",
    has_sprint: false
  },
  {
    id: "r2",
    grand_prix: "Monaco",
    race_date: "2026-05-25",
    quali_start: "2026-05-24T12:00:00Z",
    sprint_start: null,
    race_start: "2026-05-25T14:00:00Z",
    has_sprint: false
  }
];

describe("selectPicksRace", () => {
  it("uses explicit race id when provided", () => {
    expect(selectPicksRace(races, "r1", new Date("2026-06-01")).id).toBe("r1");
  });

  it("falls back to first race when no selection", () => {
    expect(selectPicksRace(races, undefined, new Date("2026-06-01")).id).toBe("r1");
  });
});

describe("selectResultsRace", () => {
  it("defaults to last race with results", () => {
    const withResults = new Set(["r1", "r2"]);
    expect(selectResultsRace(races, withResults).id).toBe("r2");
  });
});
