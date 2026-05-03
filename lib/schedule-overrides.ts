import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hard-coded schedule fixes when F1 changes times last-minute and aggregators lag.
 * Runs after each OpenF1 calendar sync so upstream re-writes do not undo the fix.
 * Remove rows here once OpenF1/Jolpi match the published F1 schedule.
 */
export async function applyScheduleOverridesAfterCalendarSync(supabase: SupabaseClient): Promise<void> {
  await pinMiamiGp2026RaceStart(supabase);
}

/** 2026 Miami GP — Sunday race moved ~3h earlier (weather). F1: 13:00 EDT → 17:00 UTC. */
async function pinMiamiGp2026RaceStart(supabase: SupabaseClient): Promise<void> {
  const raceStart = "2026-05-03T17:00:00.000Z";

  const { data: rows, error } = await supabase
    .from("race_weekends")
    .select("id,grand_prix,race_start")
    .ilike("grand_prix", "%Miami%");

  if (error) {
    console.warn("[schedule-overrides] Miami lookup failed:", error.message);
    return;
  }

  for (const row of rows ?? []) {
    const day = new Date(row.race_start).toISOString().slice(0, 10);
    if (day !== "2026-05-03") continue;

    const { error: upErr } = await supabase
      .from("race_weekends")
      .update({ race_start: raceStart })
      .eq("id", row.id);

    if (upErr) {
      console.warn("[schedule-overrides] Miami update failed:", upErr.message);
    } else {
      console.log("[schedule-overrides] Miami GP 2026 race_start →", raceStart, `(id=${row.id})`);
    }
  }
}
