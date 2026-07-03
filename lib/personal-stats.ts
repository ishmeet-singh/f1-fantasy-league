import { computeSeasonStanding, raceStartMapFromWeekends } from "@/lib/season-standings";
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
  race_id: string;
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
    race_id: t.race_id,
    total_points: t.total_points,
    total_error: t.total_error,
    exact_matches: t.exact_matches
  }));
}

export function buildPersonalStats(
  userId: string,
  myScores: MyWeekendScoreRow[],
  users: UserRow[],
  scoreTotals: WeekendScoreTotalRow[],
  races: ReadonlyArray<{ id: string; race_start: string }>,
  completedRaceIds: ReadonlySet<string>
): PersonalStats | null {
  if (!myScores.length) return null;

  const raceStartById = raceStartMapFromWeekends(races);
  const userWeekends = scoreTotals
    .filter((t) => t.user_id === userId && completedRaceIds.has(t.race_id))
    .map((t) => ({
      race_id: t.race_id,
      total_points: t.total_points,
      total_error: t.total_error,
      exact_matches: t.exact_matches
    }));
  const standing = computeSeasonStanding(userWeekends, raceStartById);

  const points = myScores.map((s) => s.total_points || 0);
  const bestWeekend = Math.max(0, ...points);

  const sorted = [...myScores].sort((a, b) => raceWeekendStart(b).localeCompare(raceWeekendStart(a)));
  const lastScoredRace = sorted.find((s) => (s.total_points || 0) > 0);
  let lastRace: { name: string; points: number } | null = null;
  if (lastScoredRace) {
    const rw = lastScoredRace.race_weekends;
    const w = Array.isArray(rw) ? rw[0] : rw;
    lastRace = { name: w?.grand_prix || "", points: lastScoredRace.total_points || 0 };
  }

  const leaderboard = computeLeaderboard(
    users,
    totalsAsWeekendRows(scoreTotals),
    races,
    completedRaceIds
  );
  const rank = computeUserRank(userId, leaderboard);

  return {
    rank,
    totalPoints: standing.score,
    bestWeekend,
    exactMatches: standing.exact,
    lastRace
  };
}
