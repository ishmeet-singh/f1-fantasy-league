import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCachedRaceWeekends } from "@/lib/cached-reference-data";
import { computeSeasonProgress } from "@/lib/cancelled-races";
import {
  computeLeaderboard,
  computePointsHistory,
  type WeekendScoreRow
} from "@/lib/leaderboard-compute";
import { fetchF1DriverStandings, type F1DriverStanding } from "@/lib/jolpi";
import type { LeaderboardEntry, PointsHistoryEntry } from "@/lib/data";
import type { RaceWeekendRow } from "@/lib/cached-reference-data";

export type DashboardPageData = {
  leaderboard: LeaderboardEntry[];
  nextRace: RaceWeekendRow | null;
  season: { total: number; past: number };
  lastRace: { id: string; grand_prix: string; race_start: string; userScore: number | null } | null;
  history: PointsHistoryEntry[];
  f1Standings: F1DriverStanding[];
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
  const supabase = getSupabaseAdmin();

  const [raceWeekends, usersRes, completedRes, weekendsRes, f1Standings] = await Promise.all([
    getCachedRaceWeekends(),
    supabase.from("users").select("id,display_name,email"),
    supabase.from("results").select("race_id").eq("event_type", "race"),
    supabase.from("weekend_scores").select("user_id,race_id,total_points,total_error,exact_matches"),
    fetchF1DriverStandings(new Date().getUTCFullYear())
  ]);

  const users = usersRes.data ?? [];
  const completedIds = new Set((completedRes.data ?? []).map((r) => r.race_id));
  const weekends = (weekendsRes.data ?? []) as WeekendScoreRow[];

  const leaderboard = computeLeaderboard(users, weekends);
  const history = computePointsHistory(users, raceWeekends, weekends, completedIds);
  const season = computeSeasonProgress({
    raceIds: raceWeekends.map((r) => r.id),
    completedRaceIds: completedIds
  });
  const nextRace = pickNextRace(raceWeekends, completedIds);
  const lastRace = pickLastCompletedRace(raceWeekends, completedIds, userId, weekends);

  let myNextPicks: DashboardPageData["myNextPicks"] = [];
  if (userId && nextRace) {
    const { data } = await supabase
      .from("predictions")
      .select("event_type,predicted_position,driver_id,drivers(name)")
      .eq("race_id", nextRace.id)
      .eq("user_id", userId)
      .order("predicted_position");
    myNextPicks = data ?? [];
  }

  return {
    leaderboard,
    nextRace,
    season,
    lastRace,
    history,
    f1Standings,
    myNextPicks
  };
}
