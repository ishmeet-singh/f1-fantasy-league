import { scoreEvent } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { EventType } from "@/lib/types";

const events: EventType[] = ["quali", "sprint", "race"];

export async function recomputeAllScores() {
  const supabase = getSupabaseAdmin();

  // Fetch everything in 3 bulk queries instead of N×M×3 individual ones
  const [{ data: races }, { data: users }, { data: allPreds }, { data: allResults }] =
    await Promise.all([
      supabase.from("race_weekends").select("id,has_sprint"),
      supabase.from("users").select("id"),
      supabase.from("predictions").select("user_id,race_id,event_type,driver_id,predicted_position"),
      supabase.from("results").select("race_id,event_type,driver_id,actual_position")
    ]);

  if (!races?.length || !users?.length) return;

  // Index predictions: raceId -> eventType -> userId -> picks[]
  type Pred = { driver_id: string; predicted_position: number };
  const predIndex = new Map<string, Map<string, Map<string, Pred[]>>>();
  for (const p of allPreds ?? []) {
    if (!predIndex.has(p.race_id)) predIndex.set(p.race_id, new Map());
    const byEvent = predIndex.get(p.race_id)!;
    if (!byEvent.has(p.event_type)) byEvent.set(p.event_type, new Map());
    const byUser = byEvent.get(p.event_type)!;
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
    byUser.get(p.user_id)!.push({ driver_id: p.driver_id, predicted_position: p.predicted_position });
  }

  // Index results: raceId -> eventType -> results[]
  type Res = { driver_id: string; actual_position: number };
  const resultIndex = new Map<string, Map<string, Res[]>>();
  for (const r of allResults ?? []) {
    if (!resultIndex.has(r.race_id)) resultIndex.set(r.race_id, new Map());
    const byEvent = resultIndex.get(r.race_id)!;
    if (!byEvent.has(r.event_type)) byEvent.set(r.event_type, []);
    byEvent.get(r.event_type)!.push({ driver_id: r.driver_id, actual_position: r.actual_position });
  }

  // Compute all scores in memory
  const scoreRows: {
    user_id: string; race_id: string; event_type: string;
    points: number; total_error: number; exact_matches: number;
  }[] = [];

  const weekendRows: {
    user_id: string; race_id: string;
    total_points: number; total_error: number; exact_matches: number;
  }[] = [];

  for (const race of races) {
    for (const user of users) {
      let weekendPoints = 0, weekendError = 0, weekendExact = 0;

      for (const eventType of events) {
        if (eventType === "sprint" && !race.has_sprint) continue;

        const preds = predIndex.get(race.id)?.get(eventType)?.get(user.id) ?? [];
        const results = resultIndex.get(race.id)?.get(eventType) ?? [];
        if (!preds.length || !results.length) continue;

        const score = scoreEvent(eventType, preds, results);
        weekendPoints += score.points;
        weekendError += score.totalError;
        weekendExact += score.exactMatches;

        scoreRows.push({
          user_id: user.id, race_id: race.id, event_type: eventType,
          points: score.points, total_error: score.totalError, exact_matches: score.exactMatches
        });
      }

      weekendRows.push({
        user_id: user.id, race_id: race.id,
        total_points: weekendPoints, total_error: weekendError, exact_matches: weekendExact
      });
    }
  }

  // Batch upsert — must specify conflict target since tables use identity PKs
  if (scoreRows.length) {
    const { error } = await supabase
      .from("scores")
      .upsert(scoreRows, { onConflict: "user_id,race_id,event_type" });
    if (error) console.error("scores upsert error:", error.message);
  }
  if (weekendRows.length) {
    const { error } = await supabase
      .from("weekend_scores")
      .upsert(weekendRows, { onConflict: "user_id,race_id" });
    if (error) console.error("weekend_scores upsert error:", error.message);
  }
}
