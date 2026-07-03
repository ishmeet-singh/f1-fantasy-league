import { describe, expect, it } from "vitest";
import {
  BEST_WEEKENDS_COUNT,
  MAX_DROPPED_WEEKENDS,
  NO_DROP_UNTIL_WEEKENDS,
  computeSeasonStanding,
  countingWeekendsFor,
  dropsForScoredWeekends,
  formatSeasonStandingsSubtitle,
  progressiveStandingScores
} from "./season-standings";

const raceStarts = new Map([
  ["r1", "2026-03-01T12:00:00Z"],
  ["r2", "2026-03-08T12:00:00Z"],
  ["r3", "2026-03-15T12:00:00Z"],
  ["r4", "2026-03-22T12:00:00Z"],
  ["r5", "2026-03-29T12:00:00Z"],
  ["r6", "2026-04-05T12:00:00Z"],
  ["r7", "2026-04-12T12:00:00Z"],
  ["r8", "2026-04-19T12:00:00Z"]
]);

function weekend(
  race_id: string,
  total_points: number,
  total_error = 0,
  exact_matches = 0
) {
  return { race_id, total_points, total_error, exact_matches };
}

describe("dropsForScoredWeekends", () => {
  it("drops none for n ≤ 4", () => {
    expect(dropsForScoredWeekends(4)).toBe(0);
    expect(countingWeekendsFor(4)).toBe(4);
  });

  it("drops 1 at n = 5", () => {
    expect(dropsForScoredWeekends(5)).toBe(1);
    expect(countingWeekendsFor(5)).toBe(4);
  });

  it("drops 4 at n = 8 (best 4 count)", () => {
    expect(dropsForScoredWeekends(8)).toBe(4);
    expect(countingWeekendsFor(8)).toBe(4);
  });

  it("drops 4 at full season n = 22 (best 18 count)", () => {
    expect(dropsForScoredWeekends(22)).toBe(MAX_DROPPED_WEEKENDS);
    expect(countingWeekendsFor(22)).toBe(BEST_WEEKENDS_COUNT);
  });
});

