import { bestNWeekendTotal, BEST_WEEKENDS_COUNT } from "@/lib/scoring";
import {
  computeLeaderboard,
  computeUserRank,
  type UserRow,
  type WeekendScoreRow
} from "@/lib/leaderboard-compute";
import type { PersonalStats } from "@/lib/data";

export type MyWeekendScoreRow = {
  total_points: number | null;
  exact_matches: number | null;
  race_id: string;
  race_weekends: { grand_prix: string; race_start: string } | { grand_prix: string; race_start: string }[] | null;
};

export type WeekendScoreTotalRow = {
  user_id: string;
  total_points: number | null;
  total_error: number | null;
  exact_matches: number | null;
};

function raceWeekendStart(row: MyWeekendScoreRow): string {
  const rw = row.race_weekends;
  const w = Array.isArray(rw) ? rw[0] : rw;
  return w?.race_start ?? "";
}

function totalsAsWeekendRows(totals: WeekendScoreTotalRow[]): WeekendScoreRow[] {
  return totals.map((t) => ({
    user_id: t.user_id,
    race_id: "",
    total_points: t.total_points,
    total_error: t.total_error,
    exact_matches: t.exact_matches
  }));
}

export function buildPersonalStats(
  userId: string,
  myScores: MyWeekendScoreRow[],
  users: UserRow[],
  scoreTotals: WeekendScoreTotalRow[]
): PersonalStats | null {
  if (!myScores.length) return null;

  const points = myScores.map((s) => s.total_points || 0);
  const totalPoints = bestNWeekendTotal(points, BEST_WEEKENDS_COUNT);
  const bestWeekend = Math.max(0, ...points);
  const exactMatches = myScores.reduce((sum, s) => sum + (s.exact_matches || 0), 0);

  const sorted = [...myScores].sort((a, b) => raceWeekendStart(b).localeCompare(raceWeekendStart(a)));
  const lastScoredRace = sorted.find((s) => (s.total_points || 0) > 0);
  let lastRace: { name: string; points: number } | null = null;
  if (lastScoredRace) {
    const rw = lastScoredRace.race_weekends;
    const w = Array.isArray(rw) ? rw[0] : rw;
    lastRace = { name: w?.grand_prix || "", points: lastScoredRace.total_points || 0 };
  }

  const leaderboard = computeLeaderboard(users, totalsAsWeekendRows(scoreTotals));
  const rank = computeUserRank(userId, leaderboard);

  return { rank, totalPoints, bestWeekend, exactMatches, lastRace };
}
