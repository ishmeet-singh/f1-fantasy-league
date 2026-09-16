import { fetchDrivers, fetchMeetings, fetchSessionResults, fetchSessionsForMeeting } from "@/lib/openf1";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasCompleteResults, recomputeRaceScores } from "@/lib/recompute";
import { syncResultsJolpi } from "@/lib/sync-jolpi";
import {
  findJolpiRoundByDate,
  fetchAllJolpiRaceResults,
  fetchAllJolpiQualiResults,
  fetchAllJolpiSprintResults,
  fetchJolpiRaces,
  getJolpiResultsForRound,
} from "@/lib/jolpi";
import { applyScheduleOverridesAfterCalendarSync } from "@/lib/schedule-overrides";
import { mapJolpiResultsToOpenF1, mergeDriverWithCrossref } from "@/lib/driver-crossref";
import { CANCELLED_RACE_IDS } from "@/lib/cancelled-races";
import { applyOfficialSprintWeekend2026 } from "@/lib/sprint-weekends-2026";
import { sessionsReadyToSync } from "@/lib/sync-session-gate";
import { PICKS_REQUIRED } from "@/lib/pick-rules";
import {
  replaceSessionResultsAndPublish,
  recentlySyncedEventTypes,
  type ResultSessionRow
} from "@/lib/result-sessions";
import type { EventType } from "@/lib/types";
import { syncObservedRaceEntries } from "@/lib/race-entry-sync";

export type SyncedSession = { raceId: string; eventType: EventType };

type CalendarTiming = {
  quali_start: string;
  sprint_start: string | null;
  race_start: string;
};

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Date.parse(a) === Date.parse(b);
}

export function calendarTimingChanged(a: CalendarTiming, b: CalendarTiming): boolean {
  return (
    !sameInstant(a.quali_start, b.quali_start) ||
    !sameInstant(a.sprint_start, b.sprint_start) ||
    !sameInstant(a.race_start, b.race_start)
  );
}

function findSessionStart(sessions: { session_name: string; date_start: string }[], names: string[]) {
  const found = sessions.find((session) => names.includes(session.session_name));
  return found?.date_start ?? null;
}

