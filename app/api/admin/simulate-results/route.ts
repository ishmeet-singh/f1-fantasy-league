import { requireAdminApi } from "@/lib/admin";
import { PICKS_REQUIRED } from "@/lib/pick-rules";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeRaceScores } from "@/lib/recompute";
import { replaceSessionResultsAndPublish } from "@/lib/result-sessions";
import { revalidateTag } from "next/cache";
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
    await replaceSessionResultsAndPublish({
      raceId,
      eventType,
      source: "manual",
      results: selected.map((driverId, index) => ({
        driverId,
        actualPosition: index + 1
      }))
    });
  }

  try {
    await insertResults("quali", PICKS_REQUIRED.quali);
    if (race.has_sprint) await insertResults("sprint", PICKS_REQUIRED.sprint);
    await insertResults("race", driverIds.length);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const recompute = await recomputeRaceScores(raceId);
  if (recompute.errors.length) {
    return NextResponse.json({ ok: false, ...recompute }, { status: 500 });
  }
  revalidateTag("weekend-scores");
  revalidateTag("race-completions");

  return NextResponse.json({ ok: true, raceId, driversUsed: driverIds.length, recompute });
}
