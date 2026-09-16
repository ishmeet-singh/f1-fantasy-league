import { NextResponse } from "next/server";
import { z } from "zod";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DRIVER_CROSSREF_2026 } from "@/lib/driver-crossref-2026";
import { replaceRaceEntriesFromSource } from "@/lib/race-entry-sync";

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  driverId: z.string().min(1),
  driverName: z.string().min(1),
  team: z.string().min(1)
});

const publishSchema = z.object({
  raceId: z.string().regex(/^\d+$/),
  documentUrl: z.string().url(),
  entries: z.array(entrySchema).min(20).max(30)
});

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const [
    { data: races, error: racesError },
    { data: drivers, error: driversError },
    { data: raceEntries, error: raceEntriesError }
  ] =
    await Promise.all([
      supabase
        .from("race_weekends")
        .select("id,grand_prix,quali_start,sprint_start,race_start")
        .not("id", "like", "jolpi-%")
        // Keep the previous two weekends available so corrected/recalled FIA
        // entry lists can be reconciled and the parser remains continuously exercised.
        .gte("race_start", new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString())
        .lte("race_start", new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString())
        .order("race_start"),
      supabase.from("drivers").select("id,name,team"),
      supabase.from("race_entries").select("race_id")
    ]);
  if (racesError || driversError || raceEntriesError) {
    return NextResponse.json(
      {
        error:
          racesError?.message ??
          driversError?.message ??
          raceEntriesError?.message ??
          "Context query failed"
      },
      { status: 500 }
    );
  }

  const driverById = new Map((drivers ?? []).map((driver) => [driver.id, driver]));
  const entryCountByRace = new Map<string, number>();
  for (const entry of raceEntries ?? []) {
    entryCountByRace.set(entry.race_id, (entryCountByRace.get(entry.race_id) ?? 0) + 1);
  }
  const countFrequency = new Map<number, number>();
  for (const count of entryCountByRace.values()) {
    if (count < 20) continue;
    countFrequency.set(count, (countFrequency.get(count) ?? 0) + 1);
  }
  const seasonEntryCount =
    [...countFrequency.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 20;

  return NextResponse.json({
    ok: true,
    year: new Date().getUTCFullYear(),
    races: (races ?? []).map((race) => ({
      ...race,
      expectedEntryCount: entryCountByRace.get(race.id) ?? seasonEntryCount
    })),
    drivers: DRIVER_CROSSREF_2026.map((crossref) => ({
      driverId: crossref.openf1_id,
      code: crossref.code,
      driverName: driverById.get(crossref.openf1_id)?.name ?? crossref.canonical_name,
      team: driverById.get(crossref.openf1_id)?.team ?? "Unknown"
    }))
  });
}

export async function POST(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = publishSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid FIA race-entry payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await replaceRaceEntriesFromSource({
      raceId: parsed.data.raceId,
      source: "fia",
      documentUrl: parsed.data.documentUrl,
      entries: parsed.data.entries
    });
    return NextResponse.json({ ok: result.status !== "rejected", ...result });
  } catch (error) {
    console.error("FIA race-entry sync failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
