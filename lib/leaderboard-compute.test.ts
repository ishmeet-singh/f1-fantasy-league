import { describe, expect, it } from "vitest";
import {
  computeLeaderboard,
  computePointsHistory,
  computeUserRank,
  type WeekendScoreRow
} from "./leaderboard-compute";

const races = [
  { id: "r1", grand_prix: "Bahrain", race_start: "2026-03-01T12:00:00Z" },
  { id: "r2", grand_prix: "Monaco", race_start: "2026-03-08T12:00:00Z" }
];

const users = [
  { id: "u1", display_name: "Alice", email: "alice@example.com" },
  { id: "u2", display_name: null, email: "bob@example.com" },
  { id: "u3", display_name: "Carol", email: "carol@example.com" }
];

const completed = new Set(["r1", "r2"]);

describe("computeLeaderboard", () => {
  it("ranks by progressive season total, then tiebreakers", () => {
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 100, total_error: 5, exact_matches: 2 },
      { user_id: "u1", race_id: "r2", total_points: 80, total_error: 3, exact_matches: 1 },
      { user_id: "u2", race_id: "r1", total_points: 120, total_error: 10, exact_matches: 1 },
      { user_id: "u2", race_id: "r2", total_points: 90, total_error: 2, exact_matches: 0 },
      { user_id: "u3", race_id: "r1", total_points: 50, total_error: 1, exact_matches: 0 }
    ];

    const lb = computeLeaderboard(users, weekends, races, completed);
    expect(lb.map((e) => e.id)).toEqual(["u2", "u1", "u3"]);
    expect(lb[0].score).toBe(210);
    expect(lb[1].score).toBe(180);
    expect(lb[2].name).toBe("Carol");
    expect(lb[0].droppedRaceIds).toEqual([]);
  });

  it("includes users with no scores at zero points", () => {
    const lb = computeLeaderboard(users, [], races, completed);
    expect(lb).toHaveLength(3);
    expect(lb.every((e) => e.score === 0)).toBe(true);
  });

  it("breaks ties on season total using counting-weekend error then exact", () => {
    const fiveRaces = [
      { id: "r1", grand_prix: "A", race_start: "2026-01-01T12:00:00Z" },
      { id: "r2", grand_prix: "B", race_start: "2026-02-01T12:00:00Z" },
      { id: "r3", grand_prix: "C", race_start: "2026-03-01T12:00:00Z" },
      { id: "r4", grand_prix: "D", race_start: "2026-04-01T12:00:00Z" },
      { id: "r5", grand_prix: "E", race_start: "2026-05-01T12:00:00Z" }
    ];
    const completedFive = new Set(fiveRaces.map((r) => r.id));
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 100, total_error: 5, exact_matches: 1 },
      { user_id: "u1", race_id: "r2", total_points: 90, total_error: 2, exact_matches: 1 },
      { user_id: "u1", race_id: "r3", total_points: 80, total_error: 2, exact_matches: 1 },
      { user_id: "u1", race_id: "r4", total_points: 70, total_error: 2, exact_matches: 1 },
      { user_id: "u1", race_id: "r5", total_points: 10, total_error: 99, exact_matches: 0 },
      { user_id: "u2", race_id: "r1", total_points: 100, total_error: 3, exact_matches: 2 },
      { user_id: "u2", race_id: "r2", total_points: 90, total_error: 2, exact_matches: 1 },
      { user_id: "u2", race_id: "r3", total_points: 80, total_error: 2, exact_matches: 1 },
      { user_id: "u2", race_id: "r4", total_points: 70, total_error: 2, exact_matches: 1 },
      { user_id: "u2", race_id: "r5", total_points: 10, total_error: 99, exact_matches: 0 }
    ];
    const lb = computeLeaderboard(users.slice(0, 2), weekends, fiveRaces, completedFive);
    expect(lb[0].id).toBe("u2");
    expect(lb[0].score).toBe(lb[1].score);
    expect(lb[0].error).toBe(9);
    expect(lb[1].error).toBe(11);
  });
});

describe("computeUserRank", () => {
  it("returns 1-based rank for a user on the leaderboard", () => {
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 50, total_error: 0, exact_matches: 0 },
      { user_id: "u2", race_id: "r1", total_points: 100, total_error: 0, exact_matches: 0 }
    ];
    const lb = computeLeaderboard(users.slice(0, 2), weekends, races.slice(0, 1), new Set(["r1"]));
    expect(computeUserRank("u2", lb)).toBe(1);
    expect(computeUserRank("u1", lb)).toBe(2);
  });

  it("returns last place when user is missing from leaderboard", () => {
    const lb = computeLeaderboard(users.slice(0, 2), [], races, completed);
    expect(computeUserRank("unknown", lb)).toBe(2);
  });
});

describe("computePointsHistory", () => {
  it("builds per-race points only for completed races and marks dropped", () => {
    const raceList = [
      { id: "r1", grand_prix: "Bahrain Grand Prix" },
      { id: "r2", grand_prix: "Saudi Arabian Grand Prix" },
      { id: "r3", grand_prix: "Australian Grand Prix" },
      { id: "r4", grand_prix: "Japanese Grand Prix" },
      { id: "r5", grand_prix: "Chinese Grand Prix" }
    ];
    const weekends: WeekendScoreRow[] = [
      { user_id: "u1", race_id: "r1", total_points: 100, total_error: 0, exact_matches: 0 },
      { user_id: "u1", race_id: "r2", total_points: 90, total_error: 0, exact_matches: 0 },
      { user_id: "u1", race_id: "r3", total_points: 80, total_error: 0, exact_matches: 0 },
      { user_id: "u1", race_id: "r4", total_points: 70, total_error: 0, exact_matches: 0 },
      { user_id: "u1", race_id: "r5", total_points: 10, total_error: 0, exact_matches: 0 }
    ];
    const completedFive = new Set(["r1", "r2", "r3", "r4", "r5"]);
    const starts = raceList.map((r, i) => ({
      id: r.id,
      race_start: `2026-03-${String(i + 1).padStart(2, "0")}T12:00:00Z`
    }));
    const lb = computeLeaderboard(users.slice(0, 1), weekends, starts, completedFive);
    const history = computePointsHistory(
      users.slice(0, 1),
      raceList,
      weekends,
      completedFive,
      lb
    );
    expect(history[0].races).toHaveLength(5);
    expect(history[0].races.find((r) => r.raceId === "r5")?.dropped).toBe(true);
    expect(history[0].races.find((r) => r.raceId === "r4")?.dropped).toBe(false);
  });
});
