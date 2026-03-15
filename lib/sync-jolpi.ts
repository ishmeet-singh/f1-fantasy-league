import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recomputeAllScores } from "@/lib/recompute";
import {
  fetchJolpiRaces,
  fetchJolpiDriverStandings,
  fetchJolpiDrivers,
  fetchAllJolpiRaceResults,
  fetchAllJolpiQualiResults,
  fetchAllJolpiSprintResults,
  jolpiRaceId
} from "@/lib/jolpi";

function isoDateTime(date: string, time: string) {
  // date = "2026-03-08", time = "04:00:00Z"
  return `${date}T${time.endsWith("Z") ? time : time + "Z"}`;
}

export async function syncCalendarJolpi(year = new Date().getUTCFullYear()) {
  const supabase = getSupabaseAdmin();
  const [races, standings, driverList] = await Promise.all([
    fetchJolpiRaces(year),
    fetchJolpiDriverStandings(year),
    fetchJolpiDrivers(year)
  ]);

  // Sync drivers: standings have team info (mid/end season), driver list covers pre-season
  if (standings.length > 0) {
    // Standings: have team info
    const driverRows = standings.map((s) => ({
      id: s.Driver.driverId,
      name: `${s.Driver.givenName} ${s.Driver.familyName}`,
      team: s.Constructors?.[0]?.name || "TBD"
    }));
    if (driverRows.length) {
      await supabase.from("drivers").upsert(driverRows, { onConflict: "id" });
    }
  } else if (driverList.length > 0) {
    // Pre-season: no standings yet, but driver list is available
    const driverRows = driverList.map((d) => ({
      id: d.driverId,
      name: `${d.givenName} ${d.familyName}`,
      team: "TBD"
    }));
    await supabase.from("drivers").upsert(driverRows, { onConflict: "id" });
  }

  // Upsert race weekends in a single batch
  const raceRows = races.map((race) => {
    const raceStart = isoDateTime(race.date, race.time);
    const qualiStart = race.Qualifying
      ? isoDateTime(race.Qualifying.date, race.Qualifying.time)
      : raceStart;
    const sprintStart = race.Sprint
      ? isoDateTime(race.Sprint.date, race.Sprint.time)
      : null;
    return {
      id: jolpiRaceId(year, race.round),
      grand_prix: race.raceName,
      race_date: raceStart,
      quali_start: qualiStart,
      sprint_start: sprintStart,
      race_start: raceStart,
      has_sprint: Boolean(sprintStart)
    };
  });

  if (raceRows.length) {
    const { error } = await supabase
      .from("race_weekends")
      .upsert(raceRows, { onConflict: "id" });
    if (error) throw new Error(`race_weekends upsert failed: ${error.message}`);
  }
}

