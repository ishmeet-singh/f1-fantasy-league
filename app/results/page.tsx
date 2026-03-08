import { RaceWeekendResults } from "@/components/race-weekend-results";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type TabId = "quali" | "sprint" | "race";

export default async function ResultsPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = getSupabaseAdmin();

  // Full season schedule ordered chronologically
  const { data: races } = await admin
    .from("race_weekends")
    .select("id,grand_prix,race_date,quali_start,sprint_start,race_start,has_sprint")
    .order("race_start", { ascending: true });

  if (!races?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Results</h1>
        <div className="card text-center py-10 space-y-2">
          <p className="text-slate-400">No races loaded yet.</p>
          <p className="text-slate-600 text-sm">An admin needs to run &quot;Sync Season Calendar&quot; first.</p>
        </div>
      </div>
    );
  }

  // Find which races have results
  const { data: racesWithResults } = await admin
    .from("results").select("race_id").in("race_id", races.map(r => r.id));
  const raceIdsWithResults = new Set((racesWithResults ?? []).map(r => r.race_id));

  // Default: most recently completed race
  const racesHavingResults = races.filter(r => raceIdsWithResults.has(r.id));
  const defaultRace = racesHavingResults.length > 0
    ? racesHavingResults[racesHavingResults.length - 1]
    : races[0];

  const selectedRaceId = searchParams.race || defaultRace.id;
  const selectedRace = races.find(r => r.id === selectedRaceId) ?? defaultRace;

  // Fetch all data for selected race in parallel
  const [
    { data: resultRows },
    { data: allPickRows },
    { data: allUsers },
    { data: allScoreRows },
    { data: allDrivers }
  ] = await Promise.all([
    admin.from("results")
      .select("event_type,actual_position,driver_id")
      .eq("race_id", selectedRace.id)
      .order("actual_position"),
    admin.from("predictions")
      .select("user_id,driver_id,predicted_position,event_type")
      .eq("race_id", selectedRace.id),
    admin.from("users").select("id,display_name,email").order("created_at"),
    admin.from("scores")
      .select("user_id,event_type,points,exact_matches")
      .eq("race_id", selectedRace.id),
    // Fetch ALL drivers separately — avoids broken FK joins when names are missing
    admin.from("drivers").select("id,name,team"),
  ]);

  // Build guaranteed driver lookup from full drivers table
  const driverMap = new Map((allDrivers ?? []).map(d => [d.id, d]));

  // My picks: eventType -> driverId -> predictedPosition
  const myPickRows = user ? (allPickRows ?? []).filter(p => p.user_id === user.id) : [];
  const myPicks: Record<TabId, Record<string, number>> = { quali: {}, sprint: {}, race: {} };
  for (const p of myPickRows) {
    const et = p.event_type as TabId;
    if (myPicks[et]) myPicks[et][p.driver_id] = p.predicted_position;
  }

  // My scores: eventType -> { points, exact }
  const myScoreRows = user ? (allScoreRows ?? []).filter(s => s.user_id === user.id) : [];
  const myScores: Record<TabId, { points: number; exact: number } | null> = { quali: null, sprint: null, race: null };
  for (const s of myScoreRows) {
    const et = s.event_type as TabId;
    if (et in myScores) myScores[et] = { points: s.points, exact: s.exact_matches ?? 0 };
  }

  // Results: eventType -> rows — use driverMap for reliable names
  const resultsByEvent: Record<TabId, { driver_id: string; actual_position: number; driver_name: string; driver_team: string }[]> = {
    quali: [], sprint: [], race: []
  };
  for (const r of resultRows ?? []) {
    const et = r.event_type as TabId;
    if (!(et in resultsByEvent)) continue;
    const driver = driverMap.get(String(r.driver_id));
    resultsByEvent[et].push({
      driver_id: String(r.driver_id),
      actual_position: r.actual_position,
      driver_name: driver?.name || `#${r.driver_id}`,
      driver_team: driver?.team || ""
    });
  }

  // League picks: userId -> eventType -> picks[]
  type LeaguePick = { predictedPos: number; driverId: string; driverName: string };
  type LeaguePlayer = { userId: string; userName: string; picks: LeaguePick[]; scores: Record<TabId, number | null> };

  const leaguePlayers: LeaguePlayer[] = (allUsers ?? []).map(u => {
    const userPicks = (allPickRows ?? []).filter(p => p.user_id === u.id);
    const userScores = (allScoreRows ?? []).filter(s => s.user_id === u.id);
    const scoresByEt: Record<TabId, number | null> = { quali: null, sprint: null, race: null };
    for (const s of userScores) {
      if (s.event_type in scoresByEt) scoresByEt[s.event_type as TabId] = s.points;
    }
    return {
      userId: u.id,
      userName: u.display_name || u.email.split("@")[0],
      picks: userPicks.map(p => {
          const driver = driverMap.get(p.driver_id);
        const driverName = driver?.name || `#${p.driver_id}`;
        return { predictedPos: p.predicted_position, driverId: p.driver_id, driverName, eventType: p.event_type as TabId };
      }),
      scores: scoresByEt
    };
  }).filter(p => p.picks.length > 0 || Object.values(p.scores).some(s => s !== null));

  const now = new Date().toISOString();

  return (
    <RaceWeekendResults
      races={races.map((r, i) => ({
        id: r.id,
        grand_prix: r.grand_prix,
        round: i + 1,
        isPast: r.race_start <= now,
        hasResults: raceIdsWithResults.has(r.id)
      }))}
      selectedRace={selectedRace}
      resultsByEvent={resultsByEvent}
      myPicks={myPicks}
      myScores={myScores}
      leaguePlayers={leaguePlayers}
      currentUserId={user?.id ?? null}
    />
  );
}
