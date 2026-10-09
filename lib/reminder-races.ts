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
/**
 * Legacy narrow window. Kept so callers can see why a 90-minute check misses
 * sprint: the scheduled workflow often lands hours late, and sprint is 4h before quali.
 */
export const REMINDER_MATCH_WINDOW_MINUTES = 90;
/**
 * Send a reminder up to 12h after its target time. GitHub's 5-minute schedule
 * is landing about every 4–8h, and on sprint weekends the sprint session is
 * 4h before qualifying — a run that catches quali has already missed a 90-minute
 * sprint window. 12h still hands off before the next shorter interval (24h→12h)
 * so a late run does not also re-send the older one.
 */
export const REMINDER_CATCHUP_MINUTES = 12 * 60;

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

/**
 * One interval per session per cron run: the most recently elapsed reminder
 * still inside the catch-up horizon. A quali-timed run can still send the
 * sprint reminder from earlier the same morning, without also firing every
 * older interval in that horizon.
 */
export function selectDueReminderInterval(
  sessionStart: string,
  nowMs: number,
  catchupMinutes = REMINDER_CATCHUP_MINUTES
): number | null {
  const sessionTime = new Date(sessionStart).getTime();
  if (!Number.isFinite(sessionTime) || sessionTime <= nowMs) return null;

  let best: { intervalMinutes: number; diffMinutes: number } | null = null;
  for (const intervalMinutes of REMINDER_INTERVALS_MINUTES) {
    const targetTime = sessionTime - intervalMinutes * 60 * 1000;
    const diffMinutes = (nowMs - targetTime) / 60000;
    if (diffMinutes < 0 || diffMinutes >= catchupMinutes) continue;
    if (!best || diffMinutes < best.diffMinutes) {
      best = { intervalMinutes, diffMinutes };
    }
  }
  return best?.intervalMinutes ?? null;
}