async function syncCalendarOpenF1(year: number) {
  const supabaseAdmin = getSupabaseAdmin();

  // Fetch OpenF1 meetings, Jolpi races, and drivers in parallel
  const [meetings, allDrivers, jolpiRaces] = await Promise.all([
    fetchMeetings(year),
    fetchDrivers(),
    fetchJolpiRaces(year)
  ]);

  const { data: existingDrivers, error: existingDriversError } = await supabaseAdmin
    .from("drivers")
    .select("id,name,team");
  if (existingDriversError) {
    throw new Error(`drivers query failed: ${existingDriversError.message}`);
  }
  const existingById = new Map((existingDrivers ?? []).map((d) => [d.id, d]));
  const syncedDrivers: { id: string; name: string; team: string }[] = [];
  const { data: existingRaces, error: existingRacesError } = await supabaseAdmin
    .from("race_weekends")
    .select("id,grand_prix,quali_start,sprint_start,race_start")
    .gte("race_start", `${year}-01-01T00:00:00.000Z`)
    .lt("race_start", `${year + 1}-01-01T00:00:00.000Z`);
  if (existingRacesError) {
    throw new Error(`race calendar query failed: ${existingRacesError.message}`);
  }
  const existingRaceById = new Map((existingRaces ?? []).map((race) => [race.id, race]));

  for (const d of allDrivers) {
    const incoming = {
      id: String(d.driver_number),
      name: d.full_name ? String(d.full_name).trim() : "",
      team: d.team_name || "Unknown"
    };
    const merged = mergeDriverWithCrossref(incoming, existingById.get(incoming.id));
    const { error } = await supabaseAdmin.from("drivers").upsert(merged);
    if (error) throw new Error(`driver ${merged.id} upsert failed: ${error.message}`);
    existingById.set(merged.id, merged);
    syncedDrivers.push(merged);
  }

  const raceMeetings = meetings.filter(
    (m) => !m.meeting_name.toLowerCase().includes("testing")
        && !m.meeting_name.toLowerCase().includes("pre-season")
        && !CANCELLED_RACE_IDS.has(String(m.meeting_key))
  );

  // Build a set of Jolpi race dates (ms) for cross-checking
  const jolpiDatesMs = jolpiRaces.map(r => {
    const t = r.time?.endsWith("Z") ? r.time : (r.time ? r.time + "Z" : "00:00:00Z");
    return new Date(`${r.date}T${t}`).getTime();
  });

  const MATCH_TOLERANCE_MS = 3 * 24 * 60 * 60 * 1000; // ±3 days
  const activeOpenF1Ids = new Set(raceMeetings.map((meeting) => String(meeting.meeting_key)));
  const explicitlyCancelledIds = new Set<string>();

  for (const meeting of raceMeetings) {
    const meetingDateMs = new Date(meeting.date_start).getTime();

    // Skip races not confirmed by Jolpi — treats Jolpi as the source of truth for
    // whether a race is actually on the calendar (catches cancellations that OpenF1
    // is slow to reflect, e.g. Bahrain/Saudi 2026).
    if (jolpiRaces.length > 0) {
      const confirmedByJolpi = jolpiDatesMs.some(
        jolpiMs => Math.abs(jolpiMs - meetingDateMs) <= MATCH_TOLERANCE_MS
      );
      if (!confirmedByJolpi) {
        console.log(`[calendar] Skipping ${meeting.meeting_name} — not in Jolpi calendar (likely cancelled)`);
        continue;
      }
    }

    const sessions = await fetchSessionsForMeeting(Number(meeting.meeting_key));
    if (sessions.find((session) => session.session_name === "Race")?.is_cancelled) {
      activeOpenF1Ids.delete(String(meeting.meeting_key));
      explicitlyCancelledIds.add(String(meeting.meeting_key));
      console.log(`[calendar] ${meeting.meeting_name} is marked cancelled by OpenF1`);
      continue;
    }
    const raceStart = findSessionStart(sessions, ["Race"]) ?? meeting.date_start;
    // Only use the main "Qualifying" session — never Sprint Qualifying / Sprint Shootout.
    // For sprint weekends the sprint shootout appears earlier chronologically and would
    // otherwise be picked up first by Array.find, causing quali reminders to fire at the
    // wrong time.
    const qualiStart = findSessionStart(sessions, ["Qualifying"]) ?? raceStart;
    const sprintStart = findSessionStart(sessions, ["Sprint"]);

    const year = new Date(raceStart).getUTCFullYear();
    const weekendRow = applyOfficialSprintWeekend2026(
      {
        grand_prix: meeting.meeting_name,
        quali_start: qualiStart,
        sprint_start: sprintStart,
        race_start: raceStart,
        has_sprint: Boolean(sprintStart)
      },
      year
    );

    const incomingRace = {
      id: String(meeting.meeting_key),
      grand_prix: weekendRow.grand_prix,
      race_date: meeting.date_start,
      quali_start: weekendRow.quali_start,
      sprint_start: weekendRow.sprint_start,
      race_start: weekendRow.race_start,
      has_sprint: weekendRow.has_sprint
    };
    const existingRace = existingRaceById.get(incomingRace.id);
    if (
      !existingRace ||
      calendarTimingChanged(existingRace, incomingRace)
    ) {
      const { count: affectedPredictions } = await supabaseAdmin
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("race_id", incomingRace.id);
      await supabaseAdmin.from("calendar_sync_log").insert({
        race_id: incomingRace.id,
        grand_prix: incomingRace.grand_prix,
        change_type: existingRace ? "timing-changed" : "added",
        previous_values: existingRace ?? null,
        incoming_values: incomingRace,
        affected_prediction_rows: affectedPredictions ?? 0
      });
    }

    const { error } = await supabaseAdmin.from("race_weekends").upsert(incomingRace);
    if (error) {
      throw new Error(`race ${meeting.meeting_key} upsert failed: ${error.message}`);
    }

    if (
      new Date(weekendRow.race_start).getTime() > Date.now() &&
      syncedDrivers.length >= PICKS_REQUIRED.race
    ) {
      const { error: entriesError } = await supabaseAdmin.rpc("replace_race_entries", {
        p_race_id: String(meeting.meeting_key),
        p_entries: syncedDrivers.map((driver) => ({
          driver_id: driver.id,
          driver_name: driver.name,
          team: driver.team
        }))
      });
      if (entriesError) {
        throw new Error(`race ${meeting.meeting_key} entries failed: ${entriesError.message}`);
      }
    }
  }

  // Remove future rows only when both upstream calendars no longer contain the
  // event and no user or result data would be destroyed. Otherwise log it for
  // review and preserve the historical/audit data.
  for (const existingRace of existingRaces ?? []) {
    if (!/^\d+$/.test(existingRace.id)) continue;
    if (Date.parse(existingRace.race_start) < Date.now()) continue;
    const presentInOpenF1 = activeOpenF1Ids.has(existingRace.id);
    const existingDate = Date.parse(existingRace.race_start);
    const presentInJolpi = jolpiDatesMs.some(
      (jolpiDate) => Math.abs(jolpiDate - existingDate) <= MATCH_TOLERANCE_MS
    );
    if (
      !explicitlyCancelledIds.has(existingRace.id) &&
      (presentInOpenF1 || presentInJolpi)
    ) {
      continue;
    }

    const [{ count: predictions }, { count: results }] = await Promise.all([
      supabaseAdmin
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("race_id", existingRace.id),
      supabaseAdmin
        .from("results")
        .select("id", { count: "exact", head: true })
        .eq("race_id", existingRace.id)
    ]);
    const affectedRows = (predictions ?? 0) + (results ?? 0);
    if (affectedRows === 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("race_weekends")
        .delete()
        .eq("id", existingRace.id);
      if (deleteError) throw new Error(`remove race ${existingRace.id}: ${deleteError.message}`);
    }
    await supabaseAdmin.from("calendar_sync_log").insert({
      race_id: existingRace.id,
      grand_prix: existingRace.grand_prix,
      change_type: affectedRows === 0 ? "removed" : "removal-blocked",
      previous_values: existingRace,
      incoming_values: null,
      affected_prediction_rows: affectedRows
    });
  }
}

