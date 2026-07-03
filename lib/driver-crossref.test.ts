import { describe, expect, it } from "vitest";
import {
  createDriverCrossrefIndex,
  mapJolpiDriverToOpenF1,
  mapJolpiResultsToOpenF1,
  mergeDriverWithCrossref,
  resolveDriverDisplayName
} from "./driver-crossref";
import { DRIVER_CROSSREF_2026 } from "./driver-crossref-2026";

describe("mapJolpiDriverToOpenF1", () => {
  it("maps Jolpi driverId to OpenF1 permanent number by code/id, not last name", () => {
    expect(mapJolpiDriverToOpenF1("max_verstappen")).toBe("3");
    expect(mapJolpiDriverToOpenF1("leclerc")).toBe("16");
    expect(mapJolpiDriverToOpenF1("russell")).toBe("63");
  });

  it("does not guess from ambiguous last name alone", () => {
    const tinyIndex = createDriverCrossrefIndex([
      { openf1_id: "63", jolpi_id: "russell", code: "RUS", canonical_name: "George Russell" },
      { openf1_id: "16", jolpi_id: "leclerc", code: "LEC", canonical_name: "Charles Leclerc" }
    ]);
    expect(mapJolpiDriverToOpenF1("unknown_driver", tinyIndex)).toBeNull();
  });
});

describe("resolveDriverDisplayName", () => {
  it("uses canonical name when DB has a bare car number", () => {
    expect(resolveDriverDisplayName("3", "3")).toBe("Max Verstappen");
  });

  it("uses canonical name when DB name is blank", () => {
    expect(resolveDriverDisplayName("3", "")).toBe("Max Verstappen");
    expect(resolveDriverDisplayName("3", null)).toBe("Max Verstappen");
  });

  it("keeps a valid DB name from the primary source", () => {
    expect(resolveDriverDisplayName("16", "Charles Leclerc")).toBe("Charles Leclerc");
  });

  it("resolves Jolpi-style IDs when shown in the UI", () => {
    expect(resolveDriverDisplayName("max_verstappen", "max_verstappen")).toBe("Max Verstappen");
  });
});

describe("mergeDriverWithCrossref", () => {
  it("restores Verstappen when OpenF1 sync sends empty name", () => {
    const merged = mergeDriverWithCrossref(
      { id: "3", name: "", team: "Red Bull Racing" },
      { id: "3", name: "Max Verstappen", team: "Red Bull Racing" }
    );
    expect(merged.name).toBe("Max Verstappen");
  });

  it("uses crossref when both API and DB names are bad", () => {
    const merged = mergeDriverWithCrossref(
      { id: "3", name: "3", team: "Red Bull Racing" },
      { id: "3", name: "3", team: "Red Bull Racing" }
    );
    expect(merged.name).toBe("Max Verstappen");
  });
});

describe("mapJolpiResultsToOpenF1", () => {
  it("maps backup-source results using driverId codes", () => {
    const mapped = mapJolpiResultsToOpenF1([
      { driverId: "max_verstappen", position: 1 },
      { driverId: "norris", position: 2 }
    ]);
    expect(mapped).toEqual([
      { driver_number: "3", position: 1 },
      { driver_number: "1", position: 2 }
    ]);
  });

  it("covers the full 2026 grid without duplicate openf1 ids", () => {
    const ids = new Set(DRIVER_CROSSREF_2026.map((d) => d.openf1_id));
    expect(ids.size).toBe(DRIVER_CROSSREF_2026.length);
    expect(DRIVER_CROSSREF_2026.length).toBe(22);
  });
});
