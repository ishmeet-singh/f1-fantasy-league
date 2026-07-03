"use client";

import { useCallback, useState } from "react";
import type { LeaderboardEntry, PointsHistoryEntry } from "@/lib/data";
import { F1 } from "@/lib/f1-theme";
import { raceShortCode } from "@/lib/race-short-code";

export function LeaderboardFull({
  leaderboard,
  history,
  currentUserId
}: {
  leaderboard: LeaderboardEntry[];
  history: PointsHistoryEntry[];
  currentUserId: string | null;
}) {
  const [openById, setOpenById] = useState<Record<string, boolean>>(() => {
    if (!currentUserId) return {};
    const onBoard = leaderboard.some((e) => e.id === currentUserId);
    return onBoard ? { [currentUserId]: true } : {};
  });

  const historyByUser = new Map(history.map((h) => [h.userId, h]));

  const toggle = useCallback((id: string) => {
    setOpenById((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  if (!leaderboard.length) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: F1.carbonLight }}>
        No scores yet — picks start appearing here after the first race.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {leaderboard.map((entry, i) => {
        const isMe = entry.id === currentUserId;
        const playerHistory = historyByUser.get(entry.id);
        const hasRaces = Boolean(playerHistory?.races.length);
        const open = Boolean(openById[entry.id]);

        return (
          <li key={entry.id}>
            <button
              type="button"
              disabled={!hasRaces}
              onClick={hasRaces ? () => toggle(entry.id) : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-opacity ${
                hasRaces ? "cursor-pointer active:opacity-80" : "cursor-default"
              }`}
              style={{
                background: isMe ? F1.redLight : F1.offWhite,
                boxShadow: isMe ? `inset 0 0 0 2px ${F1.red}` : undefined
              }}
              aria-expanded={hasRaces ? open : undefined}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  background: i < 3 ? F1.podium[i] : F1.carbonMid,
                  color: i === 0 ? F1.carbon : "#fff"
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" style={{ color: F1.carbon }}>
                  {entry.name}
                  {isMe && (
                    <span className="ml-1.5 text-xs font-bold uppercase" style={{ color: F1.red }}>
                      you
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums" style={{ color: F1.carbon }}>
                  {entry.score}
                </p>
                <p
                  className="text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: F1.carbonLight }}
                >
                  pts
                </p>
              </div>
              {hasRaces && (
                <span className="shrink-0 px-1 text-xs" style={{ color: F1.carbonLight }} aria-hidden>
                  {open ? "▲" : "▼"}
                </span>
              )}
            </button>

            {open && playerHistory && hasRaces && (
              <WeekendTiles
                entry={entry}
                races={playerHistory.races}
                isMe={isMe}
                onClose={() => toggle(entry.id)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function WeekendTiles({
  entry,
  races,
  isMe,
  onClose
}: {
  entry: LeaderboardEntry;
  races: PointsHistoryEntry["races"];
  isMe: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="mt-3 rounded-xl p-3"
      style={{
        background: F1.offWhite,
        border: `1px solid ${F1.gridLine}`
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
          {isMe ? "Your weekends" : `${entry.name}'s weekends`}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {entry.racesCounting > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ background: F1.carbon }}
            >
              {entry.racesCounting} counting
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: F1.carbonMid, background: F1.white, border: `1px solid ${F1.gridLine}` }}
          >
            Close
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {races.map((r) => (
          <div
            key={r.raceId}
            className="rounded-lg p-2 text-center"
            style={{
              background: r.dropped ? "#EEE" : F1.white,
              border: r.dropped ? `1px dashed ${F1.carbonLight}` : `1px solid ${F1.gridLine}`,
              opacity: r.dropped ? 0.65 : 1
            }}
          >
            <p
              className={`text-[10px] font-bold ${r.dropped ? "line-through" : ""}`}
              style={{ color: r.dropped ? F1.carbonLight : F1.carbonMid }}
              title={r.raceName}
            >
              {raceShortCode(r.raceName)}
            </p>
            <p
              className={`mt-0.5 text-sm font-bold tabular-nums ${r.dropped ? "line-through" : ""}`}
              style={{ color: r.dropped ? F1.carbonLight : F1.carbon }}
            >
              {r.points === null ? "—" : r.points}
            </p>
            {r.dropped && (
              <p className="mt-0.5 text-[8px] font-bold uppercase" style={{ color: F1.red }}>
                drop
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs" style={{ color: F1.carbonLight }}>
        Season total{" "}
        <span className="font-bold" style={{ color: F1.red }}>
          {entry.score} pts
        </span>
      </p>
    </div>
  );
}
