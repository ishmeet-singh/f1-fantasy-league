"use client";

import { useState } from "react";
import type { LeaderboardEntry, PointsHistoryEntry } from "@/lib/data";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardFull({
  leaderboard,
  history,
  currentUserId
}: {
  leaderboard: LeaderboardEntry[];
  history: PointsHistoryEntry[];
  currentUserId: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const historyByUser = new Map(history.map(h => [h.userId, h]));

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  if (!leaderboard.length) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center">
        No scores yet — picks start appearing here after the first race.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {leaderboard.map((entry, i) => {
        const isMe = entry.id === currentUserId;
        const open = expanded.has(entry.id);
        const playerHistory = historyByUser.get(entry.id);

        return (
          <div key={entry.id} className={`rounded-xl overflow-hidden ${isMe ? "ring-1 ring-red-900/50" : ""}`}>
            {/* Main row */}
            <div
              className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                isMe
                  ? "bg-red-950/40 hover:bg-red-950/60"
                  : i % 2 === 0
                  ? "bg-slate-800/30 hover:bg-slate-800/50"
                  : "hover:bg-slate-800/30"
              }`}
              onClick={() => playerHistory?.races.length && toggle(entry.id)}
            >
              {/* Position */}
              <span className="w-7 text-center text-base leading-none shrink-0">
                {i < 3 ? MEDALS[i] : <span className="text-slate-500 text-xs font-mono">{i + 1}</span>}
              </span>

              {/* Name */}
              <span className={`flex-1 min-w-0 font-medium truncate ${isMe ? "text-white" : "text-slate-200"}`}>
                {entry.name}
                {isMe && <span className="ml-2 text-xs text-red-400 font-normal">(you)</span>}
              </span>

              {/* Exact hits */}
              <span className="text-slate-500 text-xs hidden sm:block shrink-0 w-16 text-right">
                {entry.exact} exact
              </span>

              {/* Points */}
              <span className="font-mono font-bold text-white shrink-0 w-16 text-right">
                {entry.score} <span className="text-slate-500 font-normal text-xs">pts</span>
              </span>

              {/* Expand toggle */}
              {playerHistory?.races.length ? (
                <span className="text-slate-500 text-xs shrink-0 w-4 text-right">
                  {open ? "▲" : "▼"}
                </span>
              ) : <span className="w-4 shrink-0" />}
            </div>

            {/* Expanded race history */}
            {open && playerHistory && (
              <div className={`px-4 pb-3 pt-1 ${isMe ? "bg-red-950/20" : "bg-slate-800/20"}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Points per race</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {playerHistory.races.map(r => (
                    <div key={r.raceId} className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">{r.raceName}</span>
                      <span className={`font-mono font-semibold ${
                        r.points === null ? "text-slate-700"
                        : r.points > 0 ? "text-white"
                        : "text-slate-600"
                      }`}>
                        {r.points === null ? "—" : `${r.points}pt`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between text-xs">
                  <span className="text-slate-500">Season total (best 20)</span>
                  <span className="font-bold text-white">{entry.score} pts</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
