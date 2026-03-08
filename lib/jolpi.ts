const BASE = "https://api.jolpi.ca/ergast/f1";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Jolpi fetch failed: ${res.status} ${path}`);
  return res.json();
}

// ---- Types ----

export type JolpiRace = {
  round: string;
  raceName: string;
  Circuit: { Location: { locality: string; country: string } };
  date: string;
  time: string;
  Qualifying: { date: string; time: string };
  Sprint?: { date: string; time: string };
  SprintQualifying?: { date: string; time: string };
};

type JolpiRacesResponse = {
  MRData: { total: string; RaceTable: { Races: JolpiRace[] } };
};

export type JolpiDriverStanding = {
  Driver: { driverId: string; givenName: string; familyName: string; code?: string };
  Constructors: { name: string }[];
};

type JolpiStandingsResponse = {
  MRData: {
    StandingsTable: {
      StandingsLists: { DriverStandings: JolpiDriverStanding[] }[];
    };
  };
};

export type JolpiResultRow = {
  position: string;
  Driver: { driverId: string };
  Constructor: { name: string };
};

type JolpiBulkRace = {
  round: string;
  Results?: JolpiResultRow[];
  QualifyingResults?: JolpiResultRow[];
  SprintResults?: JolpiResultRow[];
};

type JolpiBulkResponse = {
  MRData: { total: string; RaceTable: { Races: JolpiBulkRace[] } };
};

// ---- API calls ----

export async function fetchJolpiRaces(year: number): Promise<JolpiRace[]> {
  const data = await fetchJson<JolpiRacesResponse>(`/f1/${year}/races/?limit=100`);
  return data.MRData.RaceTable.Races;
}

export async function fetchJolpiDriverStandings(year: number): Promise<JolpiDriverStanding[]> {
  try {
    const data = await fetchJson<JolpiStandingsResponse>(`/f1/${year}/driverstandings/?limit=100`);
    return data.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings ?? [];
  } catch {
    return [];
  }
}

type JolpiDriverEntry = {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
};
type JolpiDriversResponse = { MRData: { DriverTable: { Drivers: JolpiDriverEntry[] } } };

// Fetch full driver list for a season — works even before standings exist
export async function fetchJolpiDrivers(year: number): Promise<JolpiDriverEntry[]> {
  try {
    const data = await fetchJson<JolpiDriversResponse>(`/f1/${year}/drivers/?limit=100`);
    return data.MRData.DriverTable.Drivers ?? [];
  } catch {
    return [];
  }
}

// Bulk fetchers — one call per event type, returns results grouped by round
export type BulkResultsByRound = Map<string, { driverId: string; position: number; team: string }[]>;

async function fetchBulkResults(year: number, endpoint: string, resultKey: keyof JolpiBulkRace): Promise<BulkResultsByRound> {
  const map: BulkResultsByRound = new Map();
  try {
    // limit=500 covers an entire season (20 drivers × 24 races = 480 max)
    const data = await fetchJson<JolpiBulkResponse>(`/f1/${year}/${endpoint}?limit=500`);
    for (const race of data.MRData.RaceTable.Races) {
      const rows = (race[resultKey] as JolpiResultRow[] | undefined) ?? [];
      map.set(race.round, rows.map((r) => ({
        driverId: r.Driver.driverId,
        position: Number(r.position) || 20,
        team: r.Constructor.name
      })));
    }
  } catch (err) {
    console.error(`fetchBulkResults(${endpoint}) failed:`, err);
  }
  return map;
}

export async function fetchAllJolpiRaceResults(year: number): Promise<BulkResultsByRound> {
  return fetchBulkResults(year, "results/", "Results");
}

export async function fetchAllJolpiQualiResults(year: number): Promise<BulkResultsByRound> {
  return fetchBulkResults(year, "qualifying/", "QualifyingResults");
}

export async function fetchAllJolpiSprintResults(year: number): Promise<BulkResultsByRound> {
  return fetchBulkResults(year, "sprint/", "SprintResults");
}

// Jolpi race IDs use the format "jolpi-{year}-{round}" to avoid collisions with OpenF1 meeting keys
export function jolpiRaceId(year: number, round: string) {
  return `jolpi-${year}-${round}`;
}

// Find the Jolpi round number that matches a given race date (±2 days tolerance)
// Used to cross-reference OpenF1 races with Jolpi results
export async function findJolpiRoundByDate(year: number, raceDateIso: string): Promise<string | null> {
  try {
    const races = await fetchJolpiRaces(year);
    const target = new Date(raceDateIso).getTime();
    const match = races.find(r => {
      const raceTime = new Date(`${r.date}T${r.time.endsWith("Z") ? r.time : r.time + "Z"}`).getTime();
      return Math.abs(raceTime - target) < 2 * 24 * 60 * 60 * 1000; // within 2 days
    });
    return match?.round ?? null;
  } catch {
    return null;
  }
}
