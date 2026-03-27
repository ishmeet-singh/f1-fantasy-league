import { EventType } from "@/lib/types";
import { requireEnv } from "@/lib/env";

function getOpenF1BaseUrl() {
  return requireEnv("OPENF1_BASE_URL");
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
  const res = await fetch(`${getOpenF1BaseUrl()}${path}`, { next: { revalidate: 0 } });
  if (res.status === 429 && retries > 0) {
    // Rate limited — wait 2s and retry once (keep well within Vercel's 10s function limit)
    await new Promise(r => setTimeout(r, 2000));
    return fetchJson<T>(path, retries - 1);
  }
  if (!res.ok) {
    throw new Error(`OpenF1 fetch failed: ${res.status}`);
  }
  return res.json();
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
