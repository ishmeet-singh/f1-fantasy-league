import { fetchDrivers, fetchMeetings, fetchSessionResults, fetchSessionsForMeeting } from "@/lib/openf1";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeAllScores } from "@/lib/recompute";
import { EventType } from "@/lib/types";
import { syncCalendarJolpi, syncResultsJolpi } from "@/lib/sync-jolpi";
import {
  findJolpiRoundByDate,
  fetchAllJolpiRaceResults,
  fetchAllJolpiQualiResults,
  fetchAllJolpiSprintResults,
} from "@/lib/jolpi";

function findSessionStart(sessions: { session_name: string; date_start: string }[], names: string[]) {
  const found = sessions.find((session) => names.includes(session.session_name));
  return found?.date_start ?? null;
}

async function syncCalendarOpenF1(year: number) {
  const supabaseAdmin = getSupabaseAdmin();
  const [meetings, drivers] = await Promise.all([fetchMeetings(year), fetchDrivers()]);

  for (const d of drivers) {
    await supabaseAdmin.from("drivers").upsert({
      id: String(d.driver_number),
      name: d.full_name,
      team: d.team_name || "Unknown"
    });
  }

  const raceMeetings = meetings.filter(
    (m) => !m.meeting_name.toLowerCase().includes("testing") && !m.meeting_name.toLowerCase().includes("pre-season")
  );

  for (const meeting of raceMeetings) {
    const sessions = await fetchSessionsForMeeting(Number(meeting.meeting_key));
    const raceStart = findSessionStart(sessions, ["Race"]) ?? meeting.date_start;
    const qualiStart = findSessionStart(sessions, ["Qualifying", "Sprint Qualifying", "Sprint Shootout"]) ?? raceStart;
    const sprintStart = findSessionStart(sessions, ["Sprint"]);

    await supabaseAdmin.from("race_weekends").upsert({
      id: String(meeting.meeting_key),
      grand_prix: meeting.meeting_name,
      race_date: meeting.date_start,
      quali_start: qualiStart,
      sprint_start: sprintStart,
      race_start: raceStart,
      has_sprint: Boolean(sprintStart)
    });
  }
}

export async function syncCalendar(year = new Date().getUTCFullYear()) {
  // OpenF1 is primary — it's working and all races already have OpenF1 IDs in DB.
  // Switching sources mid-season would create duplicate race entries.
  try {
    await syncCalendarOpenF1(year);
    console.log("Calendar synced via OpenF1");
  } catch (openF1Err) {
    console.warn("OpenF1 calendar sync failed, falling back to Jolpi:", openF1Err);
    await syncCalendarJolpi(year);
    console.log("Calendar synced via Jolpi/Ergast");
  }
}

async function syncResultsOpenF1() {
  const supabaseAdmin = getSupabaseAdmin();
  const now = Date.now();

  // CRITICAL FIX: only query races that have ALREADY STARTED and are within the last 7 days.
  // Previously this queried all 24 races (including 23 future ones), causing ~72 sequential
  // API calls and Vercel's 60s timeout — results never saved.
  const { data: races } = await supabaseAdmin
    .from("race_weekends")
    .select("id,has_sprint,race_start")
    .not("id", "like", "jolpi-%")
    .lte("race_start", new Date().toISOString())                                    // race has started
    .gte("race_start", new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString());     // within last 7 days

  if (!races?.length) {
    console.log("OpenF1 sync: no races in window");
    return;
  }

  console.log(`OpenF1 sync: processing ${races.length} race(s)`);

  for (const race of races) {
    const year = new Date(race.race_start).getUTCFullYear();
    const eventsToSync: EventType[] = ["quali", "race"];
    if (race.has_sprint) eventsToSync.push("sprint");

    // Fetch all event types in parallel — 3 API calls at once instead of sequential
    await Promise.allSettled(
      eventsToSync.map(async (eventType) => {
        let rows: { driver_number: string; position: number }[] = [];

        // Try OpenF1 first
        try {
          rows = await fetchSessionResults(Number(race.id), eventType);
          if (rows.length) console.log(`[${race.id}/${eventType}] OpenF1 returned ${rows.length} results`);
        } catch (e) {
          console.warn(`[${race.id}/${eventType}] OpenF1 fetch failed:`, e);
        }

        // Jolpi fallback — if OpenF1 has no results yet, try Jolpi bulk data
        if (!rows.length) {
          try {
            const round = await findJolpiRoundByDate(year, race.race_start);
            if (round) {
              const bulkFetch = eventType === "quali"
                ? fetchAllJolpiQualiResults
                : eventType === "sprint"
                ? fetchAllJolpiSprintResults
                : fetchAllJolpiRaceResults;
              const allResults = await bulkFetch(year);
              const jolpiRows = allResults.get(round) ?? [];
              if (jolpiRows.length) {
                rows = jolpiRows.map(r => ({ driver_number: r.driverId, position: r.position }));
                console.log(`[${race.id}/${eventType}] Jolpi fallback returned ${rows.length} results`);
              }
            }
          } catch (e) {
            console.warn(`[${race.id}/${eventType}] Jolpi fallback failed:`, e);
          }
        }

        if (!rows.length) {
          console.log(`[${race.id}/${eventType}] No results from either API yet`);
          return;
        }

        // Batch upsert with onConflict — safe to re-run multiple times
        const upsertRows = rows
          .filter(r => r.position >= 1 && r.position <= 22)
          .map(r => ({
            race_id: race.id,
            event_type: eventType,
            driver_id: r.driver_number,
            actual_position: r.position
          }));

        if (!upsertRows.length) return;

        const { error } = await supabaseAdmin
          .from("results")
          .upsert(upsertRows, { onConflict: "race_id,event_type,driver_id" });

        if (error) {
          console.error(`[${race.id}/${eventType}] DB upsert failed:`, error.message);
        } else {
          console.log(`[${race.id}/${eventType}] Saved ${upsertRows.length} results ✓`);
        }
      })
    );
  }
}

export async function syncResults() {
  console.log("syncResults started");

  // Run both source syncs in parallel
  const [openF1Result, jolpiResult] = await Promise.allSettled([
    syncResultsOpenF1(),
    syncResultsJolpi()
  ]);

  if (openF1Result.status === "rejected") console.error("OpenF1 sync failed:", openF1Result.reason);
  if (jolpiResult.status === "rejected") console.error("Jolpi sync failed:", jolpiResult.reason);

  await recomputeAllScores();
  console.log("syncResults complete");
}
