import { describe, expect, it } from "vitest";
import { isValidDriverName, mergeDriverUpsert } from "./driver-sync";

describe("mergeDriverUpsert", () => {
  it("keeps existing name when OpenF1 sends an empty string", () => {
    const merged = mergeDriverUpsert(
      { id: "3", name: "", team: "Red Bull Racing" },
      { id: "3", name: "Max Verstappen", team: "Red Bull Racing" }
    );
    expect(merged.name).toBe("Max Verstappen");
  });

  it("keeps existing name when OpenF1 sends a bare car number", () => {
    const merged = mergeDriverUpsert(
      { id: "3", name: "3", team: "Red Bull Racing" },
      { id: "3", name: "Max Verstappen", team: "Red Bull Racing" }
    );
    expect(merged.name).toBe("Max Verstappen");
  });

  it("accepts a valid new name from the API", () => {
    const merged = mergeDriverUpsert(
      { id: "16", name: "Charles Leclerc", team: "Ferrari" },
      { id: "16", name: "Charles Leclerc", team: "Ferrari" }
    );
    expect(merged.name).toBe("Charles Leclerc");
  });
});

describe("isValidDriverName", () => {
  it("rejects blank and numeric-only names", () => {
    expect(isValidDriverName("")).toBe(false);
    expect(isValidDriverName("63")).toBe(false);
    expect(isValidDriverName("George Russell")).toBe(true);
  });
});
