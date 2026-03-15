import { DriverPrediction, DriverResult, EventType } from "@/lib/types";

type Config = { max: number; penalty: number; podiumBonus: number; podiumSize: number };

// Normal weekend configs (quali + race only)
const normalConfig: Record<EventType, Config> = {
  quali:       { max: 12, penalty: 4, podiumBonus: 6,  podiumSize: 3 },
  sprint_quali: { max: 12, penalty: 4, podiumBonus: 6,  podiumSize: 3 }, // unused on normal weekends
  sprint:      { max: 6,  penalty: 1, podiumBonus: 5,  podiumSize: 3 }, // unused on normal weekends
  race:        { max: 12, penalty: 2, podiumBonus: 10, podiumSize: 3 }
};

// Sprint weekend configs — normalized so total max = normal weekend total (156 pts base)
// Math: 3(2x) + 3(x) + 10(y) + 10(2y) = 156 → x=4, y=4
// quali(3×8) + sprint_quali(3×4) + sprint(10×4) + race(10×8) = 24+12+40+80 = 156 ✓
const sprintWeekendConfig: Record<EventType, Config> = {
  quali:        { max: 8, penalty: 2, podiumBonus: 4,  podiumSize: 3 },
  sprint_quali: { max: 4, penalty: 1, podiumBonus: 2,  podiumSize: 3 },
  sprint:       { max: 4, penalty: 1, podiumBonus: 2,  podiumSize: 3 },
  race:         { max: 8, penalty: 1, podiumBonus: 6,  podiumSize: 3 }
};

export const DNF_PENALTY = -5;

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
  const cfg = hasSprint ? sprintWeekendConfig[eventType] : normalConfig[eventType];
  const resultMap = new Map(results.map((r) => [r.driver_id, r.actual_position]));

  let points = 0;
  let totalError = 0;
  let exactMatches = 0;

  for (const p of predictions) {
    const isDnf = !resultMap.has(p.driver_id);
    const actual = resultMap.get(p.driver_id) ?? fallbackPos;
    const diff = Math.abs(p.predicted_position - actual);
    totalError += diff;
    if (diff === 0) exactMatches += 1;
    let pts = Math.max(0, cfg.max - diff * cfg.penalty);
    if (isDnf) pts += DNF_PENALTY; // -5, can go negative
    points += pts;
  }

  const podiumExact = [1, 2, 3].every((position) => {
    const predicted = predictions.find((p) => p.predicted_position === position)?.driver_id;
    const actual = results.find((r) => r.actual_position === position)?.driver_id;
    return predicted && actual && predicted === actual;
  });

  if (podiumExact) points += cfg.podiumBonus;

  return { points, totalError, exactMatches, podiumExact };
}

export function bestNWeekendTotal(weekendTotals: number[], bestCount = 20) {
  return weekendTotals
    .slice()
    .sort((a, b) => b - a)
    .slice(0, bestCount)
    .reduce((acc, value) => acc + value, 0);
}
