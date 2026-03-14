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
  // Fetch drivers from the latest session; filter out any where full_name is missing
  const [meetings, allDrivers] = await Promise.all([fetchMeetings(year), fetchDrivers()]);
  const drivers = allDrivers.filter(d => d.full_name && String(d.full_name).trim() !== "");

  for (const d of drivers) {
    if (!d.full_name || String(d.full_name).trim() === "") continue; // never overwrite with empty name
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
    // Only use the main "Qualifying" session — never Sprint Qualifying / Sprint Shootout.
    // For sprint weekends the sprint shootout appears earlier chronologically and would
    // otherwise be picked up first by Array.find, causing quali reminders to fire at the
    // wrong time.
    const qualiStart = findSessionStart(sessions, ["Qualifying"]) ?? raceStart;
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

  // Window: races whose weekend has started (quali is typically 2 days before race)
  // or will start within 3 days (so we catch qualifying before race_start passes).
  // Lower bound: 7 days ago (don't re-sync old completed races).
  // At most 2 races in window at any point in the season.
  const windowStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: races } = await supabaseAdmin
    .from("race_weekends")
    .select("id,has_sprint,race_start,quali_start,sprint_start")
    .not("id", "like", "jolpi-%")
    .gte("race_start", windowStart)   // not older than 7 days
    .lte("race_start", windowEnd);    // race starts within 3 days (quali already happening)

  if (!races?.length) {
    console.log("OpenF1 sync: no races in window");
    return;
  }

  console.log(`OpenF1 sync: processing ${races.length} race(s) in window`);

  // Build a name→driver_number lookup from our drivers table.
  // Needed to map Jolpi driverId ("russell") to OpenF1 driver_number ("63").
  const { data: dbDrivers } = await supabaseAdmin.from("drivers").select("id,name");
  const jolpiIdToDriverNum = new Map<string, string>();
  for (const d of dbDrivers ?? []) {
    // "George Russell" → last name "russell"
    const lastName = d.name.split(" ").pop()?.toLowerCase() ?? "";
    jolpiIdToDriverNum.set(lastName, d.id);
    // "Max Verstappen" → full name as key too, for compound names
    jolpiIdToDriverNum.set(d.name.toLowerCase().replace(/\s+/g, "_"), d.id);
  }

  for (const race of races) {
    const year = new Date(race.race_start).getUTCFullYear();

    // Only attempt to sync events whose session time has actually passed.
    // Prevents fetching quali results before qualifying even starts.
    const eventsToSync: { eventType: EventType; sessionStart: string }[] = [];
    if (race.quali_start && new Date(race.quali_start) <= new Date()) {
      eventsToSync.push({ eventType: "quali", sessionStart: race.quali_start });
    }
    if (race.has_sprint && race.sprint_start && new Date(race.sprint_start) <= new Date()) {
      eventsToSync.push({ eventType: "sprint", sessionStart: race.sprint_start });
    }
    if (new Date(race.race_start) <= new Date()) {
      eventsToSync.push({ eventType: "race", sessionStart: race.race_start });
    }

    if (!eventsToSync.length) {
      console.log(`[${race.id}] No sessions have started yet — skipping`);
      continue;
    }

    // Fetch all eligible events in parallel
    await Promise.allSettled(
      eventsToSync.map(async ({ eventType }) => {
        let rows: { driver_number: string; position: number }[] = [];
        let openf1Count = 0;
        let jolpiCount = 0;
        let source: "openf1" | "jolpi" | "none" = "none";

        // ── OpenF1 (primary) ──────────────────────────────
        try {
          rows = await fetchSessionResults(Number(race.id), eventType);
          openf1Count = rows.length;
          if (rows.length) {
            source = "openf1";
            console.log(`[${race.id}/${eventType}] OpenF1: ${rows.length} results`);
          }
        } catch (e) {
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
              const jolpiRows = allResults.get(round) ?? [];

              if (jolpiRows.length) {
                rows = jolpiRows
                  .map(r => {
                    const lastName = r.driverId.split("_").pop() ?? r.driverId;
                    const driverNum = jolpiIdToDriverNum.get(lastName.toLowerCase())
                      ?? jolpiIdToDriverNum.get(r.driverId.toLowerCase());
                    if (!driverNum) {
                      console.warn(`[${race.id}/${eventType}] No driver_number mapping for Jolpi driverId: ${r.driverId}`);
                      return null;
                    }
                    return { driver_number: driverNum, position: r.position };
                  })
                  .filter((r): r is { driver_number: string; position: number } => r !== null);

                jolpiCount = rows.length;
                if (rows.length) {
                  source = "jolpi";
                  console.log(`[${race.id}/${eventType}] Jolpi fallback: ${rows.length} results`);
                }
              }
            }
          } catch (e) {
            console.warn(`[${race.id}/${eventType}] Jolpi fallback failed:`, e);
          }
        }

        // ── Upsert results ────────────────────────────────
        let rowsUpserted = 0;
        if (rows.length) {
          const upsertRows = rows
            .filter(r => r.position >= 1 && r.position <= 22)
            .map(r => ({
              race_id: race.id,
              event_type: eventType,
              driver_id: r.driver_number,
              actual_position: r.position
            }));

          if (upsertRows.length) {
            const { error } = await supabaseAdmin
              .from("results")
              .upsert(upsertRows, { onConflict: "race_id,event_type,driver_id" });

            if (error) {
              console.error(`[${race.id}/${eventType}] Upsert failed: ${error.message}`);
            } else {
              rowsUpserted = upsertRows.length;
              console.log(`[${race.id}/${eventType}] Saved ${rowsUpserted} results ✓`);
            }
          }
        } else {
          console.log(`[${race.id}/${eventType}] No results available from either API yet`);
        }

        // ── Log every attempt so we can measure API publish delay ─
        await supabaseAdmin.from("results_sync_log").insert({
          race_id: race.id,
          event_type: eventType,
          openf1_count: openf1Count,
          jolpi_count: jolpiCount,
          rows_upserted: rowsUpserted,
          source
        });
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
