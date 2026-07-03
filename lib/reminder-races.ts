/** 49h — longest reminder interval (48h) plus cron match window slack. */
export const REMINDER_LOOKAHEAD_MS = (48 * 60 + 60) * 60 * 1000;

export type ReminderRaceWeekend = {
  id: string;
  grand_prix: string;
  quali_start: string;
  sprint_start: string | null;
  race_start: string;
  has_sprint: boolean;
};

/** Races with at least one upcoming session inside the reminder window. */
export function selectRacesInReminderWindow<T extends ReminderRaceWeekend>(
  races: T[],
  nowMs: number,
  lookaheadMs = REMINDER_LOOKAHEAD_MS
): T[] {
  const cutoffMs = nowMs + lookaheadMs;
  return races.filter((race) => {
    if (new Date(race.race_start).getTime() <= nowMs) return false;
    const sessions = [race.quali_start, race.race_start];
    if (race.has_sprint && race.sprint_start) sessions.push(race.sprint_start);
    return sessions.some((start) => {
      const t = new Date(start).getTime();
      return t > nowMs && t <= cutoffMs;
    });
  });
}

/** Legacy quali-only filter — misses sprint weekends when sprint is 48h out but quali is not. */
export function selectRacesQualiOnlyWindow<T extends ReminderRaceWeekend>(
  races: T[],
  nowMs: number,
  lookaheadMs = REMINDER_LOOKAHEAD_MS
): T[] {
  const cutoffMs = nowMs + lookaheadMs;
  return races.filter(
    (race) =>
      new Date(race.race_start).getTime() > nowMs &&
      new Date(race.quali_start).getTime() > nowMs &&
      new Date(race.quali_start).getTime() <= cutoffMs
  );
}

export const REMINDER_INTERVALS_MINUTES = [48 * 60, 24 * 60, 12 * 60, 6 * 60, 3 * 60, 60, 5];
export const REMINDER_MATCH_WINDOW_MINUTES = 90;

export function shouldSendReminderNow(
  sessionStart: string,
  intervalMinutes: number,
  nowMs: number
): boolean {
  const sessionTime = new Date(sessionStart).getTime();
  const targetTime = sessionTime - intervalMinutes * 60 * 1000;
  const diffMinutes = (nowMs - targetTime) / 60000;
  return diffMinutes >= 0 && diffMinutes < REMINDER_MATCH_WINDOW_MINUTES;
}
