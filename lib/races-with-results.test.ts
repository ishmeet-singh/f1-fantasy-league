import { describe, expect, it } from "vitest";
import { distinctRaceIdsFromRaceResults } from "./races-with-results";

describe("distinctRaceIdsFromRaceResults", () => {
  it("dedupes race_id values from race-result rows", () => {
    const ids = distinctRaceIdsFromRaceResults([
      { race_id: "r1" },
      { race_id: "r1" },
      { race_id: "r2" }
    ]);
    expect([...ids].sort()).toEqual(["r1", "r2"]);
  });
});
