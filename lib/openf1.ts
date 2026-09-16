import { EventType } from "@/lib/types";
import { requireEnv } from "@/lib/env";
import { openF1AuthHeaders } from "@/lib/openf1-token";

function getOpenF1BaseUrl() {
  return requireEnv("OPENF1_BASE_URL").replace(/\/$/, "");
}

export type OpenF1Driver = {
  driver_number: number | string;
  full_name: string;
  team_name?: string | null;
};

export type OpenF1Meeting = {
  meeting_key: number | string;
  meeting_name: string;
  date_start: string;
};

export type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end?: string | null;
  is_cancelled?: boolean;
};

type OpenF1Classification = {
  driver_number: number | string;
  position?: number | string | null;
};

async function fetchJson<T>(path: string, retries = 1): Promise<T> {
  const base = getOpenF1BaseUrl();
  const headers = await openF1AuthHeaders(base);
  const res = await fetch(`${base}${path}`, { next: { revalidate: 0 }, headers });

  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 2000));
    return fetchJson<T>(path, retries - 1);
  }

  const text = await res.text();
  if (!res.ok) {
    let detail = "";
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* ignore */
    }
    const hint =
      res.status === 401 && !process.env.OPENF1_USERNAME
        ? " Set OPENF1_USERNAME and OPENF1_PASSWORD (OpenF1 sponsor account) for access during live sessions."
        : "";
    throw new Error(
      `OpenF1 fetch failed: ${res.status}${detail ? ` — ${detail}` : ""}${text && !detail ? ` — ${text.slice(0, 300)}` : ""}${hint}`
    );
  }

  return JSON.parse(text) as T;
}

/**
 * Authenticated GET (same headers as internal fetchJson). For admin routes that
 * call OpenF1 outside this module.
 */
export async function openF1Get(path: string): Promise<Response> {
  const base = getOpenF1BaseUrl();
  const headers = await openF1AuthHeaders(base);
  return fetch(`${base}${path}`, { next: { revalidate: 0 }, headers });
}

export async function fetchDrivers() {
  return fetchJson<OpenF1Driver[]>("/v1/drivers?session_key=latest");
}

export async function fetchDriversForSession(sessionKey: number) {
  return fetchJson<OpenF1Driver[]>(`/v1/drivers?session_key=${sessionKey}`);
}

export async function fetchMeetings(year: number) {
  return fetchJson<OpenF1Meeting[]>(`/v1/meetings?year=${year}`);
}

export async function fetchSessionsForMeeting(meetingKey: number) {
  return fetchJson<OpenF1Session[]>(`/v1/sessions?meeting_key=${meetingKey}`);
}

const COMPETITIVE_SESSION_NAMES = new Set([
  "Sprint Qualifying",
  "Sprint Shootout",
  "Sprint",
  "Qualifying",
  "Race"
]);

export function selectLatestStartedCompetitiveSession(
  sessions: ReadonlyArray<OpenF1Session>,
  nowMs = Date.now()
): OpenF1Session | null {
  return (
    sessions
      .filter(
        (session) =>
          COMPETITIVE_SESSION_NAMES.has(session.session_name) &&
          Number.isFinite(Date.parse(session.date_start)) &&
          Date.parse(session.date_start) <= nowMs
      )
      .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))[0] ?? null
  );
}

export async function fetchObservedCompetitionDrivers(
  meetingKey: number,
  nowMs = Date.now()
): Promise<{ session: OpenF1Session; drivers: OpenF1Driver[] } | null> {
  const sessions = await fetchSessionsForMeeting(meetingKey);
  const session = selectLatestStartedCompetitiveSession(sessions, nowMs);
  if (!session) return null;

  const drivers = await fetchDriversForSession(session.session_key);
  const uniqueDrivers = new Map(
    drivers
      .filter((driver) => String(driver.driver_number).trim() && driver.full_name?.trim())
      .map((driver) => [String(driver.driver_number), driver])
  );
  if (uniqueDrivers.size < 20) return null;

  return { session, drivers: [...uniqueDrivers.values()] };
}

export function isSessionResultPublicationReady(
  dateEnd: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!dateEnd) return false;
  const sessionEnd = Date.parse(dateEnd);
  return Number.isFinite(sessionEnd) && nowMs >= sessionEnd + 60 * 60 * 1000;
}

export function hasPublishedClassificationCoverage(
  classificationDriverIds: ReadonlyArray<string>,
  sessionDriverIds: ReadonlyArray<string>
): boolean {
  const classified = new Set(classificationDriverIds).size;
  const sessionDrivers = new Set(sessionDriverIds).size;
  return sessionDrivers > 0 && classified >= sessionDrivers;
}

export async function fetchSessionResults(meetingKey: number, eventType: EventType) {
  const sessionName = eventType === "quali" ? "Qualifying" : eventType === "sprint" ? "Sprint" : "Race";
  const sessions = await fetchJson<OpenF1Session[]>(
    `/v1/sessions?meeting_key=${meetingKey}&session_name=${encodeURIComponent(sessionName)}`
  );

  if (!sessions[0]?.session_key) return [];
  if (!isSessionResultPublicationReady(sessions[0].date_end)) {
    return [];
  }

  const [classifications, sessionDrivers] = await Promise.all([
    fetchJson<OpenF1Classification[]>(`/v1/session_result?session_key=${sessions[0].session_key}`),
    fetchJson<OpenF1Driver[]>(`/v1/drivers?session_key=${sessions[0].session_key}`)
  ]);
  const sessionDriverCount = new Set(
    sessionDrivers.map((driver) => String(driver.driver_number))
  ).size;
  if (
    !hasPublishedClassificationCoverage(
      classifications.map((row) => String(row.driver_number)),
      sessionDrivers.map((driver) => String(driver.driver_number))
    )
  ) {
    console.warn(
      `[OpenF1/${sessions[0].session_key}] Classification is not stable yet (${classifications.length}/${sessionDriverCount} drivers)`
    );
    return [];
  }
  return classifications.flatMap((row) => {
    const position = Number(row.position);
    if (!Number.isInteger(position) || position < 1) {
      console.warn(
        `[OpenF1/${sessions[0].session_key}] Ignoring invalid classification position for driver ${row.driver_number}`
      );
      return [];
    }
    return [{ driver_number: String(row.driver_number), position }];
  });
}
