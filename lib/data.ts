import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { bestNWeekendTotal } from "@/lib/scoring";
import { syncCalendarJolpi } from "@/lib/sync-jolpi";

async function fetchNextRaceFromDb() {
  const supabase = getSupabaseAdmin();
  const lookback = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("race_weekends")
    .select("*")
    .gte("race_start", lookback)
    .order("race_start", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getNextRace() {
  let race = await fetchNextRaceFromDb();

  // If DB has no upcoming races, auto-populate from Jolpi (no manual sync needed)
  if (!race) {
    try {
      await syncCalendarJolpi();
      race = await fetchNextRaceFromDb();
    } catch (err) {
      console.error("Auto calendar sync failed:", err);
    }
  }

  return race;
}

export async function getSeasonProgress() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: all } = await supabase.from("race_weekends").select("race_start,quali_start");
  const total = all?.length || 0;
  // A race is "past" when its quali has started (more reliable than race_start
  // which may be stored as the Friday meeting start on some sync sources).
  const past = all?.filter((r) => (r.quali_start || r.race_start) < now).length || 0;
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
