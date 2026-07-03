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

export function DesignBPreview() {
  const [screen, setScreen] = usePreviewScreen();

  return (
    <div className="min-h-full bg-[#fafafa] pb-12">
      <PreviewScreenNav design="Pit Wall" screen={screen} onScreen={setScreen} />

      {screen === "dashboard" ? (
        <div className="mx-auto max-w-lg px-4 pt-5">
          <p className="text-sm text-zinc-500">Season {SEASON.past} of {SEASON.total}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>

          {/* Leaderboard */}
          <section className="mt-8">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium text-zinc-900">Leaderboard</h2>
              <p className="text-right text-xs text-zinc-400 leading-snug">{STANDINGS_SUBTITLE}</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                    <th className="px-3 py-2 font-medium w-10">#</th>
                    <th className="px-3 py-2 font-medium">Player</th>
                    <th className="px-3 py-2 font-medium text-right w-16">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {LEADERBOARD.map((p) => (
                    <tr key={p.id} className={p.isYou ? "bg-red-50/60" : "border-t border-zinc-50"}>
                      <td className="px-3 py-3 tabular-nums text-zinc-400">{p.rank}</td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-zinc-900">
                          {p.name}
                          {p.isYou && (
                            <span className="ml-1.5 text-xs font-normal text-red-600">you</span>
                          )}
                        </span>
                        <span className="block text-xs text-zinc-400">{p.exact} exact hits</span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-zinc-900">
                        {p.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded — structured list not flex-wrap */}
            {LEADERBOARD.filter((p) => p.isYou).map((p) => (
              <div key={p.id} className="mt-4 rounded-lg border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900">Your race scores</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.racesCounting} counting · {p.racesDropped} dropped
                  </p>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {p.races.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        r.dropped ? "bg-zinc-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-12 shrink-0 text-xs font-medium ${
                            r.dropped ? "text-zinc-400" : "text-zinc-500"
                          }`}
                        >
                          {r.name}
                        </span>
                        {r.dropped && (
                          <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                            dropped
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 tabular-nums text-sm font-semibold ${
                          r.dropped ? "text-zinc-400 line-through" : "text-zinc-900"
                        }`}
                      >
                        {r.points}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-3">
                  <span className="text-xs font-medium text-zinc-500">Season total</span>
                  <span className="text-base font-semibold tabular-nums">{p.score} pts</span>
                </div>
              </div>
            ))}
          </section>

          {/* Chart */}
          <section className="mt-10">
            <h2 className="text-sm font-medium text-zinc-900">Points progression</h2>
            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4">
              <MiniLineChart races={CHART_RACES} lines={CHART_LINES} />
            </div>
          </section>

          {/* Next race */}
          <section className="mt-10 mb-4">
            <h2 className="text-sm font-medium text-zinc-900">Next race</h2>
            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-lg font-semibold text-zinc-900">{NEXT_RACE.grandPrix}</p>
              <p className="text-sm text-zinc-500">{NEXT_RACE.circuit}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-400">Qualifying</dt>
                  <dd className="font-medium">{NEXT_RACE.quali}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Race</dt>
                  <dd className="font-medium">{NEXT_RACE.race}</dd>
                </div>
              </dl>
              <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
                {NEXT_RACE.countdown}
              </p>
              {NEXT_RACE.picksSubmitted && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Picks submitted
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <PicksScreenB />
      )}
    </div>
  );
}

function PicksScreenB() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-5">
      <p className="text-sm text-zinc-500">British Grand Prix</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Qualifying picks</h1>
      <p className="mt-1 text-sm text-zinc-500">Predict P1, P2, P3</p>

      <ol className="mt-8 space-y-0 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {[1, 2, 3].map((pos) => (
          <li key={pos} className="flex items-center gap-4 px-4 py-3">
            <span className="w-6 text-center text-sm font-medium text-zinc-400">{pos}</span>
            <span className="flex-1 text-base font-medium text-zinc-900">
              {QUALI_PICKS[pos - 1] ?? (
                <span className="text-zinc-300 font-normal">Select driver</span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-8 text-sm font-medium text-zinc-900">Drivers</h2>
      <ul className="mt-3 space-y-1">
        {PICK_DRIVERS.map((d) => {
          const active = QUALI_PICKS.includes(d.name);
          return (
            <li key={d.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-red-50 text-red-900 ring-1 ring-red-200"
                    : "hover:bg-zinc-100 text-zinc-800"
                }`}
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-zinc-400">{d.team}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
