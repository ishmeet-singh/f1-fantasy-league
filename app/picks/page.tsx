import { Suspense } from "react";
import { PicksForm } from "@/components/picks-form";
import { PicksRaceSelector } from "@/components/picks-race-selector";
import { LeaguePicks } from "@/components/league-picks";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { RacePageSkeleton } from "@/components/race-page-skeleton";
import { SESSION_OPTS } from "@/lib/date-formats";
import { getRequestUser } from "@/lib/request-user";
import { loadPicksPage, buildLeaguePicksForEvent } from "@/lib/loaders/picks";
import { syncCalendar } from "@/lib/sync";
import { F1 } from "@/lib/f1-theme";
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

type EventType = "quali" | "sprint" | "race";

function pickCount(rows: { event_type: string }[], eventType: EventType, required: number) {
  return rows.filter((p) => p.event_type === eventType).length >= required;
}

export default function PicksPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const user = getRequestUser();
  if (!user) redirect("/");

  const raceKey = searchParams.race ?? "";
  return (
    <Suspense key={raceKey} fallback={<RacePageSkeleton variant="picks" />}>
      <PicksPageContent userId={user.id} raceId={searchParams.race} />
    </Suspense>
  );
}

async function PicksPageContent({ userId, raceId }: { userId: string; raceId?: string }) {
  let data = await loadPicksPage(userId, raceId);
  if (!data) {
    try {
      await syncCalendar();
      data = await loadPicksPage(userId, raceId);
    } catch (err) {
      console.error("Auto calendar sync failed:", err);
    }
  }

  if (!data) {
    return (
      <section className="rounded-2xl bg-white p-6 text-center" style={{ boxShadow: F1.cardShadow, color: F1.carbonLight }}>
        No races scheduled yet.
      </section>
    );
  }

  const { races, drivers, race, pickRows, existingResults, allUsers, allPickRows } = data;
  const now = new Date();

  const eventsWithResults = new Set(existingResults.map((r) => r.event_type));

  function resultsForEvent(eventType: EventType) {
    return existingResults
      .filter((r) => r.event_type === eventType)
      .map((r) => ({ driverId: r.driver_id, actualPos: r.actual_position }));
  }

  function picksForEvent(eventType: EventType) {
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

  const sessions = [
    { eventType: "quali" as const, label: "Quali", iso: race.quali_start, size: 3, locked: qualiLocked, show: true },
    {
      eventType: "sprint" as const,
      label: "Sprint",
      iso: race.sprint_start ?? "",
      size: 10,
      locked: sprintLocked,
      show: race.has_sprint && !!race.sprint_start
    },
    { eventType: "race" as const, label: "Race", iso: race.race_start, size: 10, locked: raceLocked, show: true }
  ]
    .filter((s) => s.show)
    .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());

  const upcomingSession = sessions.find((s) => new Date(s.iso) > now) ?? sessions[sessions.length - 1];

  const statusParts = sessions.map((s) => {
    const saved = pickCount(pickRows, s.eventType, s.eventType === "quali" ? 3 : 10);
    if (s.locked) return saved ? `${s.label} ✓` : `${s.label} missed`;
    if (!sessionWindowOpen(s.iso) && !s.locked) return `${s.label} soon`;
    return saved ? `${s.label} ✓` : `${s.label} open`;
  });

  const allSaved = sessions.every((s) => {
    const required = s.eventType === "quali" ? 3 : 10;
    return s.locked ? pickCount(pickRows, s.eventType, required) : true;
  });
  const anyOpen = sessions.some(
    (s) => !s.locked && sessionWindowOpen(s.iso) && !pickCount(pickRows, s.eventType, s.eventType === "quali" ? 3 : 10)
  );

  const raceItems = races.map((r, i) => ({
    id: r.id,
    grand_prix: r.grand_prix,
    round: i + 1,
    isWindowOpen: now >= picksOpenAt(r),
    isRaceDone: new Date(r.race_start) <= now
  }));

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
          {race.grand_prix}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Your picks</h1>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {!isOpen ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-white/60">Picks open in</p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight" style={{ color: F1.red }}>
                  {formatCountdown(msUntilOpen)}
                </p>
              </>
            ) : upcomingSession && !upcomingSession.locked ? (
              <Countdown
                target={upcomingSession.iso}
                label={`${upcomingSession.label === "Quali" ? "Qualifying" : upcomingSession.label} locks in`}
                variant="banner"
              />
            ) : (
              <p className="text-sm text-white/70">All sessions locked for this weekend</p>
            )}
          </div>
          <div className="sm:text-right">
            <span
              className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={{
                background: !isOpen ? "rgba(255,255,255,0.1)" : anyOpen ? F1.red : allSaved ? "#166534" : F1.red,
                color: F1.white
              }}
            >
              {!isOpen ? "Not open yet" : anyOpen ? "Action needed" : allSaved ? "All submitted" : "Partially saved"}
            </span>
            <p className="mt-2 text-xs text-white/50">{statusParts.join(" · ")}</p>
          </div>
        </div>
      </div>

      {/* Race selector */}
      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
          Select race
        </p>
        <PicksRaceSelector races={raceItems} selectedRaceId={race.id} />
      </section>

      {!isOpen ? (
        <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
          <p className="text-sm" style={{ color: F1.carbonLight }}>
            Picks open 48 hours before the first session.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {sessions.map(({ label, iso }) => (
              <div key={label} className="flex justify-between gap-2">
                <span style={{ color: F1.carbonMid }}>{label === "Quali" ? "Qualifying" : label}</span>
                <span style={{ color: F1.carbon }}>
                  <LocalTime iso={iso} opts={SESSION_OPTS} />
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {sessions.map(({ eventType, iso, size, locked }) => {
            const windowOpen = sessionWindowOpen(iso);
            const label = eventType === "quali" ? "Qualifying" : eventType === "sprint" ? "Sprint" : "Race";

            if (!windowOpen && !locked) {
              const msLeft = new Date(iso).getTime() - WINDOW_HOURS * 60 * 60 * 1000 - now.getTime();
              return (
                <section
                  key={eventType}
                  className="rounded-2xl bg-white p-4"
                  style={{ boxShadow: F1.cardShadow }}
                >
                  <h3 className="font-bold" style={{ color: F1.carbon }}>
                    {label}
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: F1.carbonLight }}>
                    Picks open in{" "}
                    <span className="font-semibold" style={{ color: F1.carbon }}>
                      {formatCountdown(msLeft)}
                    </span>
                    {" · "}
                    <LocalTime iso={iso} opts={SESSION_OPTS} />
                  </p>
                </section>
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
                      variant="chicane"
                      players={buildLeaguePicksForEvent(eventType, userId, allUsers, allPickRows)}
                      results={resultsForEvent(eventType)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
