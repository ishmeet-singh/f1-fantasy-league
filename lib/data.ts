import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncCalendar } from "@/lib/sync";
import { fetchF1DriverStandings, type F1DriverStanding } from "@/lib/jolpi";
import { computeSeasonProgress } from "@/lib/cancelled-races";
import { computeLeaderboard, type WeekendScoreRow } from "@/lib/leaderboard-compute";
import { getCachedWeekendScoreTotals } from "@/lib/cached-reference-data";
import { buildPersonalStats } from "@/lib/personal-stats";
import type { UserRow } from "@/lib/leaderboard-compute";

async function fetchNextRaceFromDb() {
  const supabase = getSupabaseAdmin();

  // A race is "done" when race results exist in the DB.
  // "Next race" = earliest race that:
  //   1. Has no results (not completed), AND
  //   2. Has race_start in the future OR quali_start in the future
  //      (handles cancelled races where date has passed but no results)
  const { data: racesWithResults } = await supabase
    .from("results")
    .select("race_id")
    .eq("event_type", "race");

  const completedIds = new Set((racesWithResults ?? []).map(r => r.race_id));

  const { data: allRaces } = await supabase
    .from("race_weekends")
    .select("*")
    .order("race_start", { ascending: true });

  const now = new Date().toISOString();

  // First pass: future race with no results (the ideal "next race")
  const futureNext = (allRaces ?? []).find(
    r => !completedIds.has(r.id) && r.race_start > now
  );
  if (futureNext) return futureNext;

  // Second pass: most recently completed race (season might be over)
  const completed = (allRaces ?? []).filter(r => completedIds.has(r.id));
  return completed[completed.length - 1] ?? null;
}

export async function getNextRace() {
  let race = await fetchNextRaceFromDb();

  // If nothing found, DB might be empty — auto-populate and retry
  if (!race) {
    try {
      await syncCalendar();
      race = await fetchNextRaceFromDb();
    } catch (err) {
      console.error("Auto calendar sync failed:", err);
    }
  }

  return race;
}

export async function getSeasonProgress() {
  const supabase = getSupabaseAdmin();

  const [{ data: allRaces }, { data: completedResults }] = await Promise.all([
    supabase.from("race_weekends").select("id"),
    // A race "happened" when it has race results (cancelled races have no results)
    supabase.from("results").select("race_id").eq("event_type", "race")
  ]);

  const completedIds = new Set((completedResults ?? []).map(r => r.race_id));
  return computeSeasonProgress({
    raceIds: (allRaces ?? []).map((r) => r.id),
    completedRaceIds: completedIds
  });
}

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  error: number;
  exact: number;
  top: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseAdmin();
  const [usersRes, weekendsRes] = await Promise.all([
    supabase.from("users").select("id,display_name,email"),
    supabase
      .from("weekend_scores")
      .select("user_id,race_id,total_points,total_error,exact_matches")
  ]);
  return computeLeaderboard(usersRes.data ?? [], (weekendsRes.data ?? []) as WeekendScoreRow[]);
}

// Last completed race with optional user's score
export async function getLastCompletedRace(userId?: string): Promise<{
  id: string; grand_prix: string; race_start: string; userScore: number | null;
} | null> {
  const supabase = getSupabaseAdmin();

  // Find the most recently completed race (latest race_start with results)
  const { data: completedRaces } = await supabase
    .from("results")
    .select("race_id")
    .eq("event_type", "race");

  if (!completedRaces?.length) return null;

  const completedRaceIds = [...new Set(completedRaces.map(r => r.race_id))];

  const { data: raceRows } = await supabase
    .from("race_weekends")
    .select("id, grand_prix, race_start")
    .in("id", completedRaceIds)
    .order("race_start", { ascending: false })
    .limit(1);

  const bestRace = raceRows?.[0] ?? null;
  if (!bestRace) return null;

  let userScore: number | null = null;
  if (userId) {
    const { data: score } = await supabase
      .from("weekend_scores")
      .select("total_points")
      .eq("user_id", userId)
      .eq("race_id", bestRace.id)
      .maybeSingle();
    userScore = score?.total_points ?? null;
  }

  return { ...bestRace, userScore };
}

// F1 official driver championship standings
export async function getF1Championship(): Promise<F1DriverStanding[]> {
  return fetchF1DriverStandings(new Date().getUTCFullYear());
}

// Per-race points history for ALL players — used for expandable leaderboard rows
export type PointsHistoryEntry = {
  userId: string;
  userName: string;
  races: { raceId: string; raceName: string; points: number | null }[];
};

export async function getPointsHistory(): Promise<PointsHistoryEntry[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: users }, { data: races }, { data: scores }] = await Promise.all([
    supabase.from("users").select("id,display_name,email"),
    supabase.from("race_weekends").select("id,grand_prix,race_start").order("race_start", { ascending: true }),
    supabase.from("weekend_scores").select("user_id,race_id,total_points")
  ]);

  // Only include races that have been completed (have results)
  const { data: completedResults } = await supabase
    .from("results").select("race_id").eq("event_type", "race");
  const completedIds = new Set((completedResults ?? []).map(r => r.race_id));
  const completedRaces = (races ?? []).filter(r => completedIds.has(r.id));

  const scoreMap = new Map<string, number>();
  for (const s of scores ?? []) {
    scoreMap.set(`${s.user_id}:${s.race_id}`, s.total_points ?? 0);
  }

  return (users ?? []).map(u => ({
    userId: u.id,
    userName: u.display_name || u.email.split("@")[0],
    races: completedRaces.map(r => ({
      raceId: r.id,
      raceName: r.grand_prix.replace(" Grand Prix", "").replace("Grand Prix", "").trim(),
      points: scoreMap.has(`${u.id}:${r.id}`) ? (scoreMap.get(`${u.id}:${r.id}`) ?? 0) : null
    }))
  }));
}

export type PersonalStats = {
  rank: number;
  totalPoints: number;
  bestWeekend: number;
  exactMatches: number;
  lastRace: { name: string; points: number } | null;
};

export async function getPersonalStats(userId: string): Promise<PersonalStats | null> {
  const supabase = getSupabaseAdmin();

  const [myScoresRes, usersRes, scoreTotals] = await Promise.all([
    supabase
      .from("weekend_scores")
      .select("total_points,exact_matches,race_id,race_weekends(grand_prix,race_start)")
      .eq("user_id", userId),
    supabase.from("users").select("id,display_name,email"),
    getCachedWeekendScoreTotals()
  ]);

  return buildPersonalStats(
    userId,
    myScoresRes.data ?? [],
    (usersRes.data ?? []) as UserRow[],
    scoreTotals
  );
}
