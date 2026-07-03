"use client";

import { useState } from "react";
import { isSprintWeekend } from "@/lib/race-weekend";
import { resolveDriverDisplayName } from "@/lib/driver-crossref";
import { pointsForDiff } from "@/lib/scoring";
import { F1 } from "@/lib/f1-theme";
import { ResultsRaceSelector } from "@/components/results-race-selector";
import type { EventType } from "@/lib/types";

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
  McLaren: "bg-orange-500",
  "Red Bull": "bg-blue-700",
  "Red Bull Racing": "bg-blue-700",
  Ferrari: "bg-red-600",
  Mercedes: "bg-teal-500",
  "Aston Martin": "bg-emerald-700",
  "Alpine F1 Team": "bg-pink-500",
  Alpine: "bg-pink-500",
  Williams: "bg-sky-500",
  "Racing Bulls": "bg-indigo-500",
  "RB F1 Team": "bg-indigo-500",
  "Haas F1 Team": "bg-slate-400",
  Haas: "bg-slate-400",
  Sauber: "bg-lime-500",
  "Kick Sauber": "bg-lime-500"
};

const EXACT_BG = "#ECFDF5";
const EXACT_TEXT = "#166534";

function teamDot(team: string) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${TEAM_COLORS[team] ?? "bg-slate-600"}`}
    />
  );
}

function posBadge(slotIdx: number) {
  const bg = slotIdx < 3 ? F1.podium[slotIdx] : F1.carbonMid;
  const color = slotIdx === 0 ? F1.carbon : "#fff";
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
      style={{ background: bg, color }}
    >
      P{slotIdx + 1}
    </span>
  );
}

function SessionCard({
  eventType,
  label,
  results,
  myPicks,
  myScore,
  sessionLocked,
  driverNames,
  hasSprint
}: {
  eventType: TabId;
  label: string;
  results: ResultRow[];
  myPicks: Record<string, number>;
  myScore: { points: number; exact: number } | null;
  sessionLocked: boolean;
  driverNames: Map<string, { name: string; team: string }>;
  hasSprint: boolean;
}) {
  const [showFull, setShowFull] = useState(false);

  const actualPos = new Map(results.map((r) => [r.driver_id, r.actual_position]));
  const actualDriver = new Map(results.map((r) => [r.driver_id, r]));

  const myPickRows = Object.entries(myPicks)
    .map(([driverId, predictedPos]) => {
      const actual = actualPos.get(driverId) ?? null;
      const diff = actual !== null ? Math.abs(predictedPos - actual) : null;
      const pts = diff !== null ? pointsForDiff(eventType as EventType, diff, hasSprint) : null;
      const fromMap = driverNames.get(driverId);
      const fromResults = actualDriver.get(driverId);
      const driverName = resolveDriverDisplayName(
        driverId,
        fromMap?.name || fromResults?.driver_name
      );
      const driverTeam = fromMap?.team || fromResults?.driver_team || "";
      return { driverId, predictedPos, actual, diff, pts, driverName, driverTeam };
    })
    .sort((a, b) => a.predictedPos - b.predictedPos);

  const hasMyPicks = myPickRows.length > 0;
  const hasResults = results.length > 0;
  const weekendTotal = myScore?.points ?? null;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl bg-white" style={{ boxShadow: F1.cardShadow }}>
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: `1px solid ${F1.gridLine}` }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: F1.carbon }}>
            {label}
          </p>
          {myScore && myScore.points > 0 && (
            <p className="mt-0.5 text-xs font-medium" style={{ color: EXACT_TEXT }}>
              {myScore.points} pts · {myScore.exact} exact
            </p>
          )}
        </div>
        {hasResults && hasMyPicks && (
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition active:opacity-80"
            style={{ background: F1.offWhite, color: F1.carbonMid }}
          >
            {showFull ? "My picks" : "Full results"}
          </button>
        )}
      </div>

      {!hasResults && !hasMyPicks ? (
        <div className="px-4 py-6 text-center text-xs" style={{ color: F1.carbonLight }}>
          {sessionLocked ? "No results yet" : "Not started"}
        </div>
      ) : showFull && hasResults ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[260px] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
                <th className="px-4 py-2">Pos</th>
                <th className="px-4 py-2">Driver</th>
                {Object.keys(myPicks).length > 0 && <th className="px-4 py-2 text-right">Pick</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const myP = myPicks[r.driver_id];
                const exact = myP !== undefined && myP === r.actual_position;
                return (
                  <tr
                    key={r.driver_id}
                    style={{
                      borderTop: `1px solid ${F1.gridLine}`,
                      background: exact ? EXACT_BG : i % 2 ? F1.offWhite : F1.white
                    }}
                  >
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: F1.carbonMid }}>
                      P{r.actual_position}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {teamDot(r.driver_team)}
                        <span className="text-sm" style={{ color: F1.carbon }}>
                          {r.driver_name}
                        </span>
                      </div>
                    </td>
                    {Object.keys(myPicks).length > 0 && (
                      <td className="px-4 py-2 text-right">
                        {myP !== undefined ? (
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-xs font-semibold"
                            style={
                              exact
                                ? { background: EXACT_BG, color: EXACT_TEXT }
                                : { background: F1.offWhite, color: F1.carbonMid }
                            }
                          >
                            P{myP}
                            {exact ? " ✓" : ` +${Math.abs(myP - r.actual_position)}`}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: F1.carbonLight }}>
                            —
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : hasMyPicks ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[240px] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
                <th className="px-4 py-2">My pick</th>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2 text-center">Actual</th>
                <th className="px-4 py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {myPickRows.map((p, i) => {
                const exact = p.diff === 0;
                return (
                  <tr
                    key={p.driverId}
                    style={{
                      borderTop: `1px solid ${F1.gridLine}`,
                      background: exact ? EXACT_BG : i % 2 ? F1.offWhite : F1.white
                    }}
                  >
                    <td className="px-4 py-2">
                      {posBadge(p.predictedPos - 1)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {teamDot(p.driverTeam)}
                        <span style={{ color: F1.carbon }}>{p.driverName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {p.actual !== null ? (
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: exact ? EXACT_TEXT : F1.carbon }}
                        >
                          P{p.actual}
                          {exact ? " ✓" : ""}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: F1.carbonLight }}>
                          {hasResults ? "Not classified" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {p.pts !== null ? (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: p.pts > 0 ? F1.carbon : F1.carbonLight }}
                        >
                          {p.pts}pt
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: F1.carbonLight }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : hasResults ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[200px] text-sm">
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={r.driver_id}
                  style={{
                    borderTop: `1px solid ${F1.gridLine}`,
                    background: i % 2 ? F1.offWhite : F1.white
                  }}
                >
                  <td className="w-10 px-4 py-2 font-mono text-xs" style={{ color: F1.carbonMid }}>
                    P{r.actual_position}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      {teamDot(r.driver_team)}
                      <span className="text-sm" style={{ color: F1.carbon }}>
                        {r.driver_name}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {weekendTotal !== null && weekendTotal > 0 && (
        <div className="mt-auto px-4 py-2" style={{ borderTop: `1px solid ${F1.gridLine}` }}>
          <span className="text-xs" style={{ color: F1.carbonLight }}>
            Session total:{" "}
          </span>
          <span className="text-sm font-bold" style={{ color: F1.red }}>
            {weekendTotal} pts
          </span>
        </div>
      )}
    </section>
  );
}

function LeagueTable({
  players,
  resultsByEvent,
  hasSprint,
  sessionLocked,
  currentUserId
}: {
  players: LeaguePlayer[];
  resultsByEvent: Record<TabId, ResultRow[]>;
  hasSprint: boolean;
  sessionLocked: Record<TabId, boolean>;
  currentUserId: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const visibleEvents = hasSprint
    ? (["quali", "sprint", "race"] as TabId[])
    : (["quali", "race"] as TabId[]);

  if (!Object.values(sessionLocked).some(Boolean)) return null;
  if (players.length === 0) return null;

  const actualPos = new Map<string, Map<string, number>>();
  for (const et of visibleEvents) {
    const m = new Map(resultsByEvent[et].map((r) => [r.driver_id, r.actual_position]));
    actualPos.set(et, m);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
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
    <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: F1.cardShadow }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${F1.gridLine}` }}>
        <p className="font-bold text-sm" style={{ color: F1.carbon }}>
          League · this race
        </p>
        <p className="mt-0.5 text-xs" style={{ color: F1.carbonLight }}>
          Tap a player to see picks (revealed after session locks)
        </p>
      </div>
      <div>
        {sorted.map((player, i) => {
          const isMe = player.userId === currentUserId;
          const weekend = visibleEvents.reduce((s, et) => s + (player.scores[et] ?? 0), 0);
          const open = expanded.has(player.userId);

          return (
            <div key={player.userId} style={{ borderTop: `1px solid ${F1.gridLine}` }}>
              <button
                type="button"
                onClick={() => toggle(player.userId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition active:opacity-80"
                style={
                  isMe
                    ? { background: F1.redLight, borderLeft: `3px solid ${F1.red}` }
                    : { background: F1.white }
                }
              >
                <span
                  className="w-5 shrink-0 text-xs font-bold tabular-nums"
                  style={{ color: i < 3 ? F1.podium[i] : F1.carbonLight }}
                >
                  {i + 1}
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-semibold"
                  style={{ color: F1.carbon }}
                >
                  {player.userName}
                  {isMe && (
                    <span className="ml-1.5 text-xs font-bold" style={{ color: F1.red }}>
                      (you)
                    </span>
                  )}
                </span>
                <div className="hidden items-center gap-3 text-xs sm:flex" style={{ color: F1.carbonLight }}>
                  {visibleEvents.map((et) => (
                    <span key={et}>
                      {labels[et][0]}:{" "}
                      <span className="font-semibold" style={{ color: F1.carbon }}>
                        {player.scores[et] ?? "—"}
                      </span>
                    </span>
                  ))}
                </div>
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums" style={{ color: F1.red }}>
                  {weekend}pt
                </span>
                <span className="w-3 shrink-0 text-xs" style={{ color: F1.carbonLight }}>
                  {open ? "▲" : "▼"}
                </span>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1" style={{ background: F1.offWhite }}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleEvents
                      .filter((et) => sessionLocked[et])
                      .map((et) => {
                        const eventPicks = player.picks
                          .filter((p) => (p.eventType ?? et) === et)
                          .sort((a, b) => a.predictedPos - b.predictedPos);
                        const aPosMap = actualPos.get(et) ?? new Map();
                        if (!eventPicks.length) return null;
                        return (
                          <div key={et}>
                            <p
                              className="mb-1.5 text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: F1.carbonMid }}
                            >
                              {labels[et]}
                            </p>
                            <div className="space-y-1">
                              {eventPicks.map((p) => {
                                const actual = aPosMap.get(p.driverId) ?? null;
                                const exact = actual !== null && actual === p.predictedPos;
                                return (
                                  <div key={p.predictedPos} className="flex items-center gap-2 text-xs">
                                    <span className="w-5 font-mono" style={{ color: F1.carbonLight }}>
                                      P{p.predictedPos}
                                    </span>
                                    <span style={{ color: exact ? EXACT_TEXT : F1.carbon }}>
                                      {p.driverName.split(" ").pop()}
                                    </span>
                                    {actual !== null && (
                                      <span
                                        className="ml-auto font-mono font-semibold"
                                        style={{ color: exact ? EXACT_TEXT : F1.carbonMid }}
                                      >
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
    </section>
  );
}

export function RaceWeekendResults({
  races,
  selectedRace,
  resultsByEvent,
  myPicks,
  myScores,
  leaguePlayers,
  currentUserId
}: Props) {
  const sprintWeekend = isSprintWeekend(selectedRace);
  const now = new Date();

  const sessionLocked: Record<TabId, boolean> = {
    quali: new Date(selectedRace.quali_start) <= now || resultsByEvent.quali.length > 0,
    sprint:
      sprintWeekend && selectedRace.sprint_start
        ? new Date(selectedRace.sprint_start) <= now || resultsByEvent.sprint.length > 0
        : false,
    race: new Date(selectedRace.race_start) <= now || resultsByEvent.race.length > 0
  };

  const driverNames = new Map<string, { name: string; team: string }>();
  for (const et of ["quali", "sprint", "race"] as TabId[]) {
    for (const r of resultsByEvent[et]) {
      if (r.driver_name && r.driver_name !== r.driver_id) {
        driverNames.set(r.driver_id, { name: r.driver_name, team: r.driver_team });
      }
    }
  }
  for (const player of leaguePlayers) {
    for (const pick of player.picks) {
      if (
        !driverNames.has(pick.driverId) &&
        pick.driverName &&
        pick.driverName !== pick.driverId &&
        !pick.driverName.startsWith("#")
      ) {
        driverNames.set(pick.driverId, { name: pick.driverName, team: "" });
      }
    }
  }

  const weekendTotal = (["quali", "sprint", "race"] as TabId[]).reduce(
    (s, et) => s + (myScores[et]?.points ?? 0),
    0
  );
  const weekendExact = (["quali", "sprint", "race"] as TabId[]).reduce(
    (s, et) => s + (myScores[et]?.exact ?? 0),
    0
  );

  const raceDate = new Date(selectedRace.race_start).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const sessionsScored = (["quali", "sprint", "race"] as TabId[]).filter(
    (et) => (myScores[et]?.points ?? 0) > 0
  ).length;

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
          {selectedRace.grand_prix}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Weekend results</h1>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-white/60">{raceDate}</p>
            {sprintWeekend && (
              <p className="mt-1 text-xs font-medium" style={{ color: F1.red }}>
                Sprint weekend
              </p>
            )}
            {sessionsScored > 0 && (
              <p className="mt-2 text-xs text-white/50">
                {sessionsScored} session{sessionsScored !== 1 ? "s" : ""} scored
              </p>
            )}
          </div>
          {weekendTotal > 0 ? (
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-white/60">Your score</p>
              <p className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: F1.red }}>
                {weekendTotal}
                <span className="ml-1 text-lg font-semibold text-white/80">pts</span>
              </p>
              {weekendExact > 0 && (
                <p className="mt-0.5 text-xs font-medium text-emerald-400">{weekendExact} exact hits</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/50">No points scored yet</p>
          )}
        </div>
      </div>

      {/* Race selector */}
      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
          Select race
        </p>
        <ResultsRaceSelector races={races} selectedRaceId={selectedRace.id} />
      </section>

      {/* Session cards */}
      <div className={`grid gap-4 ${sprintWeekend ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {[
          { eventType: "quali" as TabId, label: "Qualifying", iso: selectedRace.quali_start, show: true },
          {
            eventType: "sprint" as TabId,
            label: "Sprint",
            iso: selectedRace.sprint_start ?? "",
            show: sprintWeekend && !!selectedRace.sprint_start
          },
          { eventType: "race" as TabId, label: "Race", iso: selectedRace.race_start, show: true }
        ]
          .filter((s) => s.show)
          .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())
          .map(({ eventType, label }) => (
            <SessionCard
              key={eventType}
              eventType={eventType}
              label={label}
              results={resultsByEvent[eventType]}
              myPicks={myPicks[eventType]}
              myScore={myScores[eventType]}
              sessionLocked={sessionLocked[eventType]}
              driverNames={driverNames}
              hasSprint={sprintWeekend}
            />
          ))}
      </div>

      <LeagueTable
        players={leaguePlayers}
        resultsByEvent={resultsByEvent}
        hasSprint={sprintWeekend}
        sessionLocked={sessionLocked}
        currentUserId={currentUserId}
      />
    </>
  );
}
