import { ResultsTabs } from "@/components/results-tabs";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type TabId = "quali" | "sprint" | "race";

type DriverRef = { name: string; team: string } | { name: string; team: string }[] | null;

function resolveDriver(ref: DriverRef): { name: string; team: string } {
  if (!ref) return { name: "Unknown", team: "" };
  const d = Array.isArray(ref) ? ref[0] : ref;
  return { name: d?.name ?? "Unknown", team: d?.team ?? "" };
}

export default async function ResultsPage({
  searchParams
}: {
  searchParams: { race?: string; tab?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

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
          <p className="text-slate-600 text-sm">
            An admin needs to run &quot;Sync Season Calendar&quot; first.
          </p>
        </div>
      </div>
    );
  }

  // Find which races already have results in the DB
  const { data: racesWithResults } = await admin
    .from("results")
    .select("race_id")
    .in("race_id", races.map((r) => r.id));

  const raceIdsWithResults = new Set((racesWithResults || []).map((r) => r.race_id));

  // Default: most recent race that has results. If none, fall back to first race.
  const racesHavingResults = races.filter((r) => raceIdsWithResults.has(r.id));
  const defaultRace =
    racesHavingResults.length > 0
      ? racesHavingResults[racesHavingResults.length - 1]
      : races[0];

  const selectedRaceId = searchParams.race || defaultRace.id;
  const selectedRace = races.find((r) => r.id === selectedRaceId) || defaultRace;
  const activeTab = (searchParams.tab as TabId) || "race";

  // Results for the selected race (join driver info)
  const { data: resultRows } = await admin
    .from("results")
    .select("event_type,actual_position,driver_id,drivers(name,team)")
    .eq("race_id", selectedRace.id)
    .order("actual_position");

  // All users for league view
  const { data: allUsers } = await admin
    .from("users")
    .select("id,display_name,email")
    .order("created_at");

  // All picks for this race (all users) + driver names
  const { data: allPickRows } = await admin
    .from("predictions")
    .select("user_id,driver_id,predicted_position,event_type,drivers(name)")
    .eq("race_id", selectedRace.id);

  // My picks
  const myPickRows = user
    ? (allPickRows ?? []).filter((p) => p.user_id === user.id)
    : [];

  // User's score breakdown for this race
  const { data: myScoreRows } = user
    ? await admin
        .from("scores")
        .select("event_type,points,exact_matches,total_error")
        .eq("race_id", selectedRace.id)
        .eq("user_id", user.id)
    : { data: [] };

  // picks: eventType -> driverId -> predictedPosition
  const picksByEventAndDriver: Record<TabId, Record<string, number>> = {
    quali: {},
    sprint: {},
    race: {}
  };
  for (const p of myPickRows || []) {
    const et = p.event_type as TabId;
    if (picksByEventAndDriver[et]) {
      picksByEventAndDriver[et][p.driver_id] = p.predicted_position;
    }
  }

  // scores: eventType -> { points, exact, error }
  type ScoreSummary = { points: number; exact: number; error: number };
  const scoresByEvent: Record<TabId, ScoreSummary | null> = {
    quali: null,
    sprint: null,
    race: null
  };
  for (const s of myScoreRows || []) {
    const et = s.event_type as TabId;
    if (et in scoresByEvent) {
      scoresByEvent[et] = {
        points: s.points,
        exact: s.exact_matches ?? 0,
        error: s.total_error ?? 0
      };
    }
  }

  // results: eventType -> sorted rows
  const resultsByEvent: Record<
    TabId,
    { driver_id: string; actual_position: number; driver_name: string; driver_team: string }[]
  > = { quali: [], sprint: [], race: [] };

  for (const r of resultRows || []) {
    const et = r.event_type as TabId;
    if (!(et in resultsByEvent)) continue;
    const { name, team } = resolveDriver(r.drivers as DriverRef);
    resultsByEvent[et].push({
      driver_id: String(r.driver_id),
      actual_position: r.actual_position,
      driver_name: name,
      driver_team: team
    });
  }

  const now = new Date().toISOString();

  // League picks: eventType -> array of { userId, userName, picks: {pos -> {driverId, driverName}} }
  type LeaguePick = { predictedPos: number; driverId: string; driverName: string };
  type LeaguePlayer = { userId: string; userName: string; picks: LeaguePick[] };
  const leagueByEvent: Record<TabId, LeaguePlayer[]> = { quali: [], sprint: [], race: [] };

  for (const u of allUsers ?? []) {
    const userPicks = (allPickRows ?? []).filter((p) => p.user_id === u.id);
    for (const et of ["quali", "sprint", "race"] as TabId[]) {
      const eventPicks = userPicks
        .filter((p) => p.event_type === et)
        .map((p) => {
          const dn = Array.isArray(p.drivers)
            ? p.drivers[0]?.name
            : (p.drivers as { name: string } | null)?.name ?? p.driver_id;
          return { predictedPos: p.predicted_position, driverId: p.driver_id, driverName: dn ?? p.driver_id };
        })
        .sort((a, b) => a.predictedPos - b.predictedPos);
      if (eventPicks.length > 0) {
        leagueByEvent[et].push({
          userId: u.id,
          userName: u.display_name || u.email.split("@")[0],
          picks: eventPicks
        });
      }
    }
  }

  return (
    <ResultsTabs
      races={races.map((r, i) => ({
        id: r.id,
        grand_prix: r.grand_prix,
        round: i + 1,
        isPast: r.race_start <= now,
        hasResults: raceIdsWithResults.has(r.id)
      }))}
      selectedRaceId={selectedRace.id}
      selectedRaceName={selectedRace.grand_prix}
      selectedRaceDate={selectedRace.race_start}
      sessionTimes={{
        quali: selectedRace.quali_start,
        sprint: selectedRace.sprint_start ?? null,
        race: selectedRace.race_start
      }}
      hasSprint={Boolean(selectedRace.has_sprint)}
      activeTab={activeTab}
      resultsByEvent={resultsByEvent}
      picksByEventAndDriver={picksByEventAndDriver}
      scoresByEvent={scoresByEvent}
      leagueByEvent={leagueByEvent}
      currentUserId={user?.id ?? null}
      hasUser={Boolean(user)}
    />
  );
}
