import { describe, expect, it } from "vitest";
import { getEventConfig, pointsForDiff, scoreEvent } from "@/lib/scoring";

describe("scoring configuration", () => {
  it("uses normal and sprint-weekend caps for every event", () => {
    expect(getEventConfig("quali", false)).toMatchObject({ max: 12, penalty: 4 });
    expect(getEventConfig("race", false)).toMatchObject({ max: 12, penalty: 2 });
    expect(getEventConfig("quali", true)).toMatchObject({ max: 12, penalty: 4 });
    expect(getEventConfig("sprint", true)).toMatchObject({ max: 4, penalty: 1 });
    expect(getEventConfig("race", true)).toMatchObject({ max: 8, penalty: 2 });
  });

  it("never awards negative points", () => {
    expect(pointsForDiff("race", 99)).toBe(0);
  });
});

describe("scoreEvent", () => {
  const exactPodium = [
    { driver_id: "1", predicted_position: 1 },
    { driver_id: "2", predicted_position: 2 },
    { driver_id: "3", predicted_position: 3 }
  ];
  const results = [
    { driver_id: "1", actual_position: 1 },
    { driver_id: "2", actual_position: 2 },
    { driver_id: "3", actual_position: 3 }
  ];

  it("awards the configured exact-podium bonus", () => {
    expect(scoreEvent("quali", exactPodium, results, false)).toEqual({
      points: 42,
      totalError: 0,
      exactMatches: 3,
      podiumExact: true
    });
  });

  it("does not award a podium bonus when one podium place differs", () => {
    const swapped = [results[1], results[0], results[2]].map((row, index) => ({
      ...row,
      actual_position: index + 1
    }));
    expect(scoreEvent("quali", exactPodium, swapped, false).podiumExact).toBe(false);
  });

  it("uses the race entry count for an unclassified driver", () => {
    expect(
      scoreEvent(
        "race",
        [{ driver_id: "missing", predicted_position: 1 }],
        results,
        false,
        24
      ).totalError
    ).toBe(23);
  });
});
