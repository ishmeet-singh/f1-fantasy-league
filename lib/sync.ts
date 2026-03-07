import { fetchDrivers, fetchMeetings, fetchSessionResults, fetchSessionsForMeeting } from "@/lib/openf1";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeAllScores } from "@/lib/recompute";
import { EventType } from "@/lib/types";
import { syncCalendarJolpi, syncResultsJolpi } from "@/lib/sync-jolpi";

const eventTypes: EventType[] = ["quali", "sprint", "race"];

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
  const { data: races } = await supabaseAdmin
    .from("race_weekends")
    .select("id,has_sprint,race_start")
    .not("id", "like", "jolpi-%"); // skip Jolpi-sourced races

  if (!races) return;

  for (const race of races) {
    const raceTime = new Date(race.race_start).getTime();
    const now = Date.now();
    if (Number.isFinite(raceTime) && now - raceTime > 48 * 60 * 60 * 1000) continue;

    for (const eventType of eventTypes) {
      if (eventType === "sprint" && !race.has_sprint) continue;
      const rows = await fetchSessionResults(Number(race.id), eventType);
      for (const row of rows) {
        await supabaseAdmin.from("results").upsert({
          race_id: race.id,
          event_type: eventType,
          driver_id: row.driver_number,
          actual_position: row.position || 20
        });
      }
    }
  }
}

export async function syncResults() {
  // Run both in parallel — OpenF1 handles its own races, Jolpi handles its own races
  const results = await Promise.allSettled([
    syncResultsOpenF1(),
    syncResultsJolpi()
  ]);

  for (const r of results) {
    if (r.status === "rejected") {
      console.warn("Results sync partial failure:", r.reason);
    }
  }

  await recomputeAllScores();
}
