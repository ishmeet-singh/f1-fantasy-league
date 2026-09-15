import { describe, expect, it } from "vitest";
import { recentlySyncedEventTypes } from "@/lib/result-sessions";

describe("recentlySyncedEventTypes", () => {
  const now = Date.parse("2026-09-15T12:00:00Z");

  it("skips recently refreshed official sessions", () => {
    expect(
      recentlySyncedEventTypes(
        [
          {
            event_type: "quali",
            status: "official",
            last_synced_at: "2026-09-15T10:00:00Z"
          }
        ],
        now
      )
    ).toEqual(new Set(["quali"]));
  });

  it("refreshes official sessions after six hours", () => {
    expect(
      recentlySyncedEventTypes(
        [
          {
            event_type: "race",
            status: "official",
            last_synced_at: "2026-09-15T05:59:59Z"
          }
        ],
        now
      )
    ).toEqual(new Set());
  });
});
