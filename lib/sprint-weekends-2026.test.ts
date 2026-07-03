import { describe, expect, it } from "vitest";
import { applyOfficialSprintWeekend2026, isOfficialSprintWeekend2026 } from "./sprint-weekends-2026";

describe("official 2026 sprint weekends", () => {
  const sprintNames = [
    "Chinese Grand Prix",
    "Miami Grand Prix",
    "Canadian Grand Prix",
    "British Grand Prix",
    "Dutch Grand Prix",
    "Singapore Grand Prix"
  ];

  it.each(sprintNames)("recognises %s as a 2026 sprint weekend", (name) => {
    expect(isOfficialSprintWeekend2026(name, 2026)).toBe(true);
  });

  it("does not mark Monaco as a sprint weekend", () => {
    expect(isOfficialSprintWeekend2026("Monaco Grand Prix", 2026)).toBe(false);
  });

  it("sets has_sprint and sprint_start when OpenF1 omits the sprint session", () => {
    const fixed = applyOfficialSprintWeekend2026({
      grand_prix: "British Grand Prix",
      quali_start: "2026-07-04T16:00:00.000Z",
      sprint_start: null,
      race_start: "2026-07-05T15:00:00.000Z",
      has_sprint: false
    });

    expect(fixed.has_sprint).toBe(true);
    expect(fixed.sprint_start).toBe("2026-07-04T12:00:00.000Z");
  });
});
