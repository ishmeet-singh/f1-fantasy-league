"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Route } from "next";

type TabId = "quali" | "sprint" | "race";
type ResultRow = { driver_id: string; actual_position: number; driver_name: string; driver_team: string };
type LeaguePick = { predictedPos: number; driverId: string; driverName: string; eventType?: TabId };
type LeaguePlayer = { userId: string; userName: string; picks: LeaguePick[]; scores: Record<TabId, number | null> };

type RaceItem = { id: string; grand_prix: string; round: number; isPast: boolean; hasResults: boolean };

type Props = {
  races: RaceItem[];
  selectedRace: { id: string; grand_prix: string; race_start: string; quali_start: string; sprint_start?: string | null; has_sprint: boolean };
  resultsByEvent: Record<TabId, ResultRow[]>;
  myPicks: Record<TabId, Record<string, number>>;
  myScores: Record<TabId, { points: number; exact: number } | null>;
  leaguePlayers: LeaguePlayer[];
  currentUserId: string | null;
};

const TEAM_COLORS: Record<string, string> = {
  "McLaren": "bg-orange-500", "Red Bull": "bg-blue-700", "Red Bull Racing": "bg-blue-700",
  "Ferrari": "bg-red-600", "Mercedes": "bg-teal-500", "Aston Martin": "bg-emerald-700",
  "Alpine F1 Team": "bg-pink-500", "Alpine": "bg-pink-500", "Williams": "bg-sky-500",
  "Racing Bulls": "bg-indigo-500", "RB F1 Team": "bg-indigo-500",
  "Haas F1 Team": "bg-slate-400", "Haas": "bg-slate-400",
  "Sauber": "bg-lime-500", "Kick Sauber": "bg-lime-500",
};

function teamDot(team: string) {
  return <span className={`inline-block w-2 h-2 rounded-full ${TEAM_COLORS[team] ?? "bg-slate-600"} shrink-0`} />;
}

function shortGP(name: string) {
  return name.replace(" Grand Prix", "").replace("Grand Prix", "").trim();
}

function ptsForDiff(et: TabId, diff: number): number {
  if (et === "quali") return Math.max(0, 12 - diff * 4);
  return Math.max(0, (et === "sprint" ? 10 : 12) - diff * 2);
}

