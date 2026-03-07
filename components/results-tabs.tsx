"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LocalTime } from "@/components/local-time";
import type { Route } from "next";

type ResultRow = { driver_id: string; actual_position: number; driver_name: string; driver_team: string };
type TabId = "quali" | "sprint" | "race";
type ScoreSummary = { points: number; exact: number; error: number } | null;
type LeaguePick = { predictedPos: number; driverId: string; driverName: string };
type LeaguePlayer = { userId: string; userName: string; picks: LeaguePick[] };

type RaceItem = { id: string; grand_prix: string; round: number; isPast: boolean; hasResults: boolean };

type Props = {
  races: RaceItem[];
  selectedRaceId: string;
  selectedRaceName: string;
  selectedRaceDate: string;
  hasSprint: boolean;
  activeTab: TabId;
  resultsByEvent: Record<TabId, ResultRow[]>;
  picksByEventAndDriver: Record<TabId, Record<string, number>>;
  scoresByEvent: Record<TabId, ScoreSummary>;
  leagueByEvent: Record<TabId, LeaguePlayer[]>;
  currentUserId: string | null;
  hasUser: boolean;
};

const TAB_LABELS: Record<TabId, string> = { quali: "Qualifying", sprint: "Sprint", race: "Race" };

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

// Points per pick based on scoring config
function ptsForDiff(et: TabId, diff: number): number {
  if (et === "quali") return Math.max(0, 12 - diff * 4);
  return Math.max(0, (et === "sprint" ? 10 : 12) - diff * 2);
}

