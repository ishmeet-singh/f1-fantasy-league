import { DriverPrediction, DriverResult, EventType } from "@/lib/types";

type Config = { max: number; penalty: number; podiumBonus: number; podiumSize: number };

const config: Record<EventType, Config> = {
  quali: { max: 12, penalty: 4, podiumBonus: 6, podiumSize: 3 },
  sprint: { max: 10, penalty: 2, podiumBonus: 10, podiumSize: 3 },
  race: { max: 12, penalty: 2, podiumBonus: 10, podiumSize: 3 }
};

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
  results: DriverResult[]
): EventScoreResult {
  const cfg = config[eventType];
  const resultMap = new Map(results.map((r) => [r.driver_id, r.actual_position]));

  let points = 0;
  let totalError = 0;
  let exactMatches = 0;

  for (const p of predictions) {
    const actual = resultMap.get(p.driver_id) ?? fallbackPos;
    const diff = Math.abs(p.predicted_position - actual);
    totalError += diff;
    if (diff === 0) exactMatches += 1;
    points += Math.max(0, cfg.max - diff * cfg.penalty);
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
