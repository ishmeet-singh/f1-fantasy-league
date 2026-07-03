import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCachedDrivers, getCachedRaceWeekends, type RaceWeekendRow } from "@/lib/cached-reference-data";
import { resolveDriverDisplayName } from "@/lib/driver-crossref";

export type PicksPageData = {
  races: RaceWeekendRow[];
  drivers: { id: string; name: string; team: string }[];
  race: RaceWeekendRow;
  pickRows: { driver_id: string; predicted_position: number; event_type: string }[];
  existingResults: { event_type: string; driver_id: string; actual_position: number }[];
  allUsers: { id: string; display_name: string | null; email: string }[];
  allPickRows: {
    user_id: string;
    driver_id: string;
    predicted_position: number;
    event_type: string;
    drivers: { name: string } | { name: string }[] | null;
  }[];
};

const WINDOW_HOURS = 48;

function picksOpenAt(r: RaceWeekendRow, now: Date): boolean {
  const first = Math.min(
    new Date(r.quali_start).getTime(),
    r.has_sprint && r.sprint_start ? new Date(r.sprint_start).getTime() : Infinity
  );
  const openAt = new Date(first - WINDOW_HOURS * 60 * 60 * 1000);
  return now >= openAt;
}

export function selectPicksRace(races: RaceWeekendRow[], selectedRaceId: string | undefined, now = new Date()) {
  const windowOpenAndUpcoming = races.filter(
    (r) => picksOpenAt(r, now) && new Date(r.race_start) > now
  );
  const upcomingRaces = races.filter((r) => new Date(r.race_start) > now);
  const defaultRace = windowOpenAndUpcoming[0] ?? upcomingRaces[0] ?? races[0];
  return races.find((r) => r.id === selectedRaceId) ?? defaultRace;
}

export async function loadPicksPage(
  userId: string,
  selectedRaceId?: string
): Promise<PicksPageData | null> {
  const supabase = getSupabaseAdmin();

  const [races, drivers, usersRes] = await Promise.all([
    getCachedRaceWeekends(),
    getCachedDrivers(),
    supabase.from("users").select("id,display_name,email").order("created_at")
  ]);

  if (!races.length) return null;

  const race = selectPicksRace(races, selectedRaceId);

  const [picksRes, resultsRes] = await Promise.all([
    supabase
      .from("predictions")
      .select("user_id,driver_id,predicted_position,event_type,drivers(name)")
      .eq("race_id", race.id),
    supabase
      .from("results")
      .select("event_type,driver_id,actual_position")
      .eq("race_id", race.id)
  ]);

  const allPickRows = picksRes.data ?? [];
  const pickRows = allPickRows
    .filter((p) => p.user_id === userId)
    .map((p) => ({
      driver_id: p.driver_id,
      predicted_position: p.predicted_position,
      event_type: p.event_type
    }));

  return {
    races,
    drivers,
    race,
    pickRows,
    existingResults: resultsRes.data ?? [],
    allUsers: usersRes.data ?? [],
    allPickRows
  };
}

export function buildLeaguePicksForEvent(
  eventType: "quali" | "sprint" | "race",
  userId: string,
  allUsers: PicksPageData["allUsers"],
  allPickRows: PicksPageData["allPickRows"]
) {
  return allUsers
    .map((u) => {
      const userPicks = allPickRows
        .filter((p) => p.user_id === u.id && p.event_type === eventType)
        .map((p) => {
          const rawName = Array.isArray(p.drivers)
            ? p.drivers[0]?.name
            : (p.drivers as { name: string } | null)?.name ?? null;
          return {
            predictedPos: p.predicted_position,
            driverId: p.driver_id,
            driverName: resolveDriverDisplayName(p.driver_id, rawName)
          };
        });
      return {
        userId: u.id,
        userName: u.display_name || u.email.split("@")[0],
        isMe: u.id === userId,
        picks: userPicks
      };
    })
    .filter((p) => p.picks.length > 0);
}
