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

const PODIUM_COLORS = ["#EAB308", "#94A3B8", "#D97706"];

export function DesignCPreview() {
  const [screen, setScreen] = usePreviewScreen();

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white pb-12">
      <PreviewScreenNav design="Grid Chicane" screen={screen} onScreen={setScreen} />

      {screen === "dashboard" ? (
        <div className="mx-auto max-w-lg">
          {/* Hero gradient header */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-red-900 px-4 pt-6 pb-8 text-white rounded-b-3xl shadow-lg">
            <p className="text-xs font-medium text-red-200/90">F1 Friends League</p>
            <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400"
                  style={{ width: `${(SEASON.past / SEASON.total) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-white/80">
                {SEASON.past}/{SEASON.total}
              </span>
            </div>
          </div>

          <div className="px-4 -mt-4">
            {/* Leaderboard cards */}
            <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5">
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-900">Leaderboard</h2>
                <p className="mt-1 text-xs text-slate-500">{STANDINGS_SUBTITLE}</p>
              </div>

              <ul className="space-y-2">
                {LEADERBOARD.map((p, i) => (
                  <li key={p.id}>
                    <div
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                        p.isYou
                          ? "bg-red-50 ring-2 ring-red-200"
                          : "bg-slate-50"
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{
                          background:
                            i < 3 ? PODIUM_COLORS[i] : "linear-gradient(135deg,#64748b,#475569)"
                        }}
                      >
                        {p.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {p.name}
                          {p.isYou && (
                            <span className="ml-1 text-xs font-normal text-red-600">· you</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{p.exact} exact</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums text-slate-900">{p.score}</p>
                        <p className="text-[10px] text-slate-400">pts</p>
                      </div>
                    </div>

                    {p.isYou && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Your weekends
                          </p>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            {p.racesCounting} count
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {p.races.map((r) => (
                            <div
                              key={r.id}
                              className={`rounded-lg p-2 text-center ${
                                r.dropped
                                  ? "bg-slate-200/60 opacity-60"
                                  : "bg-white shadow-sm ring-1 ring-slate-200/60"
                              }`}
                            >
                              <p
                                className={`text-[10px] font-semibold ${
                                  r.dropped ? "text-slate-400 line-through" : "text-slate-600"
                                }`}
                              >
                                {r.short}
                              </p>
                              <p
                                className={`mt-0.5 text-sm font-bold tabular-nums ${
                                  r.dropped ? "text-slate-400 line-through" : "text-slate-900"
                                }`}
                              >
                                {r.points}
                              </p>
                              {r.dropped && (
                                <p className="mt-0.5 text-[8px] font-bold uppercase text-slate-400">
                                  drop
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-500">
                          Season total{" "}
                          <span className="font-bold text-slate-900">{p.score} pts</span>
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Chart */}
            <section className="mt-5 rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5">
              <h2 className="text-base font-bold text-slate-900">Progression</h2>
              <MiniLineChart races={CHART_RACES} lines={CHART_LINES} className="mt-3" />
            </section>

            {/* Next race */}
            <section className="mt-5 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-100">
                  Next race
                </p>
              </div>
              <div className="bg-white px-4 py-4">
                <p className="text-lg font-bold text-slate-900">{NEXT_RACE.grandPrix}</p>
                <p className="text-sm text-slate-500">{NEXT_RACE.circuit}</p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Quali {NEXT_RACE.quali}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Race {NEXT_RACE.race}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold tabular-nums text-red-600">
                  {NEXT_RACE.countdown}
                </p>
                {NEXT_RACE.picksSubmitted && (
                  <p className="mt-2 text-sm font-medium text-emerald-600">✓ Picks locked in</p>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <PicksScreenC />
      )}
    </div>
  );
}

function PicksScreenC() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-5 text-white">
        <p className="text-xs text-slate-300">British Grand Prix</p>
        <h1 className="mt-1 text-xl font-bold">Qualifying picks</h1>
      </div>

      <div className="mt-5 space-y-2">
        {[1, 2, 3].map((pos) => (
          <div
            key={pos}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: PODIUM_COLORS[pos - 1] ?? "#64748b" }}
            >
              P{pos}
            </span>
            <span className="text-base font-semibold text-slate-900">
              {QUALI_PICKS[pos - 1] ?? "Tap a driver below"}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm font-semibold text-slate-700">Driver pool</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PICK_DRIVERS.map((d) => {
          const picked = QUALI_PICKS.includes(d.name);
          return (
            <button
              key={d.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                picked
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-red-300"
              }`}
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
