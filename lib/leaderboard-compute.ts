import {
  computeSeasonStanding,
  raceStartMapFromWeekends,
  type WeekendStandingInput
} from "@/lib/season-standings";
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

function weekendsForUser(
  userId: string,
  weekends: WeekendScoreRow[],
  completedRaceIds: ReadonlySet<string>
): WeekendStandingInput[] {
  return weekends
    .filter((w) => w.user_id === userId && completedRaceIds.has(w.race_id))
    .map((w) => ({
      race_id: w.race_id,
      total_points: w.total_points,
      total_error: w.total_error,
      exact_matches: w.exact_matches
    }));
}

export function computeLeaderboard(
  users: UserRow[],
  weekends: WeekendScoreRow[],
  races: ReadonlyArray<{ id: string; race_start: string }>,
  completedRaceIds: ReadonlySet<string>
): LeaderboardEntry[] {
  const raceStartById = raceStartMapFromWeekends(races);

  return users
    .map((u) => {
      const standing = computeSeasonStanding(
        weekendsForUser(u.id, weekends, completedRaceIds),
        raceStartById
      );
      return {
        id: u.id,
        name: u.display_name || u.email,
        score: standing.score,
        error: standing.error,
        exact: standing.exact,
        top: standing.top,
        countingRaceIds: standing.countingRaceIds,
        droppedRaceIds: standing.droppedRaceIds,
        racesCounting: standing.racesCounting,
        racesDropped: standing.racesDropped
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
  completedRaceIds: ReadonlySet<string>,
  leaderboard: LeaderboardEntry[]
): PointsHistoryEntry[] {
  const completedRaces = races.filter((r) => completedRaceIds.has(r.id));
  const scoreMap = new Map<string, number>();
  for (const s of weekends) {
    scoreMap.set(`${s.user_id}:${s.race_id}`, s.total_points ?? 0);
  }
  const droppedByUser = new Map(leaderboard.map((e) => [e.id, new Set(e.droppedRaceIds)]));

  return users.map((u) => ({
    userId: u.id,
    userName: u.display_name || u.email.split("@")[0],
    races: completedRaces.map((r) => ({
      raceId: r.id,
      raceName: r.grand_prix.replace(" Grand Prix", "").replace("Grand Prix", "").trim(),
      points: scoreMap.has(`${u.id}:${r.id}`) ? (scoreMap.get(`${u.id}:${r.id}`) ?? 0) : null,
      dropped: droppedByUser.get(u.id)?.has(r.id) ?? false
    }))
  }));
}
