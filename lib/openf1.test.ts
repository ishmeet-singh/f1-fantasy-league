import { describe, expect, it } from "vitest";
import {
  hasPublishedClassificationCoverage,
  isSessionResultPublicationReady
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

describe("hasPublishedClassificationCoverage", () => {
  it("rejects a classification that omits session participants", () => {
    expect(hasPublishedClassificationCoverage(["1", "2"], ["1", "2", "3"])).toBe(false);
  });

  it("accepts a classification covering every session driver", () => {
    expect(hasPublishedClassificationCoverage(["1", "2", "3"], ["1", "2", "3"])).toBe(true);
  });
});