export function ResultsTabs({
  races, selectedRaceId, selectedRaceName, selectedRaceDate,
  hasSprint, activeTab, resultsByEvent, picksByEventAndDriver,
  scoresByEvent, leagueByEvent, currentUserId, hasUser
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [showFullResults, setShowFullResults] = useState(false);

  function navigate(params: { race?: string; tab?: string }) {
    const sp = new URLSearchParams();
    sp.set("race", params.race ?? selectedRaceId);
    sp.set("tab", params.tab ?? activeTab);
    setShowFullResults(false);
    router.push(`${pathname}?${sp.toString()}` as Route);
  }

  const tabs: TabId[] = hasSprint ? ["quali", "sprint", "race"] : ["quali", "race"];
  const results = resultsByEvent[activeTab] ?? [];
  const myPicks = picksByEventAndDriver[activeTab] ?? {};
  const myScore = scoresByEvent[activeTab];
  const leaguePlayers = leagueByEvent[activeTab] ?? [];
  const resultsPublished = results.length > 0;

  // Build actual position lookup: driverId -> actualPosition
  const actualPos = new Map(results.map((r) => [r.driver_id, r.actual_position]));
  const actualDriver = new Map(results.map((r) => [r.driver_id, r]));

  // Driver names from league picks (joined to drivers table — more reliable than results)
  const myLeaguePicks = leaguePlayers.find((p) => p.userId === currentUserId);
  const driverNameById = new Map(myLeaguePicks?.picks.map((p) => [p.driverId, p.driverName]) ?? []);

  // My picks as ordered rows with actual result alongside
  const myPickRows = Object.entries(myPicks)
    .map(([driverId, predictedPos]) => {
      const actual = actualPos.get(driverId) ?? null;
      const diff = actual !== null ? Math.abs(predictedPos - actual) : null;
      const pts = diff !== null ? ptsForDiff(activeTab, diff) : null;
      const driver = actualDriver.get(driverId);
      const driverName = driverNameById.get(driverId) ?? driver?.driver_name ?? driverId;
      return { driverId, predictedPos, actual, diff, pts, driverName, driverTeam: driver?.driver_team ?? "" };
    })
    .sort((a, b) => a.predictedPos - b.predictedPos);

  const hasMyPicks = myPickRows.length > 0;
  const hasResults = results.length > 0;

  const weekendTotal = (["quali", "sprint", "race"] as TabId[]).reduce((s, et) => s + (scoresByEvent[et]?.points ?? 0), 0);
  const weekendExact = (["quali", "sprint", "race"] as TabId[]).reduce((s, et) => s + (scoresByEvent[et]?.exact ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Results</h1>

      {/* Race pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {races.map((r) => {
          const selected = r.id === selectedRaceId;
          return (
            <button key={r.id} onClick={() => navigate({ race: r.id, tab: activeTab })}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                selected ? "bg-red-600 border-red-500 text-white"
                : r.hasResults ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                : r.isPast ? "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                : "bg-slate-900/50 border-slate-800/50 text-slate-600 hover:border-slate-700"
              }`}
            >
              <span className="text-[10px] opacity-60">R{r.round}</span>
              <span className="max-w-[72px] text-center leading-tight">{shortGP(r.grand_prix)}</span>
              {r.hasResults && !selected && <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Race header + weekend score card */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">{selectedRaceName}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            <LocalTime iso={selectedRaceDate} opts={{ day: "numeric", month: "short", year: "numeric" }} />
          </p>
        </div>
        {hasUser && weekendTotal > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-3 text-center">
            <p className="text-3xl font-bold text-red-400">{weekendTotal}</p>
            <p className="text-xs text-slate-400 mt-0.5">points this weekend</p>
            {weekendExact > 0 && (
              <p className="text-xs text-emerald-400 mt-0.5">{weekendExact} exact {weekendExact === 1 ? "hit" : "hits"}</p>
            )}
          </div>
        )}
      </div>

      {/* Session tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800 scrollbar-none">
        {tabs.map((tab) => {
          const s = scoresByEvent[tab];
          return (
            <button key={tab} onClick={() => navigate({ tab })}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab ? "border-red-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {TAB_LABELS[tab]}
              {s && s.points > 0 && (
                <span className="ml-1.5 text-xs text-emerald-400">{s.points}pt</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Score summary for this event */}
      {hasUser && myScore && myScore.points > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
            <span className="text-white font-bold">{myScore.points}</span>
            <span className="text-slate-400">points</span>
          </div>
          {myScore.exact > 0 && (
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-800/50 rounded-lg px-3 py-1.5">
              <span className="text-emerald-300 font-bold">{myScore.exact}</span>
              <span className="text-slate-400">exact {myScore.exact === 1 ? "hit" : "hits"}</span>
            </div>
          )}
        </div>
      )}

      {/* Main content area */}
      {!hasResults && !hasMyPicks ? (
        <div className="card text-center py-10 space-y-2">
          <p className="text-slate-400 text-sm">No {TAB_LABELS[activeTab]} results yet.</p>
          <p className="text-slate-600 text-xs">Results appear here after the session ends.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* MY PICKS — primary view */}
          {hasUser && hasMyPicks && (
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">My Picks</p>
                {hasResults && (
                  <button onClick={() => setShowFullResults((v) => !v)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0 ml-2"
                  >
                    {showFullResults ? "Hide results ↑" : "Show full results ↓"}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[340px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5">My pick</th>
                    <th className="px-4 py-2.5">Driver</th>
                    <th className="px-4 py-2.5 text-center">Actual</th>
                    <th className="px-4 py-2.5 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {myPickRows.map((p, i) => {
                    const exact = p.diff === 0;
                    return (
                      <tr key={p.driverId}
                        className={`border-t border-slate-800/50 ${exact ? "bg-emerald-950/20" : i % 2 === 0 ? "" : "bg-slate-800/20"}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-400 text-sm">P{p.predictedPos}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {teamDot(p.driverTeam)}
                            <span className="font-medium text-slate-200">{p.driverName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {p.actual !== null ? (
                            <span className={`font-mono text-sm font-bold ${exact ? "text-emerald-400" : "text-slate-300"}`}>
                              P{p.actual} {exact && "✓"}
                            </span>
                          ) : resultsPublished ? (
                            <span className="text-slate-600 text-xs">Outside top {results.length}</span>
                          ) : (
                            <span className="text-slate-600 text-xs">pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {p.pts !== null ? (
                            <span className={`font-semibold ${p.pts > 0 ? "text-white" : "text-slate-600"}`}>
                              {p.pts}pt
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* FULL RESULTS — shown when toggled or when user has no picks */}
          {hasResults && (!hasMyPicks || showFullResults) && (
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-sm font-medium text-slate-300">Full Results</p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 w-12">Pos</th>
                    <th className="px-4 py-2.5">Driver</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell">Team</th>
                    {hasUser && <th className="px-4 py-2.5 text-right">Your Pick</th>}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const myPredictedPos = myPicks[r.driver_id];
                    const correct = myPredictedPos !== undefined && myPredictedPos === r.actual_position;
                    const delta = myPredictedPos !== undefined ? Math.abs(myPredictedPos - r.actual_position) : null;
                    return (
                      <tr key={r.driver_id}
                        className={`border-t border-slate-800/50 ${correct ? "bg-emerald-950/20" : i % 2 === 0 ? "" : "bg-slate-800/20"}`}
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-300 w-12">P{r.actual_position}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {teamDot(r.driver_team)}
                            <span className="font-medium">{r.driver_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell text-xs">{r.driver_team}</td>
                        {hasUser && (
                          <td className="px-4 py-2.5 text-right">
                            {myPredictedPos !== undefined ? (
                              <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded ${
                                correct ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}>
                                {correct ? <>P{myPredictedPos} ✓</> : <>P{myPredictedPos} <span className="text-red-400/80">+{delta}</span></>}
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
            </div>
          )}

          {/* LEAGUE PICKS — only visible after results are published */}
          {leaguePlayers.length > 0 && resultsPublished && (
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-sm font-medium text-slate-300">Everyone&apos;s Picks</p>
              </div>
              {/* Desktop: compact table with sticky player column */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5 sticky left-0 bg-slate-900">Player</th>
                      {leaguePlayers[0]?.picks.map((p) => (
                        <th key={p.predictedPos} className="px-3 py-2.5 text-center">P{p.predictedPos}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaguePlayers.map((player, i) => {
                      const isMe = player.userId === currentUserId;
                      return (
                        <tr key={player.userId}
                          className={`border-t border-slate-800/50 ${isMe ? "bg-red-950/20" : i % 2 === 0 ? "" : "bg-slate-800/20"}`}
                        >
                          <td className={`px-4 py-2.5 sticky left-0 font-medium text-sm ${isMe ? "bg-red-950/40 text-white" : "bg-slate-900 text-slate-300"}`}>
                            {player.userName}{isMe && <span className="ml-1 text-xs text-red-400">(you)</span>}
                          </td>
                          {player.picks.map((p) => {
                            const actual = actualPos.get(p.driverId) ?? null;
                            const exact = actual === p.predictedPos;
                            return (
                              <td key={p.predictedPos} className="px-3 py-2.5 text-center">
                                <div className={`text-xs rounded px-1.5 py-0.5 inline-block ${
                                  exact ? "bg-emerald-900/50 text-emerald-300"
                                  : actual !== null ? "text-slate-400" : "text-slate-500"
                                }`}>
                                  {p.driverName.split(" ").pop()}{exact && " ✓"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile: stacked cards per player */}
              <div className="sm:hidden divide-y divide-slate-800">
                {leaguePlayers.map((player) => {
                  const isMe = player.userId === currentUserId;
                  return (
                    <div key={player.userId} className={`px-4 py-3 space-y-2 ${isMe ? "bg-red-950/20" : ""}`}>
                      <p className={`text-sm font-semibold ${isMe ? "text-white" : "text-slate-300"}`}>
                        {player.userName}{isMe && <span className="ml-1.5 text-xs text-red-400">(you)</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {player.picks.map((p) => {
                          const actual = actualPos.get(p.driverId) ?? null;
                          const exact = actual === p.predictedPos;
                          return (
                            <span key={p.predictedPos} className={`text-xs px-2 py-0.5 rounded-full border ${
                              exact
                                ? "bg-emerald-900/40 border-emerald-800/50 text-emerald-300"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                            }`}>
                              P{p.predictedPos} {p.driverName.split(" ").pop()}{exact && " ✓"}
                            </span>
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
      )}
    </div>
  );
}
