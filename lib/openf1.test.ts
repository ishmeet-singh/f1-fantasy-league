import { describe, expect, it } from "vitest";
import {
  hasPublishedClassificationCoverage,
  isSessionResultPublicationReady,
  selectLatestStartedCompetitiveSession
} from "@/lib/openf1";

describe("isSessionResultPublicationReady", () => {
  const now = Date.parse("2026-09-15T12:00:00Z");

  it("waits one hour after the scheduled session end", () => {
    expect(isSessionResultPublicationReady("2026-09-15T11:30:00Z", now)).toBe(false);
    expect(isSessionResultPublicationReady("2026-09-15T11:00:00Z", now)).toBe(true);
  });

  it("does not publish when OpenF1 omits the session end", () => {
    expect(isSessionResultPublicationReady(null, now)).toBe(false);
  });
});

describe("selectLatestStartedCompetitiveSession", () => {
  const now = Date.parse("2026-09-15T12:00:00Z");
  const session = (session_name: string, date_start: string, session_key: number) => ({
    session_name,
    date_start,
    date_end: null,
    session_key
  });

  it("ignores practice substitutes and future sessions", () => {
    expect(
      selectLatestStartedCompetitiveSession(
        [
          session("Practice 1", "2026-09-15T09:00:00Z", 1),
          session("Sprint Qualifying", "2026-09-15T11:00:00Z", 2),
          session("Sprint", "2026-09-15T13:00:00Z", 3)
        ],
        now
      )?.session_key
    ).toBe(2);
  });

  it("prefers the most recent started competitive session", () => {
    expect(
      selectLatestStartedCompetitiveSession(
        [
          session("Qualifying", "2026-09-14T12:00:00Z", 1),
          session("Race", "2026-09-15T10:00:00Z", 2)
        ],
        now
      )?.session_key
    ).toBe(2);
  });
});

describe("hasPublishedClassificationCoverage", () => {
  it("rejects a classification that omits session participants", () => {
    expect(hasPublishedClassificationCoverage(["1", "2"], ["1", "2", "3"])).toBe(false);
  });

  it("accepts a classification covering every session driver", () => {
    expect(hasPublishedClassificationCoverage(["1", "2", "3"], ["1", "2", "3"])).toBe(true);
  });
});
