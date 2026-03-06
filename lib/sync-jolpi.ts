import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeAllScores } from "@/lib/recompute";
import {
  fetchJolpiRaces,
  fetchJolpiDriverStandings,
  fetchAllJolpiRaceResults,
  fetchAllJolpiQualiResults,
  fetchAllJolpiSprintResults,
  jolpiRaceId,
  type JolpiDriverStanding
} from "@/lib/jolpi";

function isoDateTime(date: string, time: string) {
  // date = "2026-03-08", time = "04:00:00Z"
  return `${date}T${time.endsWith("Z") ? time : time + "Z"}`;
}

export async function syncCalendarJolpi(year = new Date().getUTCFullYear()) {
  const supabase = getSupabaseAdmin();
  const [races, standings] = await Promise.all([
    fetchJolpiRaces(year),
    fetchJolpiDriverStandings(year)
  ]);

  // Build driver->team map from standings (if standings exist)
  const teamByDriver = new Map<string, string>();
  for (const s of standings) {
    teamByDriver.set(s.Driver.driverId, s.Constructors?.[0]?.name || "");
  }

  // Upsert drivers — use standings if available, otherwise driver list from standings
  const driversToSync: JolpiDriverStanding[] = standings.length > 0
    ? standings
    : [];

  for (const s of driversToSync) {
    await supabase.from("drivers").upsert({
      id: s.Driver.driverId,
      name: `${s.Driver.givenName} ${s.Driver.familyName}`,
      team: s.Constructors?.[0]?.name || "TBD"
    });
  }

  // Upsert race weekends
  for (const race of races) {
    const raceStart = isoDateTime(race.date, race.time);
    const qualiStart = race.Qualifying
      ? isoDateTime(race.Qualifying.date, race.Qualifying.time)
      : raceStart;
    const sprintStart = race.Sprint
      ? isoDateTime(race.Sprint.date, race.Sprint.time)
      : null;

    await supabase.from("race_weekends").upsert({
      id: jolpiRaceId(year, race.round),
      grand_prix: race.raceName,
      race_date: raceStart,
      quali_start: qualiStart,
      sprint_start: sprintStart,
      race_start: raceStart,
      has_sprint: Boolean(sprintStart)
    });
  }
}

export async function syncResultsJolpi() {
  const supabase = getSupabaseAdmin();
  const now = Date.now();

  // Find all Jolpi races in DB, grouped by year
  const { data: races } = await supabase
    .from("race_weekends")
    .select("id,has_sprint,race_start")
    .like("id", "jolpi-%");

  const jolpiRaces = races ?? [];
  if (!jolpiRaces.length) return;

  // Group races by year so we make at most 3 API calls per year (not per race)
  const racesByYear = new Map<number, typeof jolpiRaces>();
  for (const race of jolpiRaces) {
    const parts = String(race.id).split("-"); // "jolpi-2026-3"
    const year = Number(parts[1]);
    if (!year) continue;
    if (!racesByYear.has(year)) racesByYear.set(year, []);
    racesByYear.get(year)!.push(race);
  }

  let anyResults = false;

  for (const [year, yearRaces] of racesByYear) {
    // One bulk call per event type for the whole year — much faster than per-round calls
    const [allRace, allQuali, allSprint] = await Promise.all([
      fetchAllJolpiRaceResults(year),
      fetchAllJolpiQualiResults(year),
      fetchAllJolpiSprintResults(year)
    ]);

    for (const race of yearRaces) {
      const raceTime = new Date(race.race_start).getTime();
      // Skip races that finished more than 7 days ago (results already synced)
      if (Number.isFinite(raceTime) && now - raceTime > 7 * 24 * 60 * 60 * 1000) continue;

      const parts = String(race.id).split("-");
      const round = parts[2];

      type EventPair = { eventType: "quali" | "sprint" | "race"; rows: { driverId: string; position: number; team: string }[] };
      const events: EventPair[] = [
        { eventType: "quali", rows: allQuali.get(round) ?? [] },
        { eventType: "race", rows: allRace.get(round) ?? [] },
        ...(race.has_sprint ? [{ eventType: "sprint" as const, rows: allSprint.get(round) ?? [] }] : [])
      ];

      for (const { eventType, rows } of events) {
        if (!rows.length) continue;
        anyResults = true;

        // Enrich driver teams from results
        for (const row of rows) {
          if (row.team) {
            await supabase.from("drivers").update({ team: row.team }).eq("id", row.driverId).eq("team", "TBD");
          }
        }

        for (const row of rows) {
          await supabase.from("results").upsert({
            race_id: race.id,
            event_type: eventType,
            driver_id: row.driverId,
            actual_position: row.position
          });
        }
      }
    }
  }

  if (anyResults) await recomputeAllScores();
}