export async function syncCalendar(year = new Date().getUTCFullYear()) {
  // OpenF1 is the sole authoritative source for calendar IDs.
  // We never fall back to Jolpi here — it uses different IDs (jolpi-YYYY-R) which
  // would create duplicate race entries alongside the existing OpenF1-keyed rows.
  // Jolpi is only used for results as a fallback, not for calendar structure.
  await syncCalendarOpenF1(year);
  await applyScheduleOverridesAfterCalendarSync(getSupabaseAdmin());
  console.log("Calendar synced via OpenF1 and cross-checked with Jolpi");
}

async function syncResultsOpenF1(): Promise<SyncedSession[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const now = Date.now();
  const syncedSessions: SyncedSession[] = [];

  // Window: races whose weekend has started (quali is typically 2 days before race)
  // or will start within 3 days (so we catch qualifying before race_start passes).
  // Lower bound: 14 days ago (covers post-race penalty changes).
  // At most 2 races in window at any point in the season.
  const windowStart = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: raceRows, error: raceWindowError } = await supabaseAdmin
    .from("race_weekends")
    .select("id,has_sprint,race_start,quali_start,sprint_start")
    .not("id", "like", "jolpi-%");
  if (raceWindowError) {
    throw new Error(`OpenF1 race window query failed: ${raceWindowError.message}`);
  }
  const races = (raceRows ?? []).filter((race) => {
    const earliestSession = Math.min(
      new Date(race.quali_start).getTime(),
      race.sprint_start ? new Date(race.sprint_start).getTime() : Infinity,
      new Date(race.race_start).getTime()
    );
    return (
      new Date(race.race_start).getTime() >= new Date(windowStart).getTime() &&
      earliestSession <= new Date(windowEnd).getTime()
    );
  });

  if (!races.length) {
    console.log(`OpenF1 sync: no races in window (windowStart=${windowStart} windowEnd=${windowEnd})`);
    return syncedSessions;
  }

  console.log(`OpenF1 sync: processing ${races.length} race(s) in window (windowStart=${windowStart} windowEnd=${windowEnd})`);
  console.log(`OpenF1 sync: races found: ${races.map(r => `${r.id}(race_start=${r.race_start})`).join(", ")}`);

  for (const race of races) {
    const year = new Date(race.race_start).getUTCFullYear();

    const { data: resultSessions, error: resultSessionsError } = await supabaseAdmin
      .from("result_sessions")
      .select("race_id,event_type,status,source,result_count,last_synced_at,score_updated_at")
      .eq("race_id", race.id);
    if (resultSessionsError) {
      throw new Error(`[${race.id}] result sessions: ${resultSessionsError.message}`);
    }

    const officialSessions = (resultSessions ?? []) as ResultSessionRow[];
    const recentlySynced = recentlySyncedEventTypes(officialSessions, now);
    for (const session of officialSessions) {
      if (session.status === "official" && !session.score_updated_at) {
        syncedSessions.push({ raceId: String(race.id), eventType: session.event_type });
      }
    }

    // Official classifications are refreshed every six hours while the race
    // remains in the 14-day window so penalties and corrections are ingested.
    const eventsToSync = sessionsReadyToSync(race, now, recentlySynced);

    if (!eventsToSync.length) {
      console.log(`[${race.id}] All sessions already synced — skipping`);
      continue;
    }

    try {
      const entrySync = await syncObservedRaceEntries(String(race.id), now);
      if (entrySync?.status === "updated") {
        console.log(
          `[${race.id}] Competitive-session roster updated (+${entrySync.addedDriverIds?.length ?? 0}/-${entrySync.removedDriverIds?.length ?? 0})`
        );
      }
    } catch (error) {
      // Result publication must continue if the optional roster reconciliation fails.
      console.warn(`[${race.id}] Competitive-session roster sync failed:`, error);
    }

    // Fetch all eligible events in parallel
    const outcomes = await Promise.allSettled(
      eventsToSync.map(async ({ eventType }) => {
        let rows: { driver_number: string; position: number }[] = [];
        let openf1Count = 0;
        let jolpiCount = 0;
        let source: "openf1" | "jolpi" | "none" = "none";
        let errorMsg = "";

        // ── OpenF1 (primary) ──────────────────────────────
        try {
          rows = await fetchSessionResults(Number(race.id), eventType);
          openf1Count = rows.length;
          if (rows.length) {
            source = "openf1";
            console.log(`[${race.id}/${eventType}] OpenF1: ${rows.length} results`);
          } else {
            console.log(`[${race.id}/${eventType}] OpenF1: 0 results`);
          }
        } catch (e) {
          errorMsg = `OpenF1: ${String(e)}`;
          console.warn(`[${race.id}/${eventType}] OpenF1 failed:`, e);
        }

        // ── Jolpi (fallback if OpenF1 empty) ─────────────
        if (!rows.length) {
          try {
            const round = await findJolpiRoundByDate(year, race.race_start);
            if (round) {
              const bulkFn = eventType === "quali"
                ? fetchAllJolpiQualiResults
                : eventType === "sprint"
                ? fetchAllJolpiSprintResults
                : fetchAllJolpiRaceResults;

              const allResults = await bulkFn(year);
              const jolpiRows = await getJolpiResultsForRound(year, round, eventType, allResults);

              if (jolpiRows.length) {
                const mappedRows = mapJolpiResultsToOpenF1(jolpiRows);
                jolpiCount = jolpiRows.length;
                if (mappedRows.length !== jolpiRows.length) {
                  errorMsg += ` Jolpi mapping dropped ${jolpiRows.length - mappedRows.length} driver(s)`;
                  console.error(
                    `[${race.id}/${eventType}] Refusing incomplete Jolpi mapping (${mappedRows.length}/${jolpiRows.length})`
                  );
                } else {
                  rows = mappedRows;
                  source = "jolpi";
                  console.log(`[${race.id}/${eventType}] Jolpi fallback: ${rows.length} results`);
                }
              }
            }
          } catch (e) {
            errorMsg += ` Jolpi: ${String(e)}`;
            console.warn(`[${race.id}/${eventType}] Jolpi fallback failed:`, e);
          }
        }

        // ── Atomically replace and publish results ────────
        let rowsUpserted = 0;
        let upsertError: string | null = null;
        if (rows.length) {
          const resultRows = rows
            .filter(r => Number.isInteger(r.position) && r.position >= 1)
            .map(r => ({
              driverId: r.driver_number,
              actualPosition: r.position
            }));

          if (resultRows.length && source !== "none") {
            try {
              rowsUpserted = await replaceSessionResultsAndPublish({
                raceId: String(race.id),
                eventType,
                source,
                results: resultRows
              });
              console.log(`[${race.id}/${eventType}] Saved ${rowsUpserted} results ✓`);
            } catch (error) {
              const message = String(error);
              console.error(`[${race.id}/${eventType}] Publication failed: ${message}`);
              errorMsg += ` Publication: ${message}`;
              upsertError = message;
            }
          }
        } else {
          console.log(`[${race.id}/${eventType}] No results available from either API yet`);
        }

        // ── Log every attempt so we can measure API publish delay ─
        const { error: logError } = await supabaseAdmin.from("results_sync_log").insert({
          race_id: race.id,
          event_type: eventType,
          openf1_count: openf1Count,
          jolpi_count: jolpiCount,
          rows_upserted: rowsUpserted,
          source,
          error: errorMsg || null
        });
        if (logError) throw new Error(`[${race.id}/${eventType}] sync log: ${logError.message}`);

        if (upsertError) throw new Error(`[${race.id}/${eventType}] ${upsertError}`);
        if (!rowsUpserted) return null;

        const { data: savedResults, error: savedResultsError } = await supabaseAdmin
          .from("results")
          .select("driver_id,actual_position")
          .eq("race_id", race.id)
          .eq("event_type", eventType);
        if (savedResultsError) {
          throw new Error(`[${race.id}/${eventType}] verify results: ${savedResultsError.message}`);
        }

        const complete = hasCompleteResults(race.id, savedResults ?? []);
        if (!complete) {
          console.log(
            `[${race.id}/${eventType}] Official classification differs from configured grid (${savedResults?.length ?? 0} rows)`
          );
        }

        return { raceId: String(race.id), eventType } satisfies SyncedSession;
      })
    );
    const completed = outcomes
      .filter((outcome): outcome is PromiseFulfilledResult<SyncedSession | null> => outcome.status === "fulfilled")
      .map((outcome) => outcome.value);
    const rejected = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
    for (const outcome of rejected) {
      console.error(`[${race.id}] Session sync failed:`, outcome.reason);
    }
    if (rejected.length === outcomes.length) {
      throw new Error(`[${race.id}] All eligible session syncs failed`);
    }
    syncedSessions.push(...completed.filter((session): session is SyncedSession => session !== null));
  }

  return syncedSessions;
}

