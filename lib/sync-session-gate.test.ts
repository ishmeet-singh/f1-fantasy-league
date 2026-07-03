import { describe, expect, it } from "vitest";
import { sessionsReadyToSync } from "./sync-session-gate";

const britishGp = {
  has_sprint: true,
  quali_start: "2026-07-04T16:00:00.000Z",
  sprint_start: "2026-07-04T12:00:00.000Z",
  race_start: "2026-07-05T15:00:00.000Z"
};

describe("sessionsReadyToSync", () => {
  it("does not sync sprint before sprint start time", () => {
    const nowMs = new Date("2026-07-04T11:00:00.000Z").getTime();
    const events = sessionsReadyToSync(britishGp, nowMs, new Set());
    expect(events.map((e) => e.eventType)).toEqual([]);
  });

  it("syncs sprint after sprint starts but before quali", () => {
    const nowMs = new Date("2026-07-04T12:30:00.000Z").getTime();
    const events = sessionsReadyToSync(britishGp, nowMs, new Set());
    expect(events.map((e) => e.eventType)).toEqual(["sprint"]);
  });

  it("skips sessions already in the database", () => {
    const nowMs = new Date("2026-07-05T16:00:00.000Z").getTime();
    const events = sessionsReadyToSync(britishGp, nowMs, new Set(["quali", "sprint"]));
    expect(events.map((e) => e.eventType)).toEqual(["race"]);
  });
});
