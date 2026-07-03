export type DriverRow = { id: string; name: string; team: string };

/** True when a stored driver display name is usable (not blank or a bare car number). */
export function isValidDriverName(name: string | null | undefined): boolean {
  if (!name || !String(name).trim()) return false;
  const trimmed = String(name).trim();
  return !/^\d+$/.test(trimmed);
}

/**
 * Merge incoming OpenF1 driver data with an existing row so empty API names
 * never overwrite a good name already in the database.
 */
export function mergeDriverUpsert(
  incoming: DriverRow,
  existing?: DriverRow | null
): DriverRow {
  const name = isValidDriverName(incoming.name)
    ? incoming.name.trim()
    : isValidDriverName(existing?.name)
      ? existing!.name
      : incoming.name?.trim() || existing?.name || incoming.id;

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
