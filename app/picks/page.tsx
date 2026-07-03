import { PicksForm } from "@/components/picks-form";
import { PicksRaceSelector } from "@/components/picks-race-selector";
import { LeaguePicks } from "@/components/league-picks";
import { LocalTime } from "@/components/local-time";
import { SESSION_OPTS } from "@/lib/date-formats";
import { getRequestUser } from "@/lib/request-user";
import { loadPicksPage, buildLeaguePicksForEvent } from "@/lib/loaders/picks";
import { syncCalendar } from "@/lib/sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 48;

function picksOpenAt(race: { quali_start: string; sprint_start?: string | null; has_sprint: boolean }): Date {
  const firstSessionTime = Math.min(
    new Date(race.quali_start).getTime(),
    race.has_sprint && race.sprint_start ? new Date(race.sprint_start).getTime() : Infinity
  );
  return new Date(firstSessionTime - WINDOW_HOURS * 60 * 60 * 1000);
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

export default async function PicksPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const user = getRequestUser();
  if (!user) redirect("/");

  let data = await loadPicksPage(user.id, searchParams.race);
  if (!data) {
    try {
      await syncCalendar();
      data = await loadPicksPage(user.id, searchParams.race);
    } catch (err) {
      console.error("Auto calendar sync failed:", err);
    }
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Picks</h1>
        <div className="card text-slate-400">No races scheduled yet.</div>
      </div>
    );
  }

  const { races, drivers, race, pickRows, existingResults, allUsers, allPickRows } = data;
  const now = new Date();

  const eventsWithResults = new Set(existingResults.map((r) => r.event_type));

  function resultsForEvent(eventType: "quali" | "sprint" | "race") {
    return existingResults
      .filter((r) => r.event_type === eventType)
      .map((r) => ({ driverId: r.driver_id, actualPos: r.actual_position }));
  }

  function picksForEvent(eventType: "quali" | "sprint" | "race") {
    return Object.fromEntries(
      pickRows
        .filter((p) => p.event_type === eventType)
        .map((p) => [p.predicted_position, p.driver_id])
    );
  }

  const openAt = picksOpenAt(race);
  const isOpen = now >= openAt;
  const msUntilOpen = openAt.getTime() - now.getTime();

  const sessionWindowOpen = (sessionStart: string) =>
    now >= new Date(new Date(sessionStart).getTime() - WINDOW_HOURS * 60 * 60 * 1000);

  const qualiLocked = new Date(race.quali_start) <= now || eventsWithResults.has("quali");
  const sprintLocked = race.sprint_start
    ? new Date(race.sprint_start) <= now || eventsWithResults.has("sprint")
    : true;
  const raceLocked = new Date(race.race_start) <= now || eventsWithResults.has("race");

  const raceItems = races.map((r, i) => ({
    id: r.id,
    grand_prix: r.grand_prix,
    round: i + 1,
    isWindowOpen: now >= picksOpenAt(r),
    isRaceDone: new Date(r.race_start) <= now
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Picks</h1>

      <PicksRaceSelector races={raceItems} selectedRaceId={race.id} />

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

      {!isOpen ? (
        <div className="card space-y-3">
          <p className="text-slate-400 text-sm">Picks open 48 hours before the first session.</p>
          <div className="text-sm text-slate-500 space-y-2">
            {[
              { label: "Qualifying", iso: race.quali_start },
              ...(race.has_sprint && race.sprint_start ? [{ label: "Sprint", iso: race.sprint_start }] : []),
              { label: "Race", iso: race.race_start }
            ]
              .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())
              .map(({ label, iso }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span><LocalTime iso={iso} opts={SESSION_OPTS} /></span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { eventType: "quali" as const, iso: race.quali_start, size: 3, locked: qualiLocked, show: true },
            { eventType: "sprint" as const, iso: race.sprint_start ?? "", size: 10, locked: sprintLocked, show: race.has_sprint && !!race.sprint_start },
            { eventType: "race" as const, iso: race.race_start, size: 10, locked: raceLocked, show: true }
          ]
            .filter((s) => s.show)
            .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())
            .map(({ eventType, iso, size, locked }) => {
              const windowOpen = sessionWindowOpen(iso);
              const label = eventType === "quali" ? "Qualifying" : eventType === "sprint" ? "Sprint" : "Race";

              if (!windowOpen && !locked) {
                const msLeft = new Date(iso).getTime() - WINDOW_HOURS * 60 * 60 * 1000 - now.getTime();
                return (
                  <div key={eventType} className="card space-y-1">
                    <p className="text-sm font-medium text-slate-300">{label}</p>
                    <p className="text-xs text-slate-500">
                      Picks open in <span className="text-white font-semibold">{formatCountdown(msLeft)}</span>
                      {" · "}<LocalTime iso={iso} opts={SESSION_OPTS} />
                    </p>
                  </div>
                );
              }

              return (
                <div key={eventType}>
                  <PicksForm
                    drivers={drivers}
                    raceId={race.id}
                    eventType={eventType}
                    size={size}
                    locked={locked}
                    deadline={iso}
                    initial={picksForEvent(eventType)}
                  />
                  {locked && (
                    <div className="mt-2">
                      <LeaguePicks
                        players={buildLeaguePicksForEvent(eventType, user.id, allUsers, allPickRows)}
                        results={resultsForEvent(eventType)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
