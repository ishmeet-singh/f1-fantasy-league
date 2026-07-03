import { describe, expect, it } from "vitest";
import type { UserRow } from "@/lib/cached-reference-data";
import { computeSeasonProgress } from "@/lib/cancelled-races";
import { computeLeaderboard } from "@/lib/leaderboard-compute";

const cachedUsers: UserRow[] = [
  { id: "u1", display_name: "Alice", email: "alice@example.com" },
  { id: "u2", display_name: "Bob", email: "bob@example.com" }
];

const cachedRaceCompletions = ["r1", "r2"];

describe("cached dashboard reference data shapes", () => {
  it("cached user rows drive leaderboard the same as a live users query", () => {
    const scores = [
      {
        user_id: "u1",
        race_id: "r1",
        total_points: 80,
        total_error: 1,
        exact_matches: 1
      },
      {
        user_id: "u2",
        race_id: "r1",
        total_points: 95,
        total_error: 0,
        exact_matches: 2
      }
    ];
    const lb = computeLeaderboard(cachedUsers, scores);
    expect(lb[0].id).toBe("u2");
    expect(lb[0].name).toBe("Bob");
  });

  it("cached race completion ids drive season progress via a Set", () => {
    const season = computeSeasonProgress({
      raceIds: ["r1", "r2", "r3"],
      completedRaceIds: new Set(cachedRaceCompletions)
    });
    expect(season).toEqual({ past: 2, total: 3 });
  });
});