describe("computeSeasonStanding", () => {
  it("sums all weekends when n = 4", () => {
    const result = computeSeasonStanding(
      [weekend("r1", 100), weekend("r2", 80), weekend("r3", 60), weekend("r4", 40)],
      raceStarts
    );
    expect(result.score).toBe(280);
    expect(result.droppedRaceIds).toEqual([]);
    expect(result.racesCounting).toBe(4);
  });

  it("drops lowest 1 at n = 5", () => {
    const result = computeSeasonStanding(
      [
        weekend("r1", 100),
        weekend("r2", 80),
        weekend("r3", 60),
        weekend("r4", 40),
        weekend("r5", 10)
      ],
      raceStarts
    );
    expect(result.score).toBe(280);
    expect(result.droppedRaceIds).toEqual(["r5"]);
  });

  it("keeps best 4 of 8 at n = 8", () => {
    const result = computeSeasonStanding(
      [
        weekend("r1", 100),
        weekend("r2", 90),
        weekend("r3", 80),
        weekend("r4", 70),
        weekend("r5", 60),
        weekend("r6", 50),
        weekend("r7", 40),
        weekend("r8", 30)
      ],
      raceStarts
    );
    expect(result.score).toBe(340);
    expect(result.countingRaceIds).toEqual(["r1", "r2", "r3", "r4"]);
    expect(result.droppedRaceIds).toEqual(["r5", "r6", "r7", "r8"]);
  });

  it("keeps best 18 of 22 at full season", () => {
    const weekends = Array.from({ length: 22 }, (_, i) =>
      weekend(`r${i + 1}`, 100 - i, i, i % 3)
    );
    const starts = new Map(
      weekends.map((w, i) => [w.race_id, `2026-${String(i + 1).padStart(2, "0")}-01T12:00:00Z`])
    );
    const result = computeSeasonStanding(weekends, starts);
    const expectedScore = Array.from({ length: 18 }, (_, i) => 100 - i).reduce((a, b) => a + b, 0);
    expect(result.racesCounting).toBe(18);
    expect(result.racesDropped).toBe(4);
    expect(result.score).toBe(expectedScore);
    expect(result.droppedRaceIds).toHaveLength(4);
  });

  it("drops earlier race when weekend points tie for last counting slot", () => {
    const starts = new Map([
      ["r1", "2026-01-01T12:00:00Z"],
      ["r2", "2026-02-01T12:00:00Z"],
      ["r3", "2026-03-01T12:00:00Z"],
      ["r4", "2026-04-01T12:00:00Z"],
      ["r5", "2026-05-01T12:00:00Z"],
      ["r6", "2026-06-01T12:00:00Z"],
      ["r7", "2026-07-01T12:00:00Z"],
      ["r8", "2026-08-01T12:00:00Z"]
    ]);
    const result = computeSeasonStanding(
      [
        weekend("r1", 100),
        weekend("r2", 100),
        weekend("r3", 100),
        weekend("r4", 100),
        weekend("r5", 100),
        weekend("r6", 50),
        weekend("r7", 50),
        weekend("r8", 50)
      ],
      starts
    );
    expect(result.countingRaceIds).toContain("r5");
    expect(result.countingRaceIds).not.toContain("r1");
    expect(result.droppedRaceIds).toContain("r1");
  });

  it("uses counting weekends only for error and exact tie-break stats", () => {
    const result = computeSeasonStanding(
      [
        weekend("r1", 100, 1, 1),
        weekend("r2", 90, 2, 1),
        weekend("r3", 80, 4, 1),
        weekend("r4", 70, 8, 1),
        weekend("r5", 10, 100, 9),
        weekend("r6", 10, 100, 9),
        weekend("r7", 10, 100, 9),
        weekend("r8", 10, 100, 9)
      ],
      raceStarts
    );
    expect(result.error).toBe(1 + 2 + 4 + 8);
    expect(result.exact).toBe(4);
  });

  it("all-zeros player still drops worst 4 of 8 (earliest races)", () => {
    const result = computeSeasonStanding(
      [
        weekend("r1", 0),
        weekend("r2", 0),
        weekend("r3", 0),
        weekend("r4", 0),
        weekend("r5", 0),
        weekend("r6", 0),
        weekend("r7", 0),
        weekend("r8", 0)
      ],
      raceStarts
    );
    expect(result.score).toBe(0);
    expect(new Set(result.droppedRaceIds)).toEqual(new Set(["r1", "r2", "r3", "r4"]));
    expect(new Set(result.countingRaceIds)).toEqual(new Set(["r5", "r6", "r7", "r8"]));
  });
});

describe("progressiveStandingScores", () => {
  it("matches raw sum until drops kick in at 5 weekends", () => {
    const weekends = [
      weekend("r1", 100),
      weekend("r2", 90),
      weekend("r3", 80),
      weekend("r4", 70)
    ];
    const order = ["r1", "r2", "r3", "r4"];
    expect(progressiveStandingScores(weekends, order, raceStarts)).toEqual([100, 190, 270, 340]);
  });

  it("drops worst weekend progressively from race 5 onward", () => {
    const weekends = [
      weekend("r1", 100),
      weekend("r2", 90),
      weekend("r3", 80),
      weekend("r4", 70),
      weekend("r5", 10)
    ];
    const order = ["r1", "r2", "r3", "r4", "r5"];
    expect(progressiveStandingScores(weekends, order, raceStarts)).toEqual([100, 190, 270, 340, 340]);
  });

  it("keeps best 4 of 8 at full eight-race sample", () => {
    const weekends = [
      weekend("r1", 84),
      weekend("r2", 96),
      weekend("r3", 84),
      weekend("r4", 100),
      weekend("r5", 32),
      weekend("r6", 76),
      weekend("r7", 69),
      weekend("r8", 56)
    ];
    const order = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
    const scores = progressiveStandingScores(weekends, order, raceStarts);
    expect(scores.at(-1)).toBe(364); // 96+100+84+84
  });
});

describe("formatSeasonStandingsSubtitle", () => {
  it("describes progressive drops for 8 completed races", () => {
    expect(formatSeasonStandingsSubtitle(8)).toBe("Best 4 of 8 counting · worst 4 dropped");
  });

  it("describes no drops for first four races", () => {
    expect(formatSeasonStandingsSubtitle(4)).toBe("All 4 races counting");
  });
});

describe("NO_DROP_UNTIL_WEEKENDS", () => {
  it("matches documented threshold", () => {
    expect(NO_DROP_UNTIL_WEEKENDS).toBe(4);
  });
});
