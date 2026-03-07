"use client";

import { useState } from "react";

type Pick = { predictedPos: number; driverId: string; driverName: string };
type Player = { userId: string; userName: string; isMe: boolean; picks: Pick[] };
type ActualResult = { driverId: string; actualPos: number };

type Props = {
  players: Player[];
  results?: ActualResult[]; // present only after session ends
  defaultOpen?: boolean;
};

export function LeaguePicks({ players, results = [], defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const actualPos = new Map(results.map((r) => [r.driverId, r.actualPos]));
  const hasResults = results.length > 0;

  if (players.length === 0) return null;

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm bg-slate-900 hover:bg-slate-800/60 transition-colors"
      >
        <span className="font-medium text-slate-300">
          Everyone&apos;s picks
          <span className="ml-2 text-xs text-slate-500 font-normal">
            {players.length} {players.length === 1 ? "player" : "players"}
          </span>
        </span>
        <span className="text-slate-500 text-xs">{open ? "▲ hide" : "▼ show"}</span>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="divide-y divide-slate-800/60">
          {players.map((player) => (
            <div
              key={player.userId}
              className={`px-4 py-3 space-y-2 ${player.isMe ? "bg-red-950/20" : ""}`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${player.isMe ? "text-red-300" : "text-slate-400"}`}>
                {player.userName}
                {player.isMe && <span className="ml-1.5 normal-case font-normal text-red-400/70">(you)</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {player.picks
                  .sort((a, b) => a.predictedPos - b.predictedPos)
                  .map((p) => {
                    const actual = actualPos.get(p.driverId) ?? null;
                    const exact = actual !== null && actual === p.predictedPos;
                    const lastName = p.driverName.split(" ").pop() ?? p.driverName;
                    return (
                      <span
                        key={p.predictedPos}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                          exact
                            ? "bg-emerald-900/40 border-emerald-800/50 text-emerald-300"
                            : hasResults && actual !== null
                            ? "bg-slate-800/60 border-slate-700 text-slate-400"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}
                      >
                        <span className="text-slate-500 font-mono">P{p.predictedPos}</span>
                        <span>{lastName}</span>
                        {exact && <span>✓</span>}
                        {hasResults && !exact && actual !== null && (
                          <span className="text-slate-500">→P{actual}</span>
                        )}
                      </span>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
