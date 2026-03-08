import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { bestNWeekendTotal } from "@/lib/scoring";
import { syncCalendar } from "@/lib/sync";

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