export async function syncResults() {
  console.log("syncResults started");

  // Run both source syncs in parallel
  const [openF1Result, jolpiResult] = await Promise.allSettled([
    syncResultsOpenF1(),
    syncResultsJolpi()
  ]);

  const sourceWarnings: string[] = [];
  if (openF1Result.status === "rejected") {
    console.error("OpenF1 sync failed:", openF1Result.reason);
    sourceWarnings.push(`OpenF1: ${String(openF1Result.reason)}`);
  }
  if (jolpiResult.status === "rejected") {
    console.error("Jolpi sync failed:", jolpiResult.reason);
    sourceWarnings.push(`Jolpi: ${String(jolpiResult.reason)}`);
  }
  if (openF1Result.status === "rejected" && jolpiResult.status === "rejected") {
    throw new Error(sourceWarnings.join("; "));
  }

  const sessions = [
    ...(openF1Result.status === "fulfilled" ? openF1Result.value : []),
    ...(jolpiResult.status === "fulfilled" ? jolpiResult.value : [])
  ];
  const uniqueSessions = new Map(
    sessions.map((session) => [`${session.raceId}:${session.eventType}`, session])
  );
  const raceIds = new Set(sessions.map((session) => session.raceId));

  let scoreRows = 0;
  let weekendRows = 0;
  const failures: string[] = [];
  for (const raceId of raceIds) {
    const recompute = await recomputeRaceScores(raceId);
    scoreRows += recompute.scoreRows;
    weekendRows += recompute.weekendRows;
    failures.push(...recompute.errors);
  }

  if (failures.length) throw new Error(failures.join("; "));

  console.log("syncResults complete");
  return {
    syncedSessions: uniqueSessions.size,
    scoreRows,
    weekendRows,
    degraded: sourceWarnings.length > 0,
    warnings: sourceWarnings
  };
}
