import Link from "next/link";
import {
  getLeaderboard, getNextRace, getSeasonProgress,
  getLastCompletedRace, getPointsHistory, getF1Championship
} from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { SESSION_OPTS } from "@/lib/date-formats";
import { LeaderboardFull } from "@/components/leaderboard-full";
import { FantasyChart } from "@/components/fantasy-chart";
import { F1Standings } from "@/components/f1-standings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = getSupabaseAdmin();

  const [leaderboard, nextRace, season, lastRace, history, f1Standings] = await Promise.all([
    getLeaderboard(),
    getNextRace(),
    getSeasonProgress(),
    user ? getLastCompletedRace(user.id) : getLastCompletedRace(),
    getPointsHistory(),
    getF1Championship(),
  ]);

  // My picks for next race (for the picks reminder)
  const myNextPicks = user && nextRace
    ? await admin
        .from("predictions")
        .select("event_type,predicted_position,driver_id,drivers(name)")
        .eq("race_id", nextRace.id)
        .eq("user_id", user.id)
        .order("predicted_position")
        .then(r => r.data ?? [])
    : [];

  const totalPicksSubmitted = myNextPicks.length;
  const WINDOW_HOURS = 48;
  const picksWindowOpen = nextRace
    ? new Date() >= new Date(new Date(nextRace.quali_start).getTime() - WINDOW_HOURS * 60 * 60 * 1000)
    : false;

  return (
    <div className="space-y-5">

      {/* ── Last race summary bar ── */}
      {lastRace && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500 shrink-0 text-xs">Last race</span>
            <span className="font-medium text-slate-200 truncate">{lastRace.grand_prix}</span>
            {lastRace.userScore !== null && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-red-400 font-semibold">{lastRace.userScore} pts</span>
              </>
            )}
          </div>
          <Link href={`/results?race=${lastRace.id}`}
            className="text-xs text-slate-400 hover:text-white transition-colors shrink-0">
            See full results →
          </Link>
        </div>
      )}

      {/* ── Season progress ── */}
      {season.total > 0 && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="shrink-0">2026 Season</span>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${Math.round((season.past / season.total) * 100)}%` }} />
          </div>
          <span className="shrink-0">{season.past}/{season.total} races</span>
        </div>
      )}

      {/* ── Leaderboard (centrepiece) ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Leaderboard</h2>
          <span className="text-xs text-slate-500">Best 20 races · tap row for history</span>
        </div>
        <LeaderboardFull
          leaderboard={leaderboard}
          history={history}
          currentUserId={user?.id ?? null}
        />
      </div>

      {/* ── Middle row: chart + next race ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Fantasy progression chart (2/3 width on desktop) */}
        <div className="lg:col-span-2 card space-y-3">
          <div>
            <h3 className="font-semibold">Points Progression</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cumulative points per race</p>
          </div>
          <FantasyChart history={history} currentUserId={user?.id ?? null} />
        </div>

        {/* Next race (1/3 width on desktop) */}
        <div className="card space-y-3">
          {nextRace ? (
            <>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Next Race</p>
                <h3 className="text-lg font-bold leading-tight">{nextRace.grand_prix}</h3>
              </div>
              {(() => {
                const now = new Date();
                if (new Date(nextRace.quali_start) > now)
                  return <Countdown target={nextRace.quali_start} label="Qualifying in" />;
                if (nextRace.has_sprint && nextRace.sprint_start && new Date(nextRace.sprint_start) > now)
                  return <Countdown target={nextRace.sprint_start} label="Sprint in" />;
                if (new Date(nextRace.race_start) > now)
                  return <Countdown target={nextRace.race_start} label="Race in" />;
                return <Countdown target={nextRace.race_start} label="Race" />;
              })()}
              <div className="text-xs text-slate-600 space-y-1 border-t border-slate-800 pt-2">
                {[
                  { label: "Qualifying", iso: nextRace.quali_start },
                  ...(nextRace.has_sprint && nextRace.sprint_start ? [{ label: "Sprint", iso: nextRace.sprint_start }] : []),
                  { label: "Race", iso: nextRace.race_start }
                ].map(({ label, iso }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span>{label}</span>
                    <span className="text-slate-400 text-right"><LocalTime iso={iso} opts={SESSION_OPTS} /></span>
                  </div>
                ))}
              </div>

              {/* Picks reminder */}
              {picksWindowOpen && (
                <div className={`rounded-lg px-3 py-2 text-xs ${
                  totalPicksSubmitted > 0
                    ? "bg-emerald-900/30 border border-emerald-800/40 text-emerald-300"
                    : "bg-red-950/40 border border-red-900/50 text-red-300"
                }`}>
                  {totalPicksSubmitted > 0 ? "✓ Picks submitted" : "⚠ No picks yet — window open"}
                </div>
              )}

              <Link href={`/picks?race=${nextRace.id}`}
                className="block text-center rounded bg-red-600 hover:bg-red-500 transition-colors px-4 py-2 text-sm font-medium">
                {totalPicksSubmitted > 0 ? "Edit picks →" : "Make picks →"}
              </Link>
            </>
          ) : (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Next Race</p>
              <p className="text-slate-400 text-sm">Season complete</p>
            </div>
          )}
        </div>
      </div>

      {/* ── F1 Official Championship ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">F1 Driver Championship</h3>
            <p className="text-xs text-slate-500 mt-0.5">Official {new Date().getUTCFullYear()} standings</p>
          </div>
          <span className="text-xs text-slate-600">Top 10</span>
        </div>
        <F1Standings standings={f1Standings} />
      </div>

    </div>
  );
}
