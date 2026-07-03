"use client";

import { useState } from "react";
import { F1 } from "@/lib/f1-theme";

type Pick = { predictedPos: number; driverId: string; driverName: string };
type Player = { userId: string; userName: string; isMe: boolean; picks: Pick[] };
type ActualResult = { driverId: string; actualPos: number };

type Props = {
  players: Player[];
  results?: ActualResult[];
  defaultOpen?: boolean;
  variant?: "default" | "chicane";
};

export function LeaguePicks({
  players,
  results = [],
  defaultOpen = false,
  variant = "default"
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const chicane = variant === "chicane";

  const actualPos = new Map(results.map((r) => [r.driverId, r.actualPos]));
  const hasResults = results.length > 0;

  if (players.length === 0) return null;

  return (
    <div
      className={`overflow-hidden rounded-xl border ${chicane ? "" : "border-slate-800"}`}
      style={chicane ? { borderColor: F1.gridLine, background: F1.white } : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          chicane
            ? "flex w-full items-center justify-between px-4 py-3 text-sm transition active:opacity-80"
            : "flex w-full items-center justify-between bg-slate-900 px-4 py-3 text-sm transition-colors hover:bg-slate-800/60"
        }
        style={chicane ? { background: F1.offWhite, color: F1.carbon } : undefined}
      >
        <span className={chicane ? "font-semibold" : "font-medium text-slate-300"}>
          Everyone&apos;s picks
          <span
            className={`ml-2 text-xs font-normal ${chicane ? "" : "text-slate-500"}`}
            style={chicane ? { color: F1.carbonLight } : undefined}
          >
            {players.length} {players.length === 1 ? "player" : "players"}
          </span>
        </span>
        <span
          className={`text-xs ${chicane ? "" : "text-slate-500"}`}
          style={chicane ? { color: F1.carbonLight } : undefined}
        >
          {open ? "▲ hide" : "▼ show"}
        </span>
      </button>

      {open && (
        <div className={chicane ? "divide-y" : "divide-y divide-slate-800/60"}>
          {players.map((player) => (
            <div
              key={player.userId}
              className="space-y-2 px-4 py-3"
              style={
                chicane && player.isMe
                  ? { background: F1.redLight, borderLeft: `3px solid ${F1.red}` }
                  : !chicane && player.isMe
                    ? { background: "rgba(127,29,29,0.2)" }
                    : undefined
              }
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  !chicane && player.isMe ? "text-red-300" : !chicane ? "text-slate-400" : ""
                }`}
                style={chicane ? { color: player.isMe ? F1.red : F1.carbonMid } : undefined}
              >
                {player.userName}
                {player.isMe && (
                  <span
                    className={`ml-1.5 font-normal normal-case ${chicane ? "" : "text-red-400/70"}`}
                    style={chicane ? { color: F1.carbonLight } : undefined}
                  >
                    (you)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {player.picks
                  .sort((a, b) => a.predictedPos - b.predictedPos)
                  .map((p) => {
                    const actual = actualPos.get(p.driverId) ?? null;
                    const exact = actual !== null && actual === p.predictedPos;
                    const lastName = p.driverName.split(" ").pop() ?? p.driverName;

                    let chipClass = "";
                    let chipStyle: React.CSSProperties | undefined;
                    if (chicane) {
                      chipStyle = exact
                        ? { background: "#ECFDF5", borderColor: "#86EFAC", color: "#166534" }
                        : hasResults && actual !== null
                          ? { background: F1.offWhite, borderColor: F1.gridLine, color: F1.carbonLight }
                          : { background: F1.white, borderColor: F1.gridLine, color: F1.carbon };
                    } else {
                      chipClass = exact
                        ? "bg-emerald-900/40 border-emerald-800/50 text-emerald-300"
                        : hasResults && actual !== null
                          ? "bg-slate-800/60 border-slate-700 text-slate-400"
                          : "bg-slate-800 border-slate-700 text-slate-300";
                    }

                    return (
                      <span
                        key={p.predictedPos}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${chipClass}`}
                        style={chipStyle}
                      >
                        <span className={chicane ? "font-mono" : "font-mono text-slate-500"}>
                          P{p.predictedPos}
                        </span>
                        <span>{lastName}</span>
                        {exact && <span>✓</span>}
                        {hasResults && !exact && actual !== null && (
                          <span className={chicane ? "" : "text-slate-500"} style={chicane ? { color: F1.carbonLight } : undefined}>
                            →P{actual}
                          </span>
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
