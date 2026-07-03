import { DRIVER_CROSSREF_2026, type DriverCrossrefEntry } from "@/lib/driver-crossref-2026";
import { isValidDriverName } from "@/lib/driver-sync";

export type { DriverCrossrefEntry };

export type DriverCrossrefIndex = {
  byOpenF1Id: Map<string, DriverCrossrefEntry>;
  byJolpiId: Map<string, DriverCrossrefEntry>;
  byCode: Map<string, DriverCrossrefEntry>;
};

export function createDriverCrossrefIndex(
  entries: DriverCrossrefEntry[] = DRIVER_CROSSREF_2026
): DriverCrossrefIndex {
  const byOpenF1Id = new Map<string, DriverCrossrefEntry>();
  const byJolpiId = new Map<string, DriverCrossrefEntry>();
  const byCode = new Map<string, DriverCrossrefEntry>();

  for (const entry of entries) {
    byOpenF1Id.set(entry.openf1_id, entry);
    byJolpiId.set(entry.jolpi_id.toLowerCase(), entry);
    byCode.set(entry.code.toUpperCase(), entry);
  }

  return { byOpenF1Id, byJolpiId, byCode };
}

/** Shared index for the current season grid. */
export const driverCrossref = createDriverCrossrefIndex();

/** Map Jolpi/Ergast driverId → OpenF1 driver_number used as DB primary key. */
export function mapJolpiDriverToOpenF1(
  jolpiDriverId: string,
  index: DriverCrossrefIndex = driverCrossref
): string | null {
  const key = jolpiDriverId.toLowerCase();
  return index.byJolpiId.get(key)?.openf1_id ?? null;
}

export function lookupByOpenF1Id(
  openf1Id: string,
  index: DriverCrossrefIndex = driverCrossref
): DriverCrossrefEntry | null {
  return index.byOpenF1Id.get(String(openf1Id)) ?? null;
}

/**
 * Best display name for a driver row: valid DB name → crossref canonical → id.
 * Fixes blank names, bare car numbers, and Jolpi-style IDs in the UI.
 */
export function resolveDriverDisplayName(
  driverId: string,
  dbName?: string | null,
  index: DriverCrossrefIndex = driverCrossref
): string {
  const normalizedId = driverId.toLowerCase();
  const normalizedDb = dbName?.trim().toLowerCase();

  if (
    isValidDriverName(dbName) &&
    normalizedDb &&
    normalizedDb !== normalizedId
  ) {
    return dbName!.trim();
  }

  const byNumber = lookupByOpenF1Id(driverId, index);
  if (byNumber) return byNumber.canonical_name;

  const byJolpi = index.byJolpiId.get(normalizedId) ?? (normalizedDb ? index.byJolpiId.get(normalizedDb) : undefined);
  if (byJolpi) return byJolpi.canonical_name;

  return isValidDriverName(dbName) ? dbName!.trim() : driverId;
}

/**
 * Merge OpenF1 calendar sync row with crossref + existing DB row.
 * Crossref supplies canonical name when API sends blank or numeric-only names.
 */
export function mergeDriverWithCrossref(
  incoming: { id: string; name: string; team: string },
  existing?: { id: string; name: string; team: string } | null,
  index: DriverCrossrefIndex = driverCrossref
): { id: string; name: string; team: string } {
  const crossref = lookupByOpenF1Id(incoming.id, index);

  const name = isValidDriverName(incoming.name)
    ? incoming.name.trim()
    : isValidDriverName(existing?.name)
      ? existing!.name.trim()
        : crossref?.canonical_name ?? (incoming.name?.trim() || existing?.name || incoming.id);

  const incomingTeam = incoming.team?.trim();
  const existingTeam = existing?.team?.trim();
  const team =
    incomingTeam && incomingTeam !== "Unknown" && incomingTeam !== "TBD"
      ? incomingTeam
      : existingTeam && existingTeam !== "Unknown" && existingTeam !== "TBD"
        ? existingTeam
        : incomingTeam || existingTeam || "Unknown";

  return { id: incoming.id, name, team };
}

/** Map Jolpi result rows to OpenF1 driver_number IDs for the results table. */
export function mapJolpiResultsToOpenF1<T extends { driverId: string; position: number }>(
  rows: T[],
  index: DriverCrossrefIndex = driverCrossref
): { driver_number: string; position: number }[] {
  return rows
    .map((row) => {
      const driverNum = mapJolpiDriverToOpenF1(row.driverId, index);
      if (!driverNum) return null;
      return { driver_number: driverNum, position: row.position };
    })
    .filter((r): r is { driver_number: string; position: number } => r !== null);
}
