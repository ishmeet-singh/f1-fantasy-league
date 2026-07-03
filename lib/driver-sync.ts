export type DriverRow = { id: string; name: string; team: string };

/** True when a stored driver display name is usable (not blank or a bare car number). */
export function isValidDriverName(name: string | null | undefined): boolean {
  if (!name || !String(name).trim()) return false;
  const trimmed = String(name).trim();
  return !/^\d+$/.test(trimmed);
}

export { mergeDriverWithCrossref as mergeDriverUpsert } from "@/lib/driver-crossref";
