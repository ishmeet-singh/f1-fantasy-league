import { requireAdminApi } from "@/lib/admin";
import { PICKS_REQUIRED } from "@/lib/pick-rules";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeAllScores } from "@/lib/recompute";
import { markResultSessionOfficial } from "@/lib/result-sessions";
import { NextResponse } from "next/server";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request) {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  const { raceId } = await req.json();
  if (!raceId) return NextResponse.json({ error: "raceId required" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: race } = await supabase
    .from("race_weekends")
    .select("has_sprint")
    .eq("id", raceId)
    .single();

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  const { data: drivers } = await supabase.from("drivers").select("id");
  if (!drivers?.length) return NextResponse.json({ error: "No drivers in DB" }, { status: 400 });

  const driverIds = drivers.map((d) => d.id);

  async function insertResults(eventType: "quali" | "sprint" | "race", topN: number) {
    const shuffled = shuffle(driverIds);
    const selected = shuffled.slice(0, topN);
    await supabase.from("results").delete().eq("race_id", raceId).eq("event_type", eventType);
    const { error } = await supabase.from("results").insert(
      selected.map((driverId, idx) => ({
        race_id: raceId,
        event_type: eventType,
        driver_id: driverId,
        actual_position: idx + 1
      }))
    );
    if (error) throw new Error(`Insert ${eventType} results: ${error.message}`);
    await markResultSessionOfficial({
      raceId,
      eventType,
      source: "manual",
      resultCount: selected.length
    });
  }

  try {
    await insertResults("quali", PICKS_REQUIRED.quali);
    if (race.has_sprint) await insertResults("sprint", PICKS_REQUIRED.sprint);
    await insertResults("race", driverIds.length);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await recomputeAllScores();

  return NextResponse.json({ ok: true, raceId, driversUsed: driverIds.length });
}
