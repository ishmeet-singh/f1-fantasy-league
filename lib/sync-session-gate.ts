import { EventType } from "@/lib/types";

export type RaceSessionSchedule = {
  has_sprint: boolean;
  quali_start: string | null;
  sprint_start: string | null;
  race_start: string;
};

export type SessionToSync = { eventType: EventType; sessionStart: string };

/**
 * Sessions that have started and do not yet have results in the DB.
 * Shared by OpenF1 and Jolpi result sync so neither publishes early.
 */
export function sessionsReadyToSync(
  race: RaceSessionSchedule,
  nowMs: number,
  alreadySynced: ReadonlySet<string>
): SessionToSync[] {
  const out: SessionToSync[] = [];

  if (
    race.quali_start &&
    new Date(race.quali_start).getTime() <= nowMs &&
    !alreadySynced.has("quali")
  ) {
    out.push({ eventType: "quali", sessionStart: race.quali_start });
  }

  if (
    race.has_sprint &&
    race.sprint_start &&
    new Date(race.sprint_start).getTime() <= nowMs &&
    !alreadySynced.has("sprint")
  ) {
    out.push({ eventType: "sprint", sessionStart: race.sprint_start });
  }

  if (new Date(race.race_start).getTime() <= nowMs && !alreadySynced.has("race")) {
    out.push({ eventType: "race", sessionStart: race.race_start });
  }

  return out;
}
