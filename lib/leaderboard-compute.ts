import { bestNWeekendTotal, BEST_WEEKENDS_COUNT } from "@/lib/scoring";
import type { LeaderboardEntry, PointsHistoryEntry } from "@/lib/data";

export type WeekendScoreRow = {
  user_id: string;
  race_id: string;
  total_points: number | null;
  total_error?: number | null;
  exact_matches?: number | null;
};

export type UserRow = {
  id: string;
  display_name: string | null;
  email: string;
};

function aggregateWeekendScores(weekends: WeekendScoreRow[]) {
  const byUser = new Map<string, { points: number[]; error: number; exact: number }>();
  for (const w of weekends) {
    const cur = byUser.get(w.user_id) || { points: [], error: 0, exact: 0 };
    cur.points.push(w.total_points || 0);
    cur.error += w.total_error || 0;
    cur.exact += w.exact_matches || 0;
    byUser.set(w.user_id, cur);
  }
  return byUser;
}

export function computeLeaderboard(
  users: UserRow[],
  weekends: WeekendScoreRow[]
): LeaderboardEntry[] {
  const byUser = aggregateWeekendScores(weekends);
  return users
    .map((u) => {
      const agg = byUser.get(u.id) || { points: [], error: 0, exact: 0 };
      return {
        id: u.id,
        name: u.display_name || u.email,
        score: bestNWeekendTotal(agg.points, BEST_WEEKENDS_COUNT),
        error: agg.error,
        exact: agg.exact,
        top: Math.max(0, ...agg.points)
      };
    })
    .sort((a, b) => b.score - a.score || a.error - b.error || b.exact - a.exact || b.top - a.top);
}

export function computeUserRank(userId: string, leaderboard: LeaderboardEntry[]): number {
  const idx = leaderboard.findIndex((e) => e.id === userId);
  return idx >= 0 ? idx + 1 : leaderboard.length;
}

export function computePointsHistory(
  users: UserRow[],
  races: { id: string; grand_prix: string }[],
  weekends: WeekendScoreRow[],
  completedRaceIds: ReadonlySet<string>
): PointsHistoryEntry[] {
  const completedRaces = races.filter((r) => completedRaceIds.has(r.id));
  const scoreMap = new Map<string, number>();
  for (const s of weekends) {
    scoreMap.set(`${s.user_id}:${s.race_id}`, s.total_points ?? 0);
  }

  return users.map((u) => ({
    userId: u.id,
    userName: u.display_name || u.email.split("@")[0],
    races: completedRaces.map((r) => ({
      raceId: r.id,
      raceName: r.grand_prix.replace(" Grand Prix", "").replace("Grand Prix", "").trim(),
      points: scoreMap.has(`${u.id}:${r.id}`) ? (scoreMap.get(`${u.id}:${r.id}`) ?? 0) : null
    }))
  }));
}
