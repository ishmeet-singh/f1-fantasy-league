import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeAllScores } from "@/lib/recompute";
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
  await assertAdmin();
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

  // 2026 season has 22 drivers — cap matches DB constraint
  const MAX_POSITIONS = 22;
  const capped = driverIds.slice(0, MAX_POSITIONS);

  async function insertResults(eventType: "quali" | "sprint" | "race", topN: number) {
    const shuffled = shuffle(capped);
    await supabase.from("results").delete().eq("race_id", raceId).eq("event_type", eventType);
    const { error } = await supabase.from("results").insert(
      shuffled.slice(0, topN).map((driverId, idx) => ({
        race_id: raceId,
        event_type: eventType,
        driver_id: driverId,
        actual_position: idx + 1
      }))
    );
    if (error) throw new Error(`Insert ${eventType} results: ${error.message}`);
  }

  try {
    await insertResults("quali", 3);
    if (race.has_sprint) await insertResults("sprint", 10);
    await insertResults("race", Math.min(capped.length, MAX_POSITIONS));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await recomputeAllScores();

  return NextResponse.json({ ok: true, raceId, driversUsed: capped.length });
}
