import Link from "next/link";
import { Suspense } from "react";
import { getRequestUser } from "@/lib/request-user";
import { loadDashboardPage } from "@/lib/loaders/dashboard";
import { formatSeasonStandingsSubtitle } from "@/lib/season-standings";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { LeaderboardFull } from "@/components/leaderboard-full";
import { FantasyChart } from "@/components/fantasy-chart";
import { DashboardF1Standings, F1StandingsSkeleton } from "@/components/dashboard-f1-standings";
import { AppBrand } from "@/components/f1-logo";
import { F1 } from "@/lib/f1-theme";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = getRequestUser();
  const {
    leaderboard,
    nextRace,
    season,
    lastRace,
    history,
    myNextPicks
  } = await loadDashboardPage(user?.id);

  const totalPicksSubmitted = myNextPicks.length;
  const WINDOW_HOURS = 48;
  const picksWindowOpen = nextRace
    ? (() => {
        const firstSessionTime = Math.min(
          new Date(nextRace.quali_start).getTime(),
          nextRace.has_sprint && nextRace.sprint_start
            ? new Date(nextRace.sprint_start).getTime()
            : Infinity
        );
        return new Date() >= new Date(firstSessionTime - WINDOW_HOURS * 60 * 60 * 1000);
      })()
    : false;

  const upcomingSession = nextRace
    ? (() => {
        const now = new Date();
        const sessions = [
          { label: "Qualifying", iso: nextRace.quali_start },
          ...(nextRace.has_sprint && nextRace.sprint_start
            ? [{ label: "Sprint", iso: nextRace.sprint_start }]
            : []),
          { label: "Race", iso: nextRace.race_start }
        ].sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
        return sessions.find((s) => new Date(s.iso) > now) ?? sessions[sessions.length - 1];
      })()
    : null;

  const sessionSchedule = nextRace
    ? [
        { label: "Quali", iso: nextRace.quali_start },
        ...(nextRace.has_sprint && nextRace.sprint_start
          ? [{ label: "Sprint", iso: nextRace.sprint_start }]
          : []),
        { label: "Race", iso: nextRace.race_start }
      ].sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())
    : [];

  return (
    <>
      {/* Header card */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <AppBrand theme="dark" logoHeight={32} />
        <h1 className="mt-3 text-xl font-bold tracking-tight">Dashboard</h1>
        {season.total > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round((season.past / season.total) * 100)}%`,
                  background: F1.red
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-white/70">
              {season.past}/{season.total}
            </span>
          </div>
        )}
      </div>

      {lastRace && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm"
          style={{ boxShadow: F1.cardShadow }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Last race
            </span>
            <span className="truncate font-semibold" style={{ color: F1.carbon }}>
              {lastRace.grand_prix}
            </span>
            {lastRace.userScore !== null && (
              <>
                <span style={{ color: F1.gridLine }}>·</span>
                <span className="font-bold" style={{ color: F1.red }}>
                  {lastRace.userScore} pts
                </span>
              </>
            )}
          </div>
          <Link
            href={`/results?race=${lastRace.id}`}
            className="shrink-0 text-xs font-semibold hover:underline"
            style={{ color: F1.carbonMid }}
          >
            Full results →
          </Link>
        </div>
      )}

      {/* Leaderboard */}
      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <div className="mb-4 flex items-start gap-2">
          <div className="mt-1 h-4 w-1 shrink-0 rounded-full" style={{ background: F1.red }} />
          <div className="min-w-0">
            <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
              Leaderboard
            </h2>
            {season.past > 0 && (
              <p className="mt-0.5 text-xs" style={{ color: F1.carbonLight }}>
                {formatSeasonStandingsSubtitle(season.past)}
              </p>
            )}
          </div>
        </div>
        <LeaderboardFull
          leaderboard={leaderboard}
          history={history}
          currentUserId={user?.id ?? null}
        />
      </section>

      {/* Chart */}
      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
          Progression
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: F1.carbonLight }}>
          Counting standings after each race (same best-N drop rules as leaderboard)
        </p>
        <div className="mt-3">
          <FantasyChart history={history} currentUserId={user?.id ?? null} />
        </div>
      </section>

      {/* Next race */}
      <section className="overflow-hidden rounded-2xl" style={{ boxShadow: F1.cardShadow }}>
        {nextRace ? (
          <>
            <div className="px-4 py-2.5" style={{ background: F1.red }}>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white">Next race</p>
            </div>
            <div className="bg-white px-4 py-4">
              <p className="text-lg font-bold" style={{ color: F1.carbon }}>
                {nextRace.grand_prix}
              </p>
              {upcomingSession && (
                <div className="mt-3">
                  <Countdown
                    target={upcomingSession.iso}
                    label={`${upcomingSession.label} in`}
                    variant="chicane"
                  />
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {sessionSchedule.map(({ label, iso }) => (
                  <span
                    key={label}
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: F1.offWhite, color: F1.carbon }}
                  >
                    {label}{" "}
                    <LocalTime iso={iso} opts={{ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }} />
                  </span>
                ))}
              </div>

              {picksWindowOpen && (
                <p
                  className="mt-4 text-sm font-semibold"
                  style={{ color: totalPicksSubmitted > 0 ? F1.carbonMid : F1.red }}
                >
                  {totalPicksSubmitted > 0 ? "✓ Picks locked in" : "⚠ No picks yet — window open"}
                </p>
              )}

              <Link
                href={`/picks?race=${nextRace.id}`}
                className="mt-4 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: F1.red }}
              >
                {totalPicksSubmitted > 0 ? "Edit picks →" : "Make picks →"}
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: F1.red }}>
              Next race
            </p>
            <p className="mt-2 text-sm" style={{ color: F1.carbonLight }}>
              Season complete
            </p>
          </div>
        )}
      </section>

      <Suspense fallback={<F1StandingsSkeleton />}>
        <DashboardF1Standings />
      </Suspense>
    </>
  );
}
