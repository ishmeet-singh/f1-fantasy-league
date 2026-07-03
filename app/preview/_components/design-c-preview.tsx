"use client";

import {
  CHART_RACES,
  LEADERBOARD,
  NEXT_RACE,
  PICK_DRIVERS,
  QUALI_PICKS,
  SEASON,
  STANDINGS_SUBTITLE
} from "../_data/sample";
import { F1 } from "../_data/f1-theme";
import { AppBrand } from "@/components/f1-logo";
import { MiniLineChart, PreviewScreenNav, usePreviewScreen } from "./preview-shared";

const CHART_LINES_F1 = [
  { name: "Ishmeet", color: F1.red, values: [118, 222, 320, 412, 412, 412, 412, 412] },
  { name: "Arjun", color: F1.carbonMid, values: [110, 212, 307, 398, 398, 398, 398, 398] },
  { name: "Priya", color: F1.carbonLight, values: [108, 207, 298, 385, 385, 385, 385, 385] }
];

export function DesignCPreview() {
  const [screen, setScreen] = usePreviewScreen();

  return (
    <div className="min-h-full pb-12" style={{ background: F1.offWhite }}>
      <PreviewScreenNav design="Grid Chicane" screen={screen} onScreen={setScreen} accent="f1" />

      {screen === "dashboard" ? (
        <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
          {/* F1 header — contained card, no overlap */}
          <div
            className="relative overflow-hidden rounded-2xl px-4 py-5 text-white"
            style={{ background: F1.carbon, boxShadow: "0 4px 24px rgba(21,21,30,0.12)" }}
          >
            <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl" style={{ background: F1.red }} />
            <AppBrand theme="dark" logoHeight={28} />
            <h1 className="mt-3 text-xl font-bold tracking-tight">Dashboard</h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(SEASON.past / SEASON.total) * 100}%`,
                    background: F1.red
                  }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-white/70">
                {SEASON.past}/{SEASON.total}
              </span>
            </div>
          </div>

          {/* Leaderboard */}
          <section
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 4px 24px rgba(21,21,30,0.08)" }}
          >
              <div className="mb-4 flex items-start gap-2">
                <div className="mt-1 h-4 w-1 shrink-0 rounded-full" style={{ background: F1.red }} />
                <div>
                  <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
                    Leaderboard
                  </h2>
                  <p className="mt-0.5 text-xs" style={{ color: F1.carbonLight }}>
                    {STANDINGS_SUBTITLE}
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {LEADERBOARD.map((p, i) => (
                  <li key={p.id}>
                    <div
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        background: p.isYou ? F1.redLight : F1.offWhite,
                        boxShadow: p.isYou ? `inset 0 0 0 2px ${F1.red}` : undefined
                      }}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{
                          background:
                            i < 3 ? F1.podium[i] : F1.carbonMid,
                          color: i === 0 ? F1.carbon : "#fff"
                        }}
                      >
                        {p.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold" style={{ color: F1.carbon }}>
                          {p.name}
                          {p.isYou && (
                            <span
                              className="ml-1.5 text-xs font-bold uppercase"
                              style={{ color: F1.red }}
                            >
                              you
                            </span>
                          )}
                        </p>
                        <p className="text-xs" style={{ color: F1.carbonLight }}>
                          {p.exact} exact
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-lg font-bold tabular-nums"
                          style={{ color: F1.carbon }}
                        >
                          {p.score}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: F1.carbonLight }}>
                          pts
                        </p>
                      </div>
                    </div>

                    {p.isYou && (
                      <div
                        className="mt-3 rounded-xl p-3"
                        style={{ background: F1.offWhite, border: `1px solid ${F1.gridLine}` }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p
                            className="text-xs font-bold uppercase tracking-wide"
                            style={{ color: F1.carbonMid }}
                          >
                            Your weekends
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                            style={{ background: F1.carbon }}
                          >
                            {p.racesCounting} counting
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {p.races.map((r) => (
                            <div
                              key={r.id}
                              className="rounded-lg p-2 text-center"
                              style={{
                                background: r.dropped ? "#EEE" : F1.white,
                                border: r.dropped
                                  ? `1px dashed ${F1.carbonLight}`
                                  : `1px solid ${F1.gridLine}`,
                                opacity: r.dropped ? 0.65 : 1
                              }}
                            >
                              <p
                                className={`text-[10px] font-bold ${r.dropped ? "line-through" : ""}`}
                                style={{ color: r.dropped ? F1.carbonLight : F1.carbonMid }}
                              >
                                {r.short}
                              </p>
                              <p
                                className={`mt-0.5 text-sm font-bold tabular-nums ${r.dropped ? "line-through" : ""}`}
                                style={{ color: r.dropped ? F1.carbonLight : F1.carbon }}
                              >
                                {r.points}
                              </p>
                              {r.dropped && (
                                <p
                                  className="mt-0.5 text-[8px] font-bold uppercase"
                                  style={{ color: F1.red }}
                                >
                                  drop
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-center text-xs" style={{ color: F1.carbonLight }}>
                          Season total{" "}
                          <span className="font-bold" style={{ color: F1.red }}>
                            {p.score} pts
                          </span>
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

          {/* Chart */}
          <section
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 4px 24px rgba(21,21,30,0.08)" }}
          >
              <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
                Progression
              </h2>
              <MiniLineChart races={CHART_RACES} lines={CHART_LINES_F1} className="mt-3" />
            </section>

          {/* Next race */}
          <section
            className="overflow-hidden rounded-2xl"
            style={{ boxShadow: "0 4px 24px rgba(21,21,30,0.08)" }}
          >
              <div className="px-4 py-2.5" style={{ background: F1.red }}>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                  Next race
                </p>
              </div>
              <div className="bg-white px-4 py-4">
                <p className="text-lg font-bold" style={{ color: F1.carbon }}>
                  {NEXT_RACE.grandPrix}
                </p>
                <p className="text-sm" style={{ color: F1.carbonLight }}>
                  {NEXT_RACE.circuit}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: F1.offWhite, color: F1.carbon }}
                  >
                    Quali {NEXT_RACE.quali}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: F1.offWhite, color: F1.carbon }}
                  >
                    Race {NEXT_RACE.race}
                  </span>
                </div>
                <p
                  className="mt-4 text-3xl font-bold tabular-nums tracking-tight"
                  style={{ color: F1.red }}
                >
                  {NEXT_RACE.countdown}
                </p>
                {NEXT_RACE.picksSubmitted && (
                  <p className="mt-2 text-sm font-semibold" style={{ color: F1.carbonMid }}>
                    ✓ Picks locked in
                  </p>
                )}
              </div>
            </section>
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
      <div
        className="overflow-hidden rounded-2xl px-4 py-5 text-white"
        style={{ background: F1.carbon }}
      >
        <div className="mb-3 h-1 w-12 rounded-full" style={{ background: F1.red }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: F1.red }}>
          British Grand Prix
        </p>
        <h1 className="mt-1 text-xl font-bold">Qualifying picks</h1>
      </div>

      <div className="mt-5 space-y-2">
        {[1, 2, 3].map((pos) => (
          <div
            key={pos}
            className="flex items-center gap-3 rounded-2xl bg-white p-3"
            style={{ border: `1px solid ${F1.gridLine}` }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
              style={{
                background: F1.podium[pos - 1] ?? F1.carbonMid,
                color: pos === 1 ? F1.carbon : "#fff"
              }}
            >
              P{pos}
            </span>
            <span className="text-base font-semibold" style={{ color: F1.carbon }}>
              {QUALI_PICKS[pos - 1] ?? "Tap a driver below"}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
        Driver pool
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PICK_DRIVERS.map((d) => {
          const picked = QUALI_PICKS.includes(d.name);
          return (
            <button
              key={d.id}
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold transition"
              style={
                picked
                  ? { background: F1.red, color: "#fff", boxShadow: "0 2px 8px rgba(225,6,0,0.35)" }
                  : {
                      background: F1.white,
                      color: F1.carbon,
                      border: `1px solid ${F1.gridLine}`
                    }
              }
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
