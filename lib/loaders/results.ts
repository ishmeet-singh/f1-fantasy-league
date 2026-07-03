import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCachedDrivers, getCachedRaceWeekends } from "@/lib/cached-reference-data";
import { resolveDriverDisplayName } from "@/lib/driver-crossref";
import { distinctRaceIdsFromRaceResults } from "@/lib/races-with-results";

type TabId = "quali" | "sprint" | "race";

export type ResultsPageData = {
  races: Awaited<ReturnType<typeof getCachedRaceWeekends>>;
  selectedRace: Awaited<ReturnType<typeof getCachedRaceWeekends>>[number];
  raceIdsWithResults: Set<string>;
  resultsByEvent: Record<
    TabId,
    { driver_id: string; actual_position: number; driver_name: string; driver_team: string }[]
  >;
  myPicks: Record<TabId, Record<string, number>>;
  myScores: Record<TabId, { points: number; exact: number } | null>;
  leaguePlayers: {
    userId: string;
    userName: string;
    picks: { predictedPos: number; driverId: string; driverName: string; eventType?: TabId }[];
    scores: Record<TabId, number | null>;
  }[];
  currentUserId: string | null;
};

export function selectResultsRace(
  races: Awaited<ReturnType<typeof getCachedRaceWeekends>>,
  raceIdsWithResults: Set<string>,
  selectedRaceId?: string
) {
  const racesHavingResults = races.filter((r) => raceIdsWithResults.has(r.id));
  const defaultRace = racesHavingResults[racesHavingResults.length - 1] ?? races[0];
  return races.find((r) => r.id === selectedRaceId) ?? defaultRace;
}

export async function loadResultsPage(
  userId: string | null,
  selectedRaceId?: string
): Promise<ResultsPageData | null> {
  const supabase = getSupabaseAdmin();

  const [races, completedRes] = await Promise.all([
    getCachedRaceWeekends(),
    supabase.from("results").select("race_id").eq("event_type", "race")
  ]);

  if (!races.length) return null;

  const raceIdsWithResults = distinctRaceIdsFromRaceResults(completedRes.data ?? []);
  const selectedRace = selectResultsRace(races, raceIdsWithResults, selectedRaceId);

  const [resultRows, allPickRows, allUsers, allScoreRows, drivers] = await Promise.all([
    supabase
      .from("results")
      .select("event_type,actual_position,driver_id")
      .eq("race_id", selectedRace.id)
      .order("actual_position"),
    supabase
      .from("predictions")
      .select("user_id,driver_id,predicted_position,event_type")
      .eq("race_id", selectedRace.id),
    supabase.from("users").select("id,display_name,email").order("created_at"),
    supabase
      .from("scores")
      .select("user_id,event_type,points,exact_matches")
      .eq("race_id", selectedRace.id),
    getCachedDrivers()
  ]);

  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const myPickRows = userId ? (allPickRows.data ?? []).filter((p) => p.user_id === userId) : [];
  const myPicks: ResultsPageData["myPicks"] = { quali: {}, sprint: {}, race: {} };
  for (const p of myPickRows) {
    const et = p.event_type as TabId;
    if (et in myPicks) myPicks[et][p.driver_id] = p.predicted_position;
  }

  const myScoreRows = userId ? (allScoreRows.data ?? []).filter((s) => s.user_id === userId) : [];
  const myScores: ResultsPageData["myScores"] = { quali: null, sprint: null, race: null };
  for (const s of myScoreRows) {
    const et = s.event_type as TabId;
    if (et in myScores) myScores[et] = { points: s.points, exact: s.exact_matches ?? 0 };
  }

  const resultsByEvent: ResultsPageData["resultsByEvent"] = { quali: [], sprint: [], race: [] };
  for (const r of resultRows.data ?? []) {
    const et = r.event_type as TabId;
    if (!(et in resultsByEvent)) continue;
    const driver = driverMap.get(String(r.driver_id));
    resultsByEvent[et].push({
      driver_id: String(r.driver_id),
      actual_position: r.actual_position,
      driver_name: resolveDriverDisplayName(String(r.driver_id), driver?.name),
      driver_team: driver?.team || ""
    });
  }

  const leaguePlayers = (allUsers.data ?? [])
    .map((u) => {
      const userPicks = (allPickRows.data ?? []).filter((p) => p.user_id === u.id);
      const userScores = (allScoreRows.data ?? []).filter((s) => s.user_id === u.id);
      const scoresByEt: Record<TabId, number | null> = { quali: null, sprint: null, race: null };
      for (const s of userScores) {
        if (s.event_type in scoresByEt) scoresByEt[s.event_type as TabId] = s.points;
      }
      return {
        userId: u.id,
        userName: u.display_name || u.email.split("@")[0],
        picks: userPicks.map((p) => {
          const driver = driverMap.get(p.driver_id);
          return {
            predictedPos: p.predicted_position,
            driverId: p.driver_id,
            driverName: resolveDriverDisplayName(p.driver_id, driver?.name),
            eventType: p.event_type as TabId
          };
        }),
        scores: scoresByEt
      };
    })
    .filter((p) => p.picks.length > 0 || Object.values(p.scores).some((s) => s !== null));

  return {
    races,
    selectedRace,
    raceIdsWithResults,
    resultsByEvent,
    myPicks,
    myScores,
    leaguePlayers,
    currentUserId: userId
  };
}
