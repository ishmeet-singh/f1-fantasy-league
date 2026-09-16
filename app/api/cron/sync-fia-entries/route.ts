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
  entries: z.array(entrySchema).min(20).max(26)
});

export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const [{ data: races, error: racesError }, { data: drivers, error: driversError }] =
    await Promise.all([
      supabase
        .from("race_weekends")
        .select("id,grand_prix,quali_start,sprint_start,race_start")
        .not("id", "like", "jolpi-%")
        .gte("race_start", new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lte("race_start", new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString())
        .order("race_start"),
      supabase.from("drivers").select("id,name,team")
    ]);
  if (racesError || driversError) {
    return NextResponse.json(
      { error: racesError?.message ?? driversError?.message ?? "Context query failed" },
      { status: 500 }
    );
  }

  const driverById = new Map((drivers ?? []).map((driver) => [driver.id, driver]));
  return NextResponse.json({
    ok: true,
    year: new Date().getUTCFullYear(),
    races: races ?? [],
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
