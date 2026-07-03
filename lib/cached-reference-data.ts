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
