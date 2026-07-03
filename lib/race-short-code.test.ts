import { describe, expect, it } from "vitest";
import { raceShortCode } from "./race-short-code";

describe("raceShortCode", () => {
  it("abbreviates single-word GPs", () => {
    expect(raceShortCode("Bahrain Grand Prix")).toBe("BAH");
  });

  it("abbreviates multi-word GPs with initials", () => {
    expect(raceShortCode("Saudi Arabian Grand Prix")).toBe("SA");
    expect(raceShortCode("United States Grand Prix")).toBe("US");
  });
});
