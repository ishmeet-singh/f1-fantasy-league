import { DriverPrediction, DriverResult, EventType } from "@/lib/types";

type Config = { max: number; penalty: number; podiumBonus: number; podiumSize: number };

// Normal weekend (quali + race, or sprint weekend before sprint session scoring applied per-event)
const normalConfig: Record<EventType, Config> = {
  quali: { max: 12, penalty: 4, podiumBonus: 6, podiumSize: 3 },
  sprint: { max: 6, penalty: 1, podiumBonus: 5, podiumSize: 3 },
  race: { max: 12, penalty: 2, podiumBonus: 10, podiumSize: 3 }
};

// Sprint weekend — same 156 pick base, +16 podium, 172 max as normal weekends.
// Integer caps: quali 12×3 + sprint 4×10 + race 8×10 = 156; podiums +6 +3 +7 = 16.
// Race still has the highest session total (80 pick pts); quali matches normal quali.
const sprintWeekendConfig: Record<EventType, Config> = {
  quali: { max: 12, penalty: 4, podiumBonus: 6, podiumSize: 3 },
  sprint: { max: 4, penalty: 1, podiumBonus: 3, podiumSize: 3 },
  race: { max: 8, penalty: 2, podiumBonus: 7, podiumSize: 3 }
};

export function getEventConfig(eventType: EventType, hasSprint = false): Config {
  return hasSprint ? sprintWeekendConfig[eventType] : normalConfig[eventType];
}

/** Points for a single pick given position error (UI display). */
export function pointsForDiff(eventType: EventType, diff: number, hasSprint = false): number {
  const { max, penalty } = getEventConfig(eventType, hasSprint);
  return Math.max(0, max - diff * penalty);
}

export type EventScoreResult = {
  points: number;
  totalError: number;
  exactMatches: number;
  podiumExact: boolean;
};

const fallbackPos = 22; // 2026 season has 22 drivers

export function scoreEvent(
  eventType: EventType,
  predictions: DriverPrediction[],
  results: DriverResult[],
  hasSprint = false
): EventScoreResult {
  const cfg = getEventConfig(eventType, hasSprint);
  const resultMap = new Map(results.map((r) => [r.driver_id, r.actual_position]));

  let points = 0;
  let totalError = 0;
  let exactMatches = 0;

  for (const p of predictions) {
    const actual = resultMap.get(p.driver_id) ?? fallbackPos;
    const diff = Math.abs(p.predicted_position - actual);
    totalError += diff;
    if (diff === 0) exactMatches += 1;
    points += pointsForDiff(eventType, diff, hasSprint);
  }

  const podiumExact = [1, 2, 3].every((position) => {
    const predicted = predictions.find((p) => p.predicted_position === position)?.driver_id;
    const actual = results.find((r) => r.actual_position === position)?.driver_id;
    return predicted && actual && predicted === actual;
  });

  if (podiumExact) points += cfg.podiumBonus;

  return { points, totalError, exactMatches, podiumExact };
}

/** Season standings count only this many highest weekend totals (24 races − 2 cancelled in 2026). */
export const BEST_WEEKENDS_COUNT = 18;

/** Rows for rules UI: points per pick at each error distance. */
export function pickScoreRows(max: number, penalty: number): { label: string; points: number }[] {
  const rows: { label: string; points: number }[] = [];
  for (let diff = 0; diff <= 20; diff++) {
    const pts = Math.max(0, max - diff * penalty);
    if (pts === 0) {
      rows.push({ label: diff === 0 ? "Any error" : `Off by ${diff}+ places`, points: 0 });
      break;
    }
    rows.push({
      label: diff === 0 ? "Exact (off by 0)" : diff === 1 ? "Off by 1 place" : `Off by ${diff} places`,
      points: pts
    });
    if (Math.max(0, max - (diff + 1) * penalty) === 0) {
      rows.push({ label: `Off by ${diff + 1}+ places`, points: 0 });
      break;
    }
  }
  return rows;
}

export function bestNWeekendTotal(weekendTotals: number[], bestCount = BEST_WEEKENDS_COUNT) {
  return weekendTotals
    .slice()
    .sort((a, b) => b - a)
    .slice(0, bestCount)
    .reduce((acc, value) => acc + value, 0);
}
