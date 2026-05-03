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

type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
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

export async function fetchMeetings(year: number) {
  return fetchJson<OpenF1Meeting[]>(`/v1/meetings?year=${year}`);
}

export async function fetchSessionsForMeeting(meetingKey: number) {
  return fetchJson<OpenF1Session[]>(`/v1/sessions?meeting_key=${meetingKey}`);
}

export async function fetchSessionResults(meetingKey: number, eventType: EventType) {
  const sessionName = eventType === "quali" ? "Qualifying" : eventType === "sprint" ? "Sprint" : "Race";
  const sessions = await fetchJson<OpenF1Session[]>(
    `/v1/sessions?meeting_key=${meetingKey}&session_name=${encodeURIComponent(sessionName)}`
  );

  if (!sessions[0]?.session_key) return [];

  const classifications = await fetchJson<OpenF1Classification[]>(`/v1/session_result?session_key=${sessions[0].session_key}`);
  return classifications.map((row) => ({
    driver_number: String(row.driver_number),
    position: Number(row.position) || 20
  }));
}
