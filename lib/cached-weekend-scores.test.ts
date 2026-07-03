import { describe, expect, it } from "vitest";
import type { WeekendScoreTotalRow } from "@/lib/cached-reference-data";
import { computeLeaderboard, computePointsHistory } from "@/lib/leaderboard-compute";

const users = [
  { id: "u1", display_name: "Alice", email: "alice@example.com" },
  { id: "u2", display_name: "Bob", email: "bob@example.com" }
];

const cachedScores: WeekendScoreTotalRow[] = [
  {
    user_id: "u1",
    race_id: "r1",
    total_points: 90,
    total_error: 2,
    exact_matches: 1
  },
  {
    user_id: "u2",
    race_id: "r1",
    total_points: 110,
    total_error: 1,
    exact_matches: 2
  }
];

describe("cached weekend_scores shape", () => {
  it("drives leaderboard the same as uncached weekend score rows", () => {
    const lb = computeLeaderboard(users, cachedScores);
    expect(lb[0].id).toBe("u2");
    expect(lb[0].score).toBe(110);
  });

  it("drives points history with per-race ids from cache", () => {
    const races = [{ id: "r1", grand_prix: "Bahrain Grand Prix" }];
    const history = computePointsHistory(users, races, cachedScores, new Set(["r1"]));
    expect(history[0].races[0]).toMatchObject({ raceId: "r1", points: 90 });
    expect(history[1].races[0]).toMatchObject({ raceId: "r1", points: 110 });
  });
});
