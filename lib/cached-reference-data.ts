import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

export type WeekendScoreTotalRow = {
  user_id: string;
  total_points: number | null;
  total_error: number | null;
  exact_matches: number | null;
};

async function fetchRaceWeekendsUncached(): Promise<RaceWeekendRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("race_weekends")
    .select("id,grand_prix,race_date,quali_start,sprint_start,race_start,has_sprint")
    .order("race_start", { ascending: true });
  return (data ?? []) as RaceWeekendRow[];
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

async function fetchWeekendScoreTotalsUncached(): Promise<WeekendScoreTotalRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("weekend_scores")
    .select("user_id,total_points,total_error,exact_matches");
  return data ?? [];
}

/** Minimal weekend_scores columns for rank — 60s cache, shared across stats requests. */
export const getCachedWeekendScoreTotals = unstable_cache(
  fetchWeekendScoreTotalsUncached,
  ["weekend-score-totals-v1"],
  { revalidate: 60 }
);
