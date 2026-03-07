import { PicksForm } from "@/components/picks-form";
import { PicksRaceSelector } from "@/components/picks-race-selector";
import { LeaguePicks } from "@/components/league-picks";
import { LocalTime } from "@/components/local-time";
import { SESSION_OPTS } from "@/lib/date-formats";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncCalendar } from "@/lib/sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 48;

function picksOpenAt(qualiStart: string): Date {
  return new Date(new Date(qualiStart).getTime() - WINDOW_HOURS * 60 * 60 * 1000);
}

function formatCountdown(ms: number): string {
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Formatting moved client-side via LocalTime to respect browser timezone

export default async function PicksPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const admin = getSupabaseAdmin();
  const now = new Date();

  // Fetch full season — show all races, past and upcoming
  let { data: allRaces } = await admin
    .from("race_weekends")
    .select("*")
    .order("race_start", { ascending: true });

  // Auto-populate from Jolpi if DB is empty
  if (!allRaces?.length) {
    try {
      await syncCalendar();
      const refetch = await admin
        .from("race_weekends")
        .select("*")
        .order("race_start", { ascending: true });
      allRaces = refetch.data;
    } catch (err) {
      console.error("Auto calendar sync failed:", err);
    }
  }

  const races = allRaces ?? [];

  const { data: drivers } = await admin.from("drivers").select("id,name,team").order("name");

  if (!races.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Picks</h1>
        <div className="card text-slate-400">No races scheduled yet.</div>
      </div>
    );
  }

  // Default: soonest upcoming race whose picks window is open (race not finished yet)
  // Races are ordered ascending by race_start, so [0] is always the soonest
  const windowOpenAndUpcoming = races.filter(
    (r) => now >= picksOpenAt(r.quali_start) && new Date(r.race_start) > now
  );
  const upcomingRaces = races.filter((r) => new Date(r.race_start) > now);
  const defaultRace =
    windowOpenAndUpcoming[0] ?? upcomingRaces[0] ?? races[0];

  const selectedRaceId = searchParams.race || defaultRace.id;
  const race = races.find((r) => r.id === selectedRaceId) ?? defaultRace;

  // Fetch this user's picks and any existing results for the selected race in parallel
  const [{ data: pickRows }, { data: existingResults }, { data: allUsers }, { data: allPickRows }] = await Promise.all([
    admin
      .from("predictions")
      .select("driver_id,predicted_position,event_type")
      .eq("race_id", race.id)
      .eq("user_id", user.id),
    admin
      .from("results")
      .select("event_type,driver_id,actual_position")
      .eq("race_id", race.id),
    admin
      .from("users")
      .select("id,display_name,email")
      .order("created_at"),
    admin
      .from("predictions")
      .select("user_id,driver_id,predicted_position,event_type,drivers(name)")
      .eq("race_id", race.id)
  ]);

  // Which events already have results in the DB (simulated or real)
  const eventsWithResults = new Set((existingResults ?? []).map((r) => r.event_type));

  // Build league picks per event for locked sessions
  type LeaguePlayer = { userId: string; userName: string; isMe: boolean; picks: { predictedPos: number; driverId: string; driverName: string }[] };
  function leaguePicksForEvent(eventType: "quali" | "sprint" | "race"): LeaguePlayer[] {
    return (allUsers ?? []).map((u) => {
      const userPicks = (allPickRows ?? [])
        .filter((p) => p.user_id === u.id && p.event_type === eventType)
        .map((p) => {
          const dn = Array.isArray(p.drivers)
            ? p.drivers[0]?.name
            : (p.drivers as { name: string } | null)?.name ?? p.driver_id;
          return { predictedPos: p.predicted_position, driverId: p.driver_id, driverName: dn ?? p.driver_id };
        });
      return {
        userId: u.id,
        userName: u.display_name || u.email.split("@")[0],
        isMe: u.id === user!.id,
        picks: userPicks
      };
    }).filter((p) => p.picks.length > 0);
  }

  // Results lookup for league picks component
  function resultsForEvent(eventType: "quali" | "sprint" | "race") {
    return (existingResults ?? [])
      .filter((r) => r.event_type === eventType)
      .map((r) => ({ driverId: r.driver_id, actualPos: r.actual_position }));
  }

  function picksForEvent(eventType: "quali" | "sprint" | "race") {
    return Object.fromEntries(
      (pickRows || [])
        .filter((p) => p.event_type === eventType)
        .map((p) => [p.predicted_position, p.driver_id])
    );
  }

  const openAt = picksOpenAt(race.quali_start);
  const isOpen = now >= openAt;
  const msUntilOpen = openAt.getTime() - now.getTime();

  // Lock if session time passed OR results already exist for that event
  const qualiLocked = new Date(race.quali_start) <= now || eventsWithResults.has("quali");
  const sprintLocked = race.sprint_start ? (new Date(race.sprint_start) <= now || eventsWithResults.has("sprint")) : true;
  const raceLocked = new Date(race.race_start) <= now || eventsWithResults.has("race");

  const raceItems = races.map((r, i) => ({
    id: r.id,
    grand_prix: r.grand_prix,
    round: i + 1,
    isWindowOpen: now >= picksOpenAt(r.quali_start),
    isRaceDone: new Date(r.race_start) <= now
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Picks</h1>

      {/* Race selector pills */}
      <PicksRaceSelector
        races={raceItems}
        selectedRaceId={race.id}
      />

      {/* Selected race header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{race.grand_prix}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Race · <LocalTime iso={race.race_start} opts={SESSION_OPTS} />
          </p>
        </div>
        {!isOpen && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Picks open in</p>
            <p className="text-lg font-bold text-white">{formatCountdown(msUntilOpen)}</p>
          </div>
        )}
      </div>

      {/* Window not open yet */}
      {!isOpen ? (
        <div className="card space-y-3">
          <p className="text-slate-400 text-sm">Picks open 48 hours before qualifying.</p>
          <div className="text-sm text-slate-500 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Qualifying</span>
              <span><LocalTime iso={race.quali_start} opts={SESSION_OPTS} /></span>
            </div>
            {race.has_sprint && race.sprint_start && (
              <div className="flex justify-between">
                <span className="text-slate-400">Sprint</span>
                <span><LocalTime iso={race.sprint_start} opts={SESSION_OPTS} /></span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Race</span>
              <span><LocalTime iso={race.race_start} opts={SESSION_OPTS} /></span>
            </div>
          </div>
        </div>
      ) : (
        /* Picks forms + league picks for locked sessions */
        <div className="space-y-4">
          <PicksForm
            drivers={drivers || []}
            raceId={race.id}
            eventType="quali"
            size={3}
            locked={qualiLocked}
            deadline={race.quali_start}
            initial={picksForEvent("quali")}
          />
          {qualiLocked && (
            <LeaguePicks
              players={leaguePicksForEvent("quali")}
              results={resultsForEvent("quali")}
            />
          )}

          {race.has_sprint && race.sprint_start && (
            <>
              <PicksForm
                drivers={drivers || []}
                raceId={race.id}
                eventType="sprint"
                size={10}
                locked={sprintLocked}
                deadline={race.sprint_start}
                initial={picksForEvent("sprint")}
              />
              {sprintLocked && (
                <LeaguePicks
                  players={leaguePicksForEvent("sprint")}
                  results={resultsForEvent("sprint")}
                />
              )}
            </>
          )}

          <PicksForm
            drivers={drivers || []}
            raceId={race.id}
            eventType="race"
            size={10}
            locked={raceLocked}
            deadline={race.race_start}
            initial={picksForEvent("race")}
          />
          {raceLocked && (
            <LeaguePicks
              players={leaguePicksForEvent("race")}
              results={resultsForEvent("race")}
            />
          )}
        </div>
      )}
    </div>
  );
}
