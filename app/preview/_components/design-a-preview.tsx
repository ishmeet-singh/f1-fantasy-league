"use client";

import {
  CHART_LINES,
  CHART_RACES,
  LEADERBOARD,
  NEXT_RACE,
  PICK_DRIVERS,
  QUALI_PICKS,
  SEASON,
  STANDINGS_SUBTITLE
} from "../_data/sample";
import { MiniLineChart, PreviewScreenNav, usePreviewScreen } from "./preview-shared";

export function DesignAPreview() {
  const [screen, setScreen] = usePreviewScreen();

  return (
    <div className="min-h-full bg-zinc-100 pb-12">
      <PreviewScreenNav design="Timing Tower" screen={screen} onScreen={setScreen} />

      {screen === "dashboard" ? (
        <div className="mx-auto max-w-lg">
          {/* Broadcast header strip */}
          <div className="bg-zinc-900 px-4 py-3 text-white">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">
              <span>2026 Championship</span>
              <span>Live</span>
            </div>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight">F1 FRIENDS</p>
            <div className="mt-2 h-1 w-full bg-zinc-700">
              <div
                className="h-full bg-red-600"
                style={{ width: `${(SEASON.past / SEASON.total) * 100}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-400">
              RACE {SEASON.past}/{SEASON.total}
            </p>
          </div>

          {/* Leaderboard — timing tower */}
          <section className="mt-4 px-4">
            <div className="flex items-end justify-between border-b-2 border-zinc-900 pb-2">
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">
                Standings
              </h2>
              <p className="max-w-[55%] text-right font-mono text-[10px] leading-tight text-zinc-500">
                {STANDINGS_SUBTITLE}
              </p>
            </div>

            <ul className="divide-y divide-zinc-300">
              {LEADERBOARD.map((p) => (
                <li key={p.id}>
                  <div
                    className={`flex items-center gap-3 py-3 ${
                      p.isYou ? "bg-red-50 -mx-4 px-4 border-l-4 border-red-600" : ""
                    }`}
                  >
                    <span className="w-8 font-mono text-2xl font-black tabular-nums text-zinc-900">
                      {String(p.rank).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold uppercase tracking-wide text-zinc-900">
                        {p.name}
                        {p.isYou && (
                          <span className="ml-2 text-[10px] font-bold text-red-600">YOU</span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-zinc-500">{p.exact} exact</p>
                    </div>
                    <span className="font-mono text-xl font-black tabular-nums text-zinc-900">
                      {p.score}
                    </span>
                  </div>

                  {/* Expanded row — you */}
                  {p.isYou && (
                    <div className="mb-4 border border-zinc-900 bg-white p-3">
                      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Race breakdown
                      </p>
                      <div className="space-y-0">
                        {p.races.map((r) => (
                          <div
                            key={r.id}
                            className={`grid grid-cols-[3rem_1fr_auto] items-center gap-2 border-b border-zinc-100 py-2 last:border-0 ${
                              r.dropped ? "opacity-45" : ""
                            }`}
                          >
                            <span
                              className={`font-mono text-xs font-bold ${
                                r.dropped ? "text-zinc-400 line-through" : "text-zinc-700"
                              }`}
                            >
                              {r.short}
                            </span>
                            <span
                              className={`text-sm ${
                                r.dropped ? "text-zinc-400 line-through" : "text-zinc-800"
                              }`}
                            >
                              {r.name}
                              {r.dropped && (
                                <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-zinc-500">
                                  Drop
                                </span>
                              )}
                            </span>
                            <span
                              className={`font-mono text-sm font-bold tabular-nums ${
                                r.dropped ? "text-zinc-400 line-through" : "text-zinc-900"
                              }`}
                            >
                              {r.points}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t-2 border-zinc-900 pt-2 font-mono text-xs">
                        <span className="font-bold uppercase text-zinc-600">Season total</span>
                        <span className="text-lg font-black">{p.score} pts</span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Chart */}
          <section className="mt-6 px-4">
            <h2 className="border-b-2 border-zinc-900 pb-2 text-lg font-black uppercase tracking-tight">
              Progression
            </h2>
            <div className="mt-3 border border-zinc-900 bg-white p-3">
              <MiniLineChart races={CHART_RACES} lines={CHART_LINES} />
            </div>
          </section>

          {/* Next race */}
          <section className="mt-6 px-4">
            <div className="bg-zinc-900 p-4 text-white">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
                Next on track
              </p>
              <p className="mt-1 text-xl font-black uppercase">{NEXT_RACE.grandPrix}</p>
              <p className="font-mono text-sm text-zinc-400">{NEXT_RACE.circuit}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="border border-zinc-700 p-2">
                  <p className="text-zinc-500">QUALI</p>
                  <p className="font-bold">{NEXT_RACE.quali}</p>
                </div>
                <div className="border border-zinc-700 p-2">
                  <p className="text-zinc-500">RACE</p>
                  <p className="font-bold">{NEXT_RACE.race}</p>
                </div>
              </div>
              <p className="mt-3 font-mono text-2xl font-black text-red-500">{NEXT_RACE.countdown}</p>
              {NEXT_RACE.picksSubmitted && (
                <p className="mt-2 text-xs font-bold uppercase text-emerald-400">✓ Picks in</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <PicksScreenA />
      )}
    </div>
  );
}

function PicksScreenA() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="bg-zinc-900 px-4 py-3 text-white">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
          Qualifying · British GP
        </p>
        <p className="mt-1 font-mono text-sm text-zinc-400">Top 3 in order · P1 P2 P3</p>
      </div>

      <ol className="mt-4 space-y-2">
        {[1, 2, 3].map((pos) => (
          <li
            key={pos}
            className="flex items-center gap-3 border-2 border-zinc-900 bg-white px-3 py-3"
          >
            <span className="flex h-10 w-10 items-center justify-center bg-zinc-900 font-mono text-lg font-black text-white">
              P{pos}
            </span>
            <span className="flex-1 font-bold uppercase tracking-wide">
              {QUALI_PICKS[pos - 1] ?? "—"}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Driver pool
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {PICK_DRIVERS.map((d) => {
          const picked = QUALI_PICKS.includes(d.name);
          return (
            <button
              key={d.id}
              type="button"
              className={`border-2 px-3 py-2 text-left text-sm font-semibold transition ${
                picked
                  ? "border-red-600 bg-red-50 text-red-800"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900"
              }`}
            >
              {d.name}
              <span className="block font-mono text-[10px] font-normal text-zinc-500">{d.team}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