// Session card: shows my picks vs actual results for one event
function SessionCard({
  eventType, label, results, myPicks, myScore, sessionLocked
}: {
  eventType: TabId; label: string;
  results: ResultRow[];
  myPicks: Record<string, number>;
  myScore: { points: number; exact: number } | null;
  sessionLocked: boolean;
}) {
  const [showFull, setShowFull] = useState(false);

  const actualPos = new Map(results.map(r => [r.driver_id, r.actual_position]));
  const actualDriver = new Map(results.map(r => [r.driver_id, r]));

  // My picks as rows
  const myPickRows = Object.entries(myPicks)
    .map(([driverId, predictedPos]) => {
      const actual = actualPos.get(driverId) ?? null;
      const diff = actual !== null ? Math.abs(predictedPos - actual) : null;
      const pts = diff !== null ? ptsForDiff(eventType, diff) : null;
      const driver = actualDriver.get(driverId);
      return { driverId, predictedPos, actual, diff, pts, driverName: driver?.driver_name ?? driverId, driverTeam: driver?.driver_team ?? "" };
    })
    .sort((a, b) => a.predictedPos - b.predictedPos);

  const hasMyPicks = myPickRows.length > 0;
  const hasResults = results.length > 0;
  const weekendTotal = myScore?.points ?? null;

  return (
    <div className="card p-0 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{label}</p>
          {myScore && myScore.points > 0 && (
            <p className="text-xs text-emerald-400 mt-0.5">{myScore.points} pts · {myScore.exact} exact</p>
          )}
        </div>
        {hasResults && hasMyPicks && (
          <button onClick={() => setShowFull(v => !v)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {showFull ? "My picks ↑" : "Full results ↓"}
          </button>
        )}
      </div>

      {/* Content */}
      {!hasResults && !hasMyPicks ? (
        <div className="px-4 py-6 text-center text-slate-600 text-xs">
          {sessionLocked ? "No results yet" : "Not started"}
        </div>
      ) : showFull && hasResults ? (
        // Full results view
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[260px]">
            <thead><tr className="border-b border-slate-800 text-xs text-slate-500 uppercase text-left">
              <th className="px-4 py-2">Pos</th>
              <th className="px-4 py-2">Driver</th>
              {Object.keys(myPicks).length > 0 && <th className="px-4 py-2 text-right">Pick</th>}
            </tr></thead>
            <tbody>
              {results.map((r, i) => {
                const myP = myPicks[r.driver_id];
                const exact = myP !== undefined && myP === r.actual_position;
                return (
                  <tr key={r.driver_id} className={`border-t border-slate-800/50 ${exact ? "bg-emerald-950/20" : i % 2 ? "bg-slate-800/20" : ""}`}>
                    <td className="px-4 py-2 font-mono text-slate-300 text-xs">P{r.actual_position}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">{teamDot(r.driver_team)}<span className="text-sm">{r.driver_name}</span></div>
                    </td>
                    {Object.keys(myPicks).length > 0 && (
                      <td className="px-4 py-2 text-right">
                        {myP !== undefined ? (
                          <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${exact ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                            P{myP}{exact ? " ✓" : ` +${Math.abs(myP - r.actual_position)}`}
                          </span>
                        ) : <span className="text-slate-700 text-xs">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : hasMyPicks ? (
        // My picks view (default when picks exist)
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[240px]">
            <thead><tr className="border-b border-slate-800 text-xs text-slate-500 uppercase text-left">
              <th className="px-4 py-2">My pick</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2 text-center">Actual</th>
              <th className="px-4 py-2 text-right">Pts</th>
            </tr></thead>
            <tbody>
              {myPickRows.map((p, i) => {
                const exact = p.diff === 0;
                return (
                  <tr key={p.driverId} className={`border-t border-slate-800/50 ${exact ? "bg-emerald-950/20" : i % 2 ? "bg-slate-800/20" : ""}`}>
                    <td className="px-4 py-2 font-mono text-slate-500 text-xs">P{p.predictedPos}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">{teamDot(p.driverTeam)}<span>{p.driverName}</span></div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {p.actual !== null ? (
                        <span className={`font-mono text-xs font-bold ${exact ? "text-emerald-400" : "text-slate-300"}`}>
                          P{p.actual}{exact ? " ✓" : ""}
                        </span>
                      ) : <span className="text-slate-600 text-xs">{hasResults ? "Not classified" : "—"}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {p.pts !== null ? (
                        <span className={`text-xs font-semibold ${p.pts > 0 ? "text-white" : "text-slate-600"}`}>{p.pts}pt</span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : hasResults ? (
        // No picks but results exist
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[200px]">
            <tbody>
              {results.map((r, i) => (
                <tr key={r.driver_id} className={`border-t border-slate-800/50 ${i % 2 ? "bg-slate-800/20" : ""}`}>
                  <td className="px-4 py-2 font-mono text-slate-500 text-xs w-10">P{r.actual_position}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">{teamDot(r.driver_team)}<span className="text-sm">{r.driver_name}</span></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Weekend total for this session */}
      {weekendTotal !== null && weekendTotal > 0 && (
        <div className="px-4 py-2 border-t border-slate-800 mt-auto">
          <span className="text-xs text-slate-500">Session total: </span>
          <span className="text-sm font-bold text-red-400">{weekendTotal} pts</span>
        </div>
      )}
    </div>
  );
}

// League table with expandable rows
function LeagueTable({
  players, resultsByEvent, hasSprint, sessionLocked, currentUserId
}: {
  players: LeaguePlayer[];
  resultsByEvent: Record<TabId, ResultRow[]>;
  hasSprint: boolean;
  sessionLocked: Record<TabId, boolean>;
  currentUserId: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const visibleEvents = hasSprint ? ["quali", "sprint", "race"] as TabId[] : ["quali", "race"] as TabId[];

  // Only show league table after at least one session is locked
  if (!Object.values(sessionLocked).some(Boolean)) return null;
  if (players.length === 0) return null;

  const actualPos = new Map<string, Map<string, number>>();
  for (const et of visibleEvents) {
    const m = new Map(resultsByEvent[et].map(r => [r.driver_id, r.actual_position]));
    actualPos.set(et, m);
  }

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }

  const sorted = [...players].sort((a, b) => {
    const aTotal = visibleEvents.reduce((s, et) => s + (a.scores[et] ?? 0), 0);
    const bTotal = visibleEvents.reduce((s, et) => s + (b.scores[et] ?? 0), 0);
    return bTotal - aTotal;
  });

  const labels: Record<TabId, string> = { quali: "Qualifying", sprint: "Sprint", race: "Race" };

  return (
    <div className="card p-0">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="font-semibold text-sm">League · This Race</p>
          <p className="text-xs text-slate-500 mt-0.5">Click a player to see their picks (revealed after session locks)</p>
      </div>
      <div className="divide-y divide-slate-800/50">
        {sorted.map((player, i) => {
          const isMe = player.userId === currentUserId;
          const weekend = visibleEvents.reduce((s, et) => s + (player.scores[et] ?? 0), 0);
          const open = expanded.has(player.userId);

          return (
            <div key={player.userId} className={isMe ? "bg-red-950/20" : ""}>
              {/* Row */}
              <div
                onClick={() => toggle(player.userId)}
                className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-slate-800/30 transition-colors"
              >
                <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}</span>
                <span className={`flex-1 min-w-0 font-medium truncate ${isMe ? "text-white" : "text-slate-200"}`}>
                  {player.userName}{isMe && <span className="ml-1.5 text-xs text-red-400">(you)</span>}
                </span>
                {/* Per-event scores */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                  {visibleEvents.map(et => (
                    <span key={et}>{labels[et][0]}: <span className="text-slate-300">{player.scores[et] ?? "—"}</span></span>
                  ))}
                </div>
                <span className="font-mono font-bold text-white shrink-0 ml-2">{weekend}pt</span>
                <span className="text-slate-600 text-xs w-3">{open ? "▲" : "▼"}</span>
              </div>

              {/* Expanded picks */}
              {open && (
                <div className={`px-4 pb-4 pt-1 ${isMe ? "bg-red-950/10" : "bg-slate-900/30"}`}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleEvents.filter(et => sessionLocked[et]).map(et => {
                      const eventPicks = player.picks.filter(p => (p.eventType ?? et) === et).sort((a, b) => a.predictedPos - b.predictedPos);
                      const aPosMap = actualPos.get(et) ?? new Map();
                      if (!eventPicks.length) return null;
                      return (
                        <div key={et}>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">{labels[et]}</p>
                          <div className="space-y-1">
                            {eventPicks.map(p => {
                              const actual = aPosMap.get(p.driverId) ?? null;
                              const exact = actual !== null && actual === p.predictedPos;
                              return (
                                <div key={p.predictedPos} className="flex items-center gap-2 text-xs">
                                  <span className="font-mono text-slate-600 w-5">P{p.predictedPos}</span>
                                  <span className={exact ? "text-emerald-300" : "text-slate-300"}>{p.driverName.split(" ").pop()}</span>
                                  {actual !== null && (
                                    <span className={`ml-auto font-mono ${exact ? "text-emerald-400" : "text-slate-500"}`}>
                                      {exact ? "✓" : `→P${actual}`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RaceWeekendResults({
  races, selectedRace, resultsByEvent, myPicks, myScores, leaguePlayers, currentUserId
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const now = new Date();

  const sessionLocked: Record<TabId, boolean> = {
    quali: new Date(selectedRace.quali_start) <= now || resultsByEvent.quali.length > 0,
    sprint: selectedRace.has_sprint && selectedRace.sprint_start
      ? new Date(selectedRace.sprint_start) <= now || resultsByEvent.sprint.length > 0
      : false,
    race: new Date(selectedRace.race_start) <= now || resultsByEvent.race.length > 0,
  };

  const weekendTotal = (["quali", "sprint", "race"] as TabId[])
    .reduce((s, et) => s + (myScores[et]?.points ?? 0), 0);
  const weekendExact = (["quali", "sprint", "race"] as TabId[])
    .reduce((s, et) => s + (myScores[et]?.exact ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Results</h1>

      {/* Race selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {races.map(r => {
          const selected = r.id === selectedRace.id;
          return (
            <button key={r.id}
              onClick={() => router.push(`${pathname}?race=${r.id}` as Route)}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                selected ? "bg-red-600 border-red-500 text-white"
                : r.hasResults ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                : r.isPast ? "bg-slate-900 border-slate-800 text-slate-500"
                : "bg-slate-900/50 border-slate-800/50 text-slate-600"
              }`}
            >
              <span className="text-[10px] opacity-60">R{r.round}</span>
              <span className="max-w-[72px] text-center leading-tight">{shortGP(r.grand_prix)}</span>
              {r.hasResults && !selected && <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Race header + weekend score */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">{selectedRace.grand_prix}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(selectedRace.race_start).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        {weekendTotal > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-3 text-center">
            <p className="text-3xl font-bold text-red-400">{weekendTotal}</p>
            <p className="text-xs text-slate-400 mt-0.5">points this weekend</p>
            {weekendExact > 0 && <p className="text-xs text-emerald-400">{weekendExact} exact hits</p>}
          </div>
        )}
      </div>

      {/* Session cards — side by side */}
      <div className={`grid gap-4 ${selectedRace.has_sprint ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <SessionCard
          eventType="quali" label="Qualifying"
          results={resultsByEvent.quali}
          myPicks={myPicks.quali}
          myScore={myScores.quali}
          sessionLocked={sessionLocked.quali}
        />
        {selectedRace.has_sprint && (
          <SessionCard
            eventType="sprint" label="Sprint"
            results={resultsByEvent.sprint}
            myPicks={myPicks.sprint}
            myScore={myScores.sprint}
            sessionLocked={sessionLocked.sprint}
          />
        )}
        <SessionCard
          eventType="race" label="Race"
          results={resultsByEvent.race}
          myPicks={myPicks.race}
          myScore={myScores.race}
          sessionLocked={sessionLocked.race}
        />
      </div>

      {/* League table */}
      <LeagueTable
        players={leaguePlayers}
        resultsByEvent={resultsByEvent}
        hasSprint={selectedRace.has_sprint}
        sessionLocked={sessionLocked}
        currentUserId={currentUserId}
      />
    </div>
  );
}
