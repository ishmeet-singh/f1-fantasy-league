import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { filterActiveRaceWeekends } from "@/lib/cancelled-races";

export type RaceWeekendRow = {
  id: string;
  grand_prix: string;
  race_date: string;
  quali_start: string;
  sprint_start: string | null;
  race_start: string;
  has_sprint: boolean;
};

export type DriverRow = { id: string; name: string; team: string };

export type UserRow = { id: string; display_name: string; email: string };

export type WeekendScoreTotalRow = {
  user_id: string;
  race_id: string;
  total_points: number | null;
  total_error: number | null;
  exact_matches: number | null;
};

async function fetchRaceWeekendsUncached(): Promise<RaceWeekendRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("race_weekends")
    .select("id,grand_prix,race_date,quali_start,sprint_start,race_start,has_sprint")
    .not("id", "like", "jolpi-%")
    .order("race_start", { ascending: true });
  return filterActiveRaceWeekends((data ?? []) as RaceWeekendRow[]);
}

async function fetchDriversUncached(): Promise<DriverRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("drivers")
    .select("id,name,team")
    .order("name");
  return data ?? [];
}

export const getCachedRaceWeekends = unstable_cache(
  fetchRaceWeekendsUncached,
  ["race-weekends-v1"],
  { revalidate: 60 }
);

export const getCachedDrivers = unstable_cache(fetchDriversUncached, ["drivers-v1"], {
  revalidate: 60
});

async function fetchWeekendScoresUncached(): Promise<WeekendScoreTotalRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("weekend_scores")
    .select("user_id,race_id,total_points,total_error,exact_matches");
  return data ?? [];
}

/** All weekend_scores rows for leaderboard/history — 60s cache, shared across dashboard and stats. */
export const getCachedWeekendScores = unstable_cache(
  fetchWeekendScoresUncached,
  ["weekend-scores-v1"],
  { revalidate: 60 }
);

/** @alias getCachedWeekendScores */
export const getCachedWeekendScoreTotals = getCachedWeekendScores;

async function fetchUsersUncached(): Promise<UserRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("id,display_name,email");
  return data ?? [];
}

export const getCachedUsers = unstable_cache(fetchUsersUncached, ["users-v1"], {
  revalidate: 60
});

async function fetchRaceCompletionsUncached(): Promise<string[]> {
  const { data } = await getSupabaseAdmin()
    .from("results")
    .select("race_id")
    .eq("event_type", "race");
  return (data ?? []).map((r) => r.race_id);
}

/** Race IDs with a published main-race result — 60s cache, shared with dashboard. */
export const getCachedRaceCompletions = unstable_cache(
  fetchRaceCompletionsUncached,
  ["race-completions-v1"],
  { revalidate: 60 }
);
