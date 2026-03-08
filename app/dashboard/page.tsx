import Link from "next/link";
import { getLeaderboard, getNextRace, getPersonalStats, getSeasonProgress } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Countdown } from "@/components/countdown";
import { LocalTime } from "@/components/local-time";
import { SESSION_OPTS } from "@/lib/date-formats";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];
const WINDOW_HOURS = 48;

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const admin = getSupabaseAdmin();

  const [leaderboard, nextRace, season, personalStats] = await Promise.all([
    getLeaderboard(),
    getNextRace(),
    getSeasonProgress(),
    user ? getPersonalStats(user.id) : Promise.resolve(null)
  ]);

  // Fetch user's picks for the next race (for the summary card)
  const myNextPicks = user && nextRace
    ? await admin
        .from("predictions")
        .select("event_type,predicted_position,driver_id,drivers(name)")
        .eq("race_id", nextRace.id)
        .eq("user_id", user.id)
        .order("predicted_position")
        .then((r) => r.data ?? [])
    : [];

  const picksByEvent = {
    quali: myNextPicks.filter((p) => p.event_type === "quali"),
    sprint: myNextPicks.filter((p) => p.event_type === "sprint"),
    race: myNextPicks.filter((p) => p.event_type === "race")
  };
  const totalPicksSubmitted = myNextPicks.length;
  const picksWindowOpen = nextRace
    ? new Date() >= new Date(new Date(nextRace.quali_start).getTime() - WINDOW_HOURS * 60 * 60 * 1000)
    : false;

  return (
    <div className="space-y-6">
      {/* Season banner */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400 font-medium tracking-wide uppercase text-xs">
          {new Date().getFullYear()} Season
        </span>
        {season.total > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs">
              Race {season.past} of {season.total}
            </span>
            <div className="hidden sm:flex w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all"
                style={{ width: `${Math.round((season.past / season.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Top row: next race + personal stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Next race */}
        <div className="card space-y-4">
          {nextRace ? (
            <>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Next Race</p>
                <h2 className="text-xl font-bold leading-tight">{nextRace.grand_prix}</h2>
              </div>
              {/* Count down to the next upcoming session of the weekend */}
              {(() => {
                const now = new Date();
                if (new Date(nextRace.quali_start) > now)
                  return <Countdown target={nextRace.quali_start} label="Qualifying in" />;
                if (nextRace.has_sprint && nextRace.sprint_start && new Date(nextRace.sprint_start) > now)
                  return <Countdown target={nextRace.sprint_start} label="Sprint in" />;
                if (new Date(nextRace.race_start) > now)
                  return <Countdown target={nextRace.race_start} label="Race in" />;
                return <p className="text-sm text-slate-400">Race weekend in progress</p>;
              })()}
              <div className="text-xs text-slate-500 space-y-2 border-t border-slate-800 pt-3">
                {[
                  { label: "Qualifying", iso: nextRace.quali_start },
                  ...(nextRace.has_sprint && nextRace.sprint_start
                    ? [{ label: "Sprint", iso: nextRace.sprint_start }]
                    : []),
                  { label: "Race", iso: nextRace.race_start }
                ].map(({ label, iso }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="shrink-0">{label}</span>
                    <span className="text-slate-300 text-right">
                      <LocalTime iso={iso} opts={SESSION_OPTS} />
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href={`/picks?race=${nextRace.id}`}
                className="inline-block rounded bg-red-600 hover:bg-red-500 transition-colors px-4 py-2 text-sm font-medium"
              >
                Make picks →
              </Link>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Next Race</p>
              <p className="text-slate-400">Season schedule not loaded yet.</p>
              <p className="text-xs text-slate-600">An admin needs to run &quot;Sync Season Calendar&quot; from the Admin panel.</p>
            </div>
          )}
        </div>

        {/* Personal stats */}
        <div className="card space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest">My Season</p>
          {personalStats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Rank" value={`#${personalStats.rank}`} accent />
                <Stat label="Points" value={String(personalStats.totalPoints)} />
                <Stat label="Best Race" value={`${personalStats.bestWeekend} pts`} />
                <Stat label="Exact Hits" value={String(personalStats.exactMatches)} />
              </div>
              {personalStats.lastRace && (
                <p className="text-xs text-slate-500 border-t border-slate-800 pt-3">
                  Last scored:{" "}
                  <span className="text-slate-300">{personalStats.lastRace.name}</span>
                  {" · "}
                  <span className="text-red-400 font-medium">{personalStats.lastRace.points} pts</span>
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-400 text-sm">No scores yet.</p>
              <p className="text-xs text-slate-600">
                Make your first picks to appear on the leaderboard.
              </p>
              <Link href="/picks" className="text-sm text-red-400 hover:text-red-300 transition-colors">
                Make picks →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* My picks for next race */}
      {nextRace && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              My Picks · {nextRace.grand_prix}
            </p>
            <Link
              href={`/picks?race=${nextRace.id}`}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              {totalPicksSubmitted > 0 ? "Edit picks →" : "Make picks →"}
            </Link>
          </div>

          {!picksWindowOpen ? (
            <p className="text-sm text-slate-500">
              Picks window opens 48 hours before qualifying.
            </p>
          ) : totalPicksSubmitted === 0 ? (
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
                .filter((et) => et !== "sprint" || nextRace.has_sprint)
                .map((et) => {
                  const picks = picksByEvent[et];
                  const label = et === "quali" ? "Qualifying" : et === "sprint" ? "Sprint" : "Race";
                  return (
                    <div key={et} className="space-y-1.5">
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                      {picks.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Not submitted</p>
                      ) : (
                        picks.map((p) => {
                          const driverName = Array.isArray(p.drivers)
                            ? p.drivers[0]?.name
                            : (p.drivers as { name: string } | null)?.name ?? "Unknown";
                          return (
                            <div key={p.predicted_position} className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-slate-500 w-5">P{p.predicted_position}</span>
                              <span className="text-slate-300">{driverName}</span>
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

      {/* Leaderboard */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Leaderboard</h2>
          <span className="text-xs text-slate-500">Best 20 races</span>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">
            No scores yet — picks start appearing here after the first race.
          </p>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry, i) => {
              const isMe = entry.id === user?.id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    isMe
                      ? "bg-red-950/40 border border-red-900/50"
                      : i % 2 === 0
                        ? "bg-slate-800/30"
                        : ""
                  }`}
                >
                  <span className="w-6 text-center text-base leading-none">
                    {i < 3 ? MEDALS[i] : <span className="text-slate-500 text-xs">{i + 1}</span>}
                  </span>
                  <span className={`flex-1 min-w-0 font-medium truncate ${isMe ? "text-white" : "text-slate-200"}`}>
                    {entry.name}
                    {isMe && <span className="ml-2 text-xs text-red-400">(you)</span>}
                  </span>
                  <span className="font-mono font-semibold text-white shrink-0">{entry.score}</span>
                  <span className="text-slate-500 text-xs w-14 text-right hidden sm:block shrink-0">
                    {entry.exact} exact
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
