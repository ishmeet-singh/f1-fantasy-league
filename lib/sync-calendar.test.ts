import { describe, expect, it } from "vitest";
import { calendarTimingChanged } from "@/lib/sync";

describe("calendarTimingChanged", () => {
  const original = {
    quali_start: "2026-09-18T14:00:00.000Z",
    sprint_start: null,
    race_start: "2026-09-20T13:00:00.000Z"
  };

  it("treats equivalent ISO timestamps as unchanged", () => {
    expect(
      calendarTimingChanged(original, {
        ...original,
        race_start: "2026-09-20T13:00:00Z"
      })
    ).toBe(false);
  });

  it("detects session time and sprint-format changes", () => {
    expect(
      calendarTimingChanged(original, {
        ...original,
        quali_start: "2026-09-18T15:00:00.000Z"
      })
    ).toBe(true);
    expect(
      calendarTimingChanged(original, {
        ...original,
        sprint_start: "2026-09-19T10:00:00.000Z"
      })
    ).toBe(true);
  });
});
