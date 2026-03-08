import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { bestNWeekendTotal } from "@/lib/scoring";
import { syncCalendar } from "@/lib/sync";
import { fetchF1DriverStandings, type F1DriverStanding } from "@/lib/jolpi";

async function fetchNextRaceFromDb() {
  const supabase = getSupabaseAdmin();

  // A race is "done" when race results exist in the DB.
  // Next race = earliest race weekend with NO race results yet.
  const { data: racesWithResults } = await supabase
    .from("results")
    .select("race_id")
    .eq("event_type", "race");

  const completedIds = new Set((racesWithResults ?? []).map(r => r.race_id));

  const { data: allRaces } = await supabase
    .from("race_weekends")
    .select("*")
    .order("race_start", { ascending: true });

  const next = (allRaces ?? []).find(r => !completedIds.has(r.id));
  return next ?? null;
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
    // A race is "completed" when race results exist for it
    supabase.from("results").select("race_id").eq("event_type", "race")
  ]);

  const total = allRaces?.length ?? 0;
  const completedIds = new Set((completedResults ?? []).map(r => r.race_id));
  const past = completedIds.size;

  return { total, past };
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
  const { data: users } = await supabase.from("users").select("id,display_name,email");
  const { data: weekends } = await supabase
    .from("weekend_scores")
    .select("user_id,total_points,total_error,exact_matches");
  const byUser = new Map<string, { points: number[]; error: number; exact: number }>();

  for (const w of weekends || []) {
    const cur = byUser.get(w.user_id) || { points: [], error: 0, exact: 0 };
    cur.points.push(w.total_points || 0);
    cur.error += w.total_error || 0;
    cur.exact += w.exact_matches || 0;
    byUser.set(w.user_id, cur);
  }

  return (users || [])
    .map((u) => {
      const agg = byUser.get(u.id) || { points: [], error: 0, exact: 0 };
      return {
        id: u.id,
        name: u.display_name || u.email,
        score: bestNWeekendTotal(agg.points, 20),
        error: agg.error,
        exact: agg.exact,
        top: Math.max(0, ...agg.points)
      };
    })
    .sort((a, b) => b.score - a.score || a.error - b.error || b.exact - a.exact || b.top - a.top);
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

  const { data: myScores } = await supabase
    .from("weekend_scores")
    .select("total_points,exact_matches,race_id,race_weekends(grand_prix,race_start)")
    .eq("user_id", userId)
    .order("race_weekends(race_start)", { ascending: false });

  if (!myScores?.length) return null;

  const points = myScores.map((s) => s.total_points || 0);
  const totalPoints = bestNWeekendTotal(points, 20);
  const bestWeekend = Math.max(0, ...points);
  const exactMatches = myScores.reduce((sum, s) => sum + (s.exact_matches || 0), 0);

  // Only show the last race where the user actually scored points (not 0-point recompute entries)
  const lastScoredRace = myScores.find((s) => (s.total_points || 0) > 0);
  let lastRace: { name: string; points: number } | null = null;
  if (lastScoredRace) {
    const raceWeekend = lastScoredRace.race_weekends as { grand_prix: string } | { grand_prix: string }[] | null;
    const raceName = Array.isArray(raceWeekend)
      ? raceWeekend[0]?.grand_prix
      : raceWeekend?.grand_prix || "";
    lastRace = { name: raceName, points: lastScoredRace.total_points || 0 };
  }

  const lb = await getLeaderboard();
  const rank = lb.findIndex((e) => e.id === userId) + 1;

  return {
    rank: rank || lb.length,
    totalPoints,
    bestWeekend,
    exactMatches,
    lastRace
  };
}