export async function syncResultsJolpi() {
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();

  // Find ALL races in the sync window — both Jolpi-ID and OpenF1-ID races.
  // OpenF1-ID races (e.g. id="1280") fall back to Jolpi when OpenF1 is rate-limited.
  const { data: races } = await supabase
    .from("race_weekends")
    .select("id,has_sprint,race_start")
    .gte("race_start", windowStart)
    .lte("race_start", windowEnd);

  const allRaces = races ?? [];
  if (!allRaces.length) return;

  // Build driver name→number lookup for OpenF1-ID races (Jolpi uses driverId strings,
  // but the results table uses OpenF1 driver_numbers as driver_id foreign key)
  const { data: dbDrivers } = await supabase.from("drivers").select("id,name");
  const jolpiIdToDriverNum = new Map<string, string>();
  for (const d of dbDrivers ?? []) {
    const lastName = d.name.split(" ").pop()?.toLowerCase() ?? "";
    jolpiIdToDriverNum.set(lastName, d.id);
    jolpiIdToDriverNum.set(d.name.toLowerCase().replace(/\s+/g, "_"), d.id);
  }

  // Group races by year
  const racesByYear = new Map<number, typeof allRaces>();
  for (const race of allRaces) {
    const year = new Date(race.race_start).getUTCFullYear();
    if (!racesByYear.has(year)) racesByYear.set(year, []);
    racesByYear.get(year)!.push(race);
  }

  let anyResults = false;

  for (const [year, yearRaces] of racesByYear) {
    // One bulk call per event type for the whole year
    const [allRace, allQuali, allSprint, jolpiRaceList] = await Promise.all([
      fetchAllJolpiRaceResults(year),
      fetchAllJolpiQualiResults(year),
      fetchAllJolpiSprintResults(year),
      fetchJolpiRaces(year).catch(() => [] as Awaited<ReturnType<typeof fetchJolpiRaces>>)
    ]);

    for (const race of yearRaces) {
      // Determine the Jolpi round for this race
      let round: string | null = null;

      if (String(race.id).startsWith("jolpi-")) {
        // Jolpi-ID races: round is embedded in the id
        round = String(race.id).split("-")[2];
      } else {
        // OpenF1-ID races: find matching Jolpi round by date
        const target = new Date(race.race_start).getTime();
        const match = jolpiRaceList.find(r => {
          const raceTime = new Date(`${r.date}T${r.time.endsWith("Z") ? r.time : r.time + "Z"}`).getTime();
          return Math.abs(raceTime - target) < 2 * 24 * 60 * 60 * 1000;
        });
        round = match?.round ?? null;
      }

      if (!round) {
        console.log(`[jolpi/${race.id}] No matching Jolpi round found`);
        continue;
      }

      const isOpenF1Race = !String(race.id).startsWith("jolpi-");

      type EventPair = { eventType: "quali" | "sprint" | "race"; rows: { driverId: string; position: number; team: string }[] };
      const events: EventPair[] = [
        { eventType: "quali", rows: allQuali.get(round) ?? [] },
        { eventType: "race", rows: allRace.get(round) ?? [] },
        ...(race.has_sprint ? [{ eventType: "sprint" as const, rows: allSprint.get(round) ?? [] }] : [])
      ];

      for (const { eventType, rows } of events) {
        if (!rows.length) continue;
        anyResults = true;

        let resultRows: { race_id: string; event_type: string; driver_id: string; actual_position: number }[];

        if (isOpenF1Race) {
          // Map Jolpi driverId strings to OpenF1 driver_numbers
          resultRows = rows
            .map(row => {
              const lastName = row.driverId.split("_").pop() ?? row.driverId;
              const driverNum = jolpiIdToDriverNum.get(lastName.toLowerCase())
                ?? jolpiIdToDriverNum.get(row.driverId.toLowerCase());
              if (!driverNum) {
                console.warn(`[jolpi/${race.id}/${eventType}] No driver_number for: ${row.driverId}`);
                return null;
              }
              return { race_id: String(race.id), event_type: eventType, driver_id: driverNum, actual_position: row.position };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);
        } else {
          resultRows = rows.map(row => ({
            race_id: String(race.id),
            event_type: eventType,
            driver_id: row.driverId,
            actual_position: row.position
          }));
        }

        if (!resultRows.length) continue;

        const { error: resultsError } = await supabase
          .from("results")
          .upsert(resultRows, { onConflict: "race_id,event_type,driver_id" });
        if (resultsError) {
          console.error(`[jolpi/${race.id}/${eventType}] upsert error:`, resultsError.message);
        } else {
          console.log(`[jolpi/${race.id}/${eventType}] saved ${resultRows.length} results`);
        }

        if (!isOpenF1Race) {
          // Enrich driver teams for Jolpi-ID races
          for (const row of rows.filter(r => r.team)) {
            await supabase.from("drivers")
              .update({ team: row.team })
              .eq("id", row.driverId)
              .eq("team", "TBD");
          }
        }
      }
    }
  }

  if (anyResults) await recomputeAllScores();
}
