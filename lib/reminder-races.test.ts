import { describe, expect, it } from "vitest";
import {
  REMINDER_LOOKAHEAD_MS,
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
