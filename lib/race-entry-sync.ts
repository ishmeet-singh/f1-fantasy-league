import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchObservedCompetitionDrivers, type OpenF1Driver } from "@/lib/openf1";
import { mergeDriverWithCrossref } from "@/lib/driver-crossref";

export type RaceEntrySyncSource = "fia" | "openf1-session";

export type UpstreamRaceEntry = {
  driverId: string;
  driverName: string;
  team: string;
};

export type RaceEntrySyncResult = {
  status: "updated" | "unchanged" | "rejected";
  entryCount?: number;
  addedDriverIds?: string[];
  removedDriverIds?: string[];
  affectedPredictionRows?: number;
  reason?: string;
};

export async function replaceRaceEntriesFromSource(input: {
  raceId: string;
  source: RaceEntrySyncSource;
  entries: ReadonlyArray<UpstreamRaceEntry>;
  documentUrl?: string;
}): Promise<RaceEntrySyncResult> {
  const supabase = getSupabaseAdmin();
  const uniqueEntries = new Map(input.entries.map((entry) => [entry.driverId, entry]));
  if (uniqueEntries.size < 20) {
    return {
      status: "rejected",
      entryCount: uniqueEntries.size,
      reason: "Upstream roster has fewer than 20 unique drivers"
    };
  }

  const { data: existingDrivers, error: existingDriversError } = await supabase
    .from("drivers")
    .select("id,name,team")
    .in("id", [...uniqueEntries.keys()]);
  if (existingDriversError) {
    throw new Error(`[${input.raceId}] driver lookup: ${existingDriversError.message}`);
  }
  const existingById = new Map((existingDrivers ?? []).map((driver) => [driver.id, driver]));

  for (const entry of uniqueEntries.values()) {
    const merged = mergeDriverWithCrossref(
      {
        id: entry.driverId,
        name: entry.driverName,
        team: entry.team || "Unknown"
      },
      existingById.get(entry.driverId)
    );
    const { error } = await supabase.from("drivers").upsert(merged);
    if (error) throw new Error(`[${input.raceId}] driver ${entry.driverId}: ${error.message}`);
  }

  const { data, error } = await supabase.rpc("replace_race_entries_from_source", {
    p_race_id: input.raceId,
    p_source: input.source,
    p_entries: [...uniqueEntries.values()].map((entry) => ({
      driver_id: entry.driverId,
      driver_name: entry.driverName,
      team: entry.team || "Unknown"
    })),
    p_document_url: input.documentUrl ?? null
  });
  if (error) throw new Error(`[${input.raceId}] race-entry publication: ${error.message}`);

  return data as RaceEntrySyncResult;
}

function mapOpenF1Driver(driver: OpenF1Driver): UpstreamRaceEntry {
  return {
    driverId: String(driver.driver_number),
    driverName: driver.full_name.trim(),
    team: driver.team_name?.trim() || "Unknown"
  };
}

export async function syncObservedRaceEntries(
  raceId: string,
  nowMs = Date.now()
): Promise<RaceEntrySyncResult | null> {
  if (!/^\d+$/.test(raceId)) return null;
  const observed = await fetchObservedCompetitionDrivers(Number(raceId), nowMs);
  if (!observed) return null;

  return replaceRaceEntriesFromSource({
    raceId,
    source: "openf1-session",
    entries: observed.drivers.map(mapOpenF1Driver),
    documentUrl: `openf1://session/${observed.session.session_key}`
  });
}
