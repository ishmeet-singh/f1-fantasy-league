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
import { raceShortCode } from "@/lib/race-short-code";
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

type ChartPoint = {
  raceCode: string;
  raceFull: string;
  [playerName: string]: string | number;
};

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

  const chartData: ChartPoint[] = completedRaces.map((race, raceIdx) => {
    const point: ChartPoint = {
      raceCode: raceShortCode(race.raceName),
      raceFull: race.raceName
    };
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

  const maxScore = Math.max(
    ...chartData.flatMap((row) =>
      sorted.map((p) => (typeof row[p.userName] === "number" ? (row[p.userName] as number) : 0))
    ),
    1
  );
  const yMax = Math.ceil(maxScore / 50) * 50;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={F1.gridLine} vertical={false} />
        <XAxis
          dataKey="raceCode"
          interval={0}
          tick={{ fill: F1.carbonMid, fontSize: 10, fontWeight: 600 }}
          axisLine={{ stroke: F1.gridLine }}
          tickLine={false}
          height={32}
          tickMargin={6}
        />
        <YAxis
          width={36}
          domain={[0, yMax]}
          tickCount={5}
          tick={{ fill: F1.carbonLight, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => String(v)}
        />
        <Tooltip
          contentStyle={{
            background: F1.white,
            border: `1px solid ${F1.gridLine}`,
            borderRadius: "8px",
            color: F1.carbon,
            fontSize: 12
          }}
          labelFormatter={(_, items) => {
            const row = items?.[0]?.payload as ChartPoint | undefined;
            return row?.raceFull ?? "";
          }}
          formatter={(value: number, name: string) => [`${value} pts`, name]}
        />
        <Legend
          iconType="plainline"
          iconSize={16}
          wrapperStyle={{ fontSize: 10, color: F1.carbonMid, paddingTop: 12, lineHeight: "18px" }}
        />
        {sorted.map((player, i) => {
          const isMe = player.userId === currentUserId;
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          return (
            <Line
              key={player.userId}
              type="linear"
              dataKey={player.userName}
              stroke={color}
              strokeWidth={isMe ? 2.5 : 1.25}
              strokeOpacity={isMe ? 1 : 0.5}
              dot={false}
              activeDot={isMe ? { r: 4, fill: color, stroke: F1.white, strokeWidth: 2 } : { r: 3, fill: color }}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
