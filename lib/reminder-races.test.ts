import { describe, expect, it } from "vitest";
import {
  REMINDER_LOOKAHEAD_MS,
  selectDueReminderInterval,
  selectRacesInReminderWindow,
  selectRacesQualiOnlyWindow,
  shouldSendReminderNow
} from "./reminder-races";

/** British GP 2026-style schedule: sprint Saturday 12:00, quali Saturday 16:00, race Sunday 15:00 UTC. */
const britishGp2026 = {
  id: "1287",
  grand_prix: "British Grand Prix",
  sprint_start: "2026-07-04T12:00:00.000Z",
  quali_start: "2026-07-04T16:00:00.000Z",
  race_start: "2026-07-05T15:00:00.000Z",
  has_sprint: true
};

describe("selectRacesInReminderWindow", () => {
  it("includes sprint weekend when only sprint is inside the 49h window (quali is not)", () => {
    // 48h before sprint = Thu 12:00; quali is still ~52h away
    const nowMs = new Date("2026-07-02T12:00:00.000Z").getTime();

    const selected = selectRacesInReminderWindow([britishGp2026], nowMs, REMINDER_LOOKAHEAD_MS);
    expect(selected).toHaveLength(1);

    const oldBug = selectRacesQualiOnlyWindow([britishGp2026], nowMs, REMINDER_LOOKAHEAD_MS);
    expect(oldBug).toHaveLength(0);
  });

  it("fires 48h sprint reminder inside the cron match window", () => {
    const nowMs = new Date("2026-07-02T12:15:00.000Z").getTime();
    expect(
      shouldSendReminderNow(britishGp2026.sprint_start, 48 * 60, nowMs)
    ).toBe(true);
  });
});

/** Singapore 2026: sprint Sat 09:00 UTC, quali Sat 13:00 UTC, race Sun 12:00 UTC. */
const singaporeGp2026 = {
  id: "1296",
  grand_prix: "Singapore Grand Prix",
  sprint_start: "2026-10-10T09:00:00.000Z",
  quali_start: "2026-10-10T13:00:00.000Z",
  race_start: "2026-10-11T12:00:00.000Z",
  has_sprint: true
};

describe("selectDueReminderInterval", () => {
  it("still sends the sprint 48h reminder when the cron lands in the quali window", () => {
    // Production miss: cron at 13:17 UTC sent quali 48h and skipped sprint.
    // Sprint's 90-minute window (09:00–10:30) had already closed.
    const nowMs = new Date("2026-10-08T13:17:36.000Z").getTime();

    expect(shouldSendReminderNow(singaporeGp2026.sprint_start, 48 * 60, nowMs)).toBe(false);
    expect(selectDueReminderInterval(singaporeGp2026.sprint_start, nowMs)).toBe(48 * 60);
    expect(selectDueReminderInterval(singaporeGp2026.quali_start, nowMs)).toBe(48 * 60);
    expect(selectDueReminderInterval(singaporeGp2026.race_start, nowMs)).toBeNull();
  });

  it("sends the sprint 24h reminder from the same tick that sends quali 24h", () => {
    const nowMs = new Date("2026-10-09T13:17:00.000Z").getTime();

    expect(selectDueReminderInterval(singaporeGp2026.sprint_start, nowMs)).toBe(24 * 60);
    expect(selectDueReminderInterval(singaporeGp2026.quali_start, nowMs)).toBe(24 * 60);
  });

  it("does not send a reminder before its target or long after the catch-up horizon", () => {
    const beforeSprint48h = new Date("2026-10-08T05:59:00.000Z").getTime();
    expect(selectDueReminderInterval(singaporeGp2026.sprint_start, beforeSprint48h)).toBeNull();

    const stale48h = new Date("2026-10-09T05:06:00.000Z").getTime();
    expect(selectDueReminderInterval(singaporeGp2026.sprint_start, stale48h)).toBeNull();
  });

  it("sends only the latest elapsed interval when several are inside the horizon", () => {
    // 06:30 UTC: 3h target was 06:00, 6h target was 03:00, 12h target was 21:00 yesterday.
    const nowMs = new Date("2026-10-10T06:30:00.000Z").getTime();
    expect(selectDueReminderInterval(singaporeGp2026.sprint_start, nowMs)).toBe(3 * 60);
  });
});
