"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

type PointsEntry = {
  userId: string;
  userName: string;
  races: { raceId: string; raceName: string; points: number | null }[];
};

const PLAYER_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"
];

export function FantasyChart({
  history,
  currentUserId
}: {
  history: PointsEntry[];
  currentUserId: string | null;
}) {
  if (!history.length || !history[0]?.races.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        Points chart will appear after the first race
      </div>
    );
  }

  // Build cumulative data: one object per race, each player has cumulative pts
  const completedRaces = history[0].races.filter(r => r.points !== null);
  if (!completedRaces.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        Points chart will appear after the first race
      </div>
    );
  }

  const chartData = completedRaces.map((race, raceIdx) => {
    const point: Record<string, string | number> = { race: race.raceName };
    for (const player of history) {
      // Cumulative sum up to this race
      let cum = 0;
      for (let i = 0; i <= raceIdx; i++) {
        cum += player.races[i]?.points ?? 0;
      }
      point[player.userName] = cum;
    }
    return point;
  });

  // Sort players: current user first, then by final cumulative score
  const sorted = [...history].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    const aFinal = completedRaces.reduce((s, _, i) => s + (a.races[i]?.points ?? 0), 0);
    const bFinal = completedRaces.reduce((s, _, i) => s + (b.races[i]?.points ?? 0), 0);
    return bFinal - aFinal;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="race"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={{ stroke: "#1e293b" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
          labelStyle={{ color: "#94a3b8", fontSize: 12 }}
          itemStyle={{ fontSize: 12 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }}
        />
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
