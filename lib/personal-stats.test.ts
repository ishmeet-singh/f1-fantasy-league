import { describe, expect, it } from "vitest";
import { buildPersonalStats } from "./personal-stats";

const users = [
  { id: "u1", display_name: "Alice", email: "alice@example.com" },
  { id: "u2", display_name: null, email: "bob@example.com" }
];

describe("buildPersonalStats", () => {
  it("computes stats and rank from user scores plus cached totals", () => {
    const myScores = [
      {
        total_points: 100,
        exact_matches: 3,
        race_id: "r2",
        race_weekends: { grand_prix: "Monaco GP", race_start: "2026-05-25T12:00:00Z" }
      },
      {
        total_points: 80,
        exact_matches: 1,
        race_id: "r1",
        race_weekends: { grand_prix: "Bahrain GP", race_start: "2026-03-02T12:00:00Z" }
      }
    ];
    const totals = [
      { user_id: "u1", total_points: 100, total_error: 5, exact_matches: 3 },
      { user_id: "u1", total_points: 80, total_error: 2, exact_matches: 1 },
      { user_id: "u2", total_points: 150, total_error: 1, exact_matches: 2 }
    ];

    const stats = buildPersonalStats("u1", myScores, users, totals);
    expect(stats).toMatchObject({
      rank: 1,
      totalPoints: 180,
      bestWeekend: 100,
      exactMatches: 4,
      lastRace: { name: "Monaco GP", points: 100 }
    });
  });

  it("returns null when user has no scores", () => {
    expect(buildPersonalStats("u1", [], users, [])).toBeNull();
  });
});
