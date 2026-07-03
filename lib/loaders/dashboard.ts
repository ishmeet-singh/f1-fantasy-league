import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCachedRaceWeekends, getCachedWeekendScores } from "@/lib/cached-reference-data";
import { computeSeasonProgress } from "@/lib/cancelled-races";
import {
  computeLeaderboard,
  computePointsHistory,
  type WeekendScoreRow
} from "@/lib/leaderboard-compute";
import type { LeaderboardEntry, PointsHistoryEntry } from "@/lib/data";
import type { RaceWeekendRow } from "@/lib/cached-reference-data";
import { markRuntimeInvocation, perfLog, timeAsync } from "@/lib/perf-investigate";

export type DashboardPageData = {
  leaderboard: LeaderboardEntry[];
  nextRace: RaceWeekendRow | null;
  season: { total: number; past: number };
  lastRace: { id: string; grand_prix: string; race_start: string; userScore: number | null } | null;
  history: PointsHistoryEntry[];
  myNextPicks: {
    event_type: string;
    predicted_position: number;
    driver_id: string;
    drivers: { name: string } | { name: string }[] | null;
  }[];
};

function pickNextRace(
  allRaces: RaceWeekendRow[],
  completedIds: Set<string>
): RaceWeekendRow | null {
  const now = new Date().toISOString();
  const futureNext = allRaces.find((r) => !completedIds.has(r.id) && r.race_start > now);
  if (futureNext) return futureNext;
  const completed = allRaces.filter((r) => completedIds.has(r.id));
  return completed[completed.length - 1] ?? null;
}

function pickLastCompletedRace(
  allRaces: RaceWeekendRow[],
  completedIds: Set<string>,
  userId: string | undefined,
  weekends: WeekendScoreRow[]
) {
  const completed = allRaces.filter((r) => completedIds.has(r.id));
  const bestRace = completed[completed.length - 1];
  if (!bestRace) return null;

  let userScore: number | null = null;
  if (userId) {
    const row = weekends.find((w) => w.user_id === userId && w.race_id === bestRace.id);
    userScore = row?.total_points ?? null;
  }

  return {
    id: bestRace.id,
    grand_prix: bestRace.grand_prix,
    race_start: bestRace.race_start,
    userScore
  };
}

/** Batched dashboard load — shared queries, in-memory derivations. */
export async function loadDashboardPage(userId: string | undefined): Promise<DashboardPageData> {
  const wallStart = performance.now();
  const runtime = markRuntimeInvocation("nodejs");

  const clientInitStart = performance.now();
  const supabase = getSupabaseAdmin();
  const clientInitMs = Math.round(performance.now() - clientInitStart);

  const batchStart = performance.now();
  const [raceWeekendsTimed, usersTimed, completedTimed, weekendsTimed] = await Promise.all([
    timeAsync("cache_race_weekends", () => getCachedRaceWeekends()),
    timeAsync("db_users", async () => supabase.from("users").select("id,display_name,email")),
    timeAsync("db_results_race_completions", async () =>
      supabase.from("results").select("race_id").eq("event_type", "race")
    ),
    timeAsync("cache_weekend_scores", () => getCachedWeekendScores())
  ]);

  const segments: Record<string, number> = {
    supabase_admin_client_init: clientInitMs,
    parallel_batch_wall: Math.round(performance.now() - batchStart),
    cache_race_weekends: raceWeekendsTimed.ms,
    db_users: usersTimed.ms,
    db_results_race_completions: completedTimed.ms,
    cache_weekend_scores: weekendsTimed.ms
  };

  const raceWeekends = raceWeekendsTimed.result;
  const usersRes = usersTimed.result;
  const completedRes = completedTimed.result;
  const weekends = weekendsTimed.result;

  const users = usersRes.data ?? [];
  const completedIds = new Set((completedRes.data ?? []).map((r) => r.race_id));
  const weekendRows = weekends as WeekendScoreRow[];

  const computeStart = performance.now();
  const leaderboard = computeLeaderboard(users, weekendRows);
  const history = computePointsHistory(users, raceWeekends, weekendRows, completedIds);
  const season = computeSeasonProgress({
    raceIds: raceWeekends.map((r) => r.id),
    completedRaceIds: completedIds
  });
  const nextRace = pickNextRace(raceWeekends, completedIds);
  const lastRace = pickLastCompletedRace(raceWeekends, completedIds, userId, weekendRows);
  segments.compute_in_memory = Math.round(performance.now() - computeStart);

  let myNextPicks: DashboardPageData["myNextPicks"] = [];
  if (userId && nextRace) {
    const picksTimed = await timeAsync("db_my_predictions", async () =>
      supabase
        .from("predictions")
        .select("event_type,predicted_position,driver_id,drivers(name)")
        .eq("race_id", nextRace.id)
        .eq("user_id", userId)
        .order("predicted_position")
    );
    segments.db_my_predictions = picksTimed.ms;
    myNextPicks = picksTimed.result.data ?? [];
  }

  const totalMs = Math.round(performance.now() - wallStart);
  perfLog("dashboard_load_summary", {
    ...runtime,
    userId: userId ?? null,
    totalMs,
    segments,
    rowCounts: {
      raceWeekends: raceWeekends.length,
      users: users.length,
      completedRaces: completedIds.size,
      weekendScores: weekendRows.length
    }
  });

  return {
    leaderboard,
    nextRace,
    season,
    lastRace,
    history,
    myNextPicks
  };
}
