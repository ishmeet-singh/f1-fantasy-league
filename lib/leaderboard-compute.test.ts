import { describe, expect, it } from "vitest";
import {
  computeLeaderboard,
  computePointsHistory,
  computeUserRank,
  type WeekendScoreRow
} from "./leaderboard-compute";

const users = [
  { id: "u1", display_name: "Alice", email: "alice@example.com" },
  { id: "u2", display_name: null, email: "bob@example.com" },
  { id: "u3", display_name: "Carol", email: "carol@example.com" }
];

describe("computeLeaderboard", () => {
  it("ranks by best-18 weekend total, then tiebreakers", () => {
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 100, total_error: 5, exact_matches: 2 },
      { user_id: "u1", race_id: "r2", total_points: 80, total_error: 3, exact_matches: 1 },
      { user_id: "u2", race_id: "r1", total_points: 120, total_error: 10, exact_matches: 1 },
      { user_id: "u2", race_id: "r2", total_points: 90, total_error: 2, exact_matches: 0 },
      { user_id: "u3", race_id: "r1", total_points: 50, total_error: 1, exact_matches: 0 }
    ];

    const lb = computeLeaderboard(users, weekends);
    expect(lb.map((e) => e.id)).toEqual(["u2", "u1", "u3"]);
    expect(lb[0].score).toBe(210);
    expect(lb[1].score).toBe(180);
    expect(lb[2].name).toBe("Carol");
  });

  it("includes users with no scores at zero points", () => {
    const lb = computeLeaderboard(users, []);
    expect(lb).toHaveLength(3);
    expect(lb.every((e) => e.score === 0)).toBe(true);
  });
});

describe("computeUserRank", () => {
  it("returns 1-based rank for a user on the leaderboard", () => {
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 50, total_error: 0, exact_matches: 0 },
      { user_id: "u2", race_id: "r1", total_points: 100, total_error: 0, exact_matches: 0 }
    ];
    const lb = computeLeaderboard(users, weekends);
    expect(computeUserRank("u2", lb)).toBe(1);
    expect(computeUserRank("u1", lb)).toBe(2);
  });

  it("returns last place when user is missing from leaderboard", () => {
    const lb = computeLeaderboard(users.slice(0, 2), []);
    expect(computeUserRank("unknown", lb)).toBe(2);
  });
});

describe("computePointsHistory", () => {
  it("builds per-race points only for completed races", () => {
    const races = [
      { id: "r1", grand_prix: "Bahrain Grand Prix" },
      { id: "r2", grand_prix: "Saudi Arabian Grand Prix" }
    ];
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 42, total_error: 0, exact_matches: 0 }
    ];
    const completed = new Set(["r1"]);

    const history = computePointsHistory(users.slice(0, 1), races, weekends, completed);
    expect(history[0].races).toHaveLength(1);
    expect(history[0].races[0]).toMatchObject({ raceId: "r1", raceName: "Bahrain", points: 42 });
  });
});
