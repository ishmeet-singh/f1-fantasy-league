import Link from "next/link";
import {
  getLeaderboard, getNextRace, getPersonalStats, getSeasonProgress,
  getLastCompletedRace, getPointsHistory
} from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { SESSION_OPTS } from "@/lib/date-formats";
import { LeaderboardFull } from "@/components/leaderboard-full";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = getSupabaseAdmin();

  const [leaderboard, nextRace, season, personalStats, lastRace, history] = await Promise.all([
    getLeaderboard(),
    getNextRace(),
    getSeasonProgress(),
    user ? getPersonalStats(user.id) : Promise.resolve(null),
    user ? getLastCompletedRace(user.id) : getLastCompletedRace(),
    getPointsHistory(),
  ]);

  // My picks for next race
  const myNextPicks = user && nextRace
    ? await admin
        .from("predictions")
        .select("event_type,predicted_position,driver_id,drivers(name)")
        .eq("race_id", nextRace.id)
        .eq("user_id", user.id)
        .order("predicted_position")
        .then(r => r.data ?? [])
    : [];

  const picksByEvent = {
    quali: myNextPicks.filter(p => p.event_type === "quali"),
    sprint: myNextPicks.filter(p => p.event_type === "sprint"),
    race: myNextPicks.filter(p => p.event_type === "race"),
  };
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
            <span className="text-slate-500 shrink-0">Last race</span>
            <span className="font-medium text-slate-200 truncate">{lastRace.grand_prix}</span>
            {lastRace.userScore !== null && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-red-400 font-semibold">{lastRace.userScore} pts</span>
              </>
            )}
          </div>
          <Link
            href={`/results?race=${lastRace.id}`}
            className="text-xs text-slate-400 hover:text-white transition-colors shrink-0"
          >
            See full results →
          </Link>
        </div>
      )}

      {/* ── Season progress ── */}
      {season.total > 0 && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>2026 Season</span>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${Math.round((season.past / season.total) * 100)}%` }}
            />
          </div>
          <span>{season.past}/{season.total} races</span>
        </div>
      )}

      {/* ── Top row: next race (small) + my season ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Next race */}
        <div className="card space-y-3">
          {nextRace ? (
            <>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Next Race</p>
                <h2 className="text-lg font-bold leading-tight">{nextRace.grand_prix}</h2>
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
                  <div key={label} className="flex justify-between gap-4">
                    <span>{label}</span>
                    <span className="text-slate-400"><LocalTime iso={iso} opts={SESSION_OPTS} /></span>
                  </div>
                ))}
              </div>
              <Link href={`/picks?race=${nextRace.id}`}
                className="inline-block rounded bg-red-600 hover:bg-red-500 transition-colors px-4 py-2 text-sm font-medium">
                Make picks →
              </Link>
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Next Race</p>
              <p className="text-slate-400 text-sm">Season complete or calendar not loaded.</p>
            </div>
          )}
        </div>

        {/* My season */}
        <div className="card space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest">My Season</p>
          {personalStats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Rank" value={`#${personalStats.rank}`} accent />
                <Stat label="Points" value={String(personalStats.totalPoints)} />
                <Stat label="Best Race" value={`${personalStats.bestWeekend} pts`} />
                <Stat label="Exact Hits" value={String(personalStats.exactMatches)} />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-400 text-sm">No scores yet.</p>
              <p className="text-xs text-slate-600">Make your first picks to appear on the leaderboard.</p>
              <Link href="/picks" className="text-sm text-red-400 hover:text-red-300 transition-colors">Make picks →</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── My picks for next race ── */}
      {nextRace && picksWindowOpen && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              My Picks · {nextRace.grand_prix}
            </p>
            <Link href={`/picks?race=${nextRace.id}`}
              className="text-xs text-red-400 hover:text-red-300 transition-colors">
              {totalPicksSubmitted > 0 ? "Edit picks →" : "Make picks →"}
            </Link>
          </div>
          {totalPicksSubmitted === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-red-950/30 border border-red-900/40 px-4 py-3">
              <span className="text-red-400 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-300">No picks submitted yet</p>
                <p className="text-xs text-slate-500 mt-0.5">Window is open — submit before qualifying starts</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {(["quali", "sprint", "race"] as const)
                .filter(et => et !== "sprint" || nextRace.has_sprint)
                .map(et => {
                  const picks = picksByEvent[et];
                  const label = et === "quali" ? "Qualifying" : et === "sprint" ? "Sprint" : "Race";
                  return (
                    <div key={et} className="space-y-1.5">
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                      {picks.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Not submitted</p>
                      ) : (
                        picks.map(p => {
                          const driverName = Array.isArray(p.drivers)
                            ? p.drivers[0]?.name
                            : (p.drivers as { name: string } | null)?.name ?? "Unknown";
                          return (
                            <div key={p.predicted_position} className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-slate-500 w-5">P{p.predicted_position}</span>
                              <span className="text-slate-300 truncate">{driverName}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Full leaderboard (centrepiece) ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Leaderboard</h2>
          <span className="text-xs text-slate-500">Best 20 races · click row for history</span>
        </div>
        <LeaderboardFull
          leaderboard={leaderboard}
          history={history}
          currentUserId={user?.id ?? null}
        />
      </div>

    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-red-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
