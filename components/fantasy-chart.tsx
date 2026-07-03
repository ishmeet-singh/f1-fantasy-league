"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { F1 } from "@/lib/f1-theme";
import {
  progressiveStandingScores,
  raceStartMapFromWeekends
} from "@/lib/season-standings";
import type { PointsHistoryEntry } from "@/lib/data";

const PLAYER_COLORS = [
  F1.red,
  F1.carbonMid,
  F1.carbonLight,
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#14b8a6"
];

export function FantasyChart({
  history,
  currentUserId
}: {
  history: PointsHistoryEntry[];
  currentUserId: string | null;
}) {
  if (!history.length || !history[0]?.races.length) {
    return (
      <div
        className="flex h-40 items-center justify-center text-sm"
        style={{ color: F1.carbonLight }}
      >
        Points chart will appear after the first race
      </div>
    );
  }

  const completedRaces = history[0].races.filter((r) => r.points !== null);
  if (!completedRaces.length) {
    return (
      <div
        className="flex h-40 items-center justify-center text-sm"
        style={{ color: F1.carbonLight }}
      >
        Points chart will appear after the first race
      </div>
    );
  }

  const raceOrder = completedRaces.map((r) => r.raceId);
  const raceStartById = raceStartMapFromWeekends(
    completedRaces.map((r) => ({ id: r.raceId, race_start: r.raceStart }))
  );

  const chartData = completedRaces.map((race, raceIdx) => {
    const point: Record<string, string | number> = { race: raceShortLabel(race.raceName) };
    for (const player of history) {
      const weekends = player.races
        .slice(0, raceIdx + 1)
        .filter((r) => r.points !== null)
        .map((r) => ({
          race_id: r.raceId,
          total_points: r.points
        }));
      const scores = progressiveStandingScores(weekends, raceOrder.slice(0, raceIdx + 1), raceStartById);
      point[player.userName] = scores[scores.length - 1] ?? 0;
    }
    return point;
  });

  const sorted = [...history].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    const aWeekends = a.races
      .filter((r) => r.points !== null)
      .map((r) => ({ race_id: r.raceId, total_points: r.points }));
    const bWeekends = b.races
      .filter((r) => r.points !== null)
      .map((r) => ({ race_id: r.raceId, total_points: r.points }));
    const aFinal = progressiveStandingScores(aWeekends, raceOrder, raceStartById).at(-1) ?? 0;
    const bFinal = progressiveStandingScores(bWeekends, raceOrder, raceStartById).at(-1) ?? 0;
    return bFinal - aFinal;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={F1.gridLine} />
        <XAxis
          dataKey="race"
          tick={{ fill: F1.carbonLight, fontSize: 10 }}
          axisLine={{ stroke: F1.gridLine }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: F1.carbonLight, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: F1.white,
            border: `1px solid ${F1.gridLine}`,
            borderRadius: "8px",
            color: F1.carbon
          }}
          labelStyle={{ color: F1.carbonMid, fontSize: 12 }}
          itemStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: F1.carbonMid, paddingTop: 8 }} />
        {sorted.map((player, i) => (
          <Line
            key={player.userId}
            type="monotone"
            dataKey={player.userName}
            stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
            strokeWidth={player.userId === currentUserId ? 2.5 : 1.5}
            dot={{ r: 3, fill: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function raceShortLabel(name: string) {
  return name.replace(/\s*Grand Prix\s*/gi, "").trim().slice(0, 8);
}
