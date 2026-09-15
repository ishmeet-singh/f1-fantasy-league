import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { EventType } from "@/lib/types";

export const RESULT_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type ResultSessionRow = {
  race_id: string;
  event_type: EventType;
  status: "official";
  source: "openf1" | "jolpi" | "manual" | "backfill";
  result_count: number;
  last_synced_at: string;
  score_updated_at: string | null;
};

export function recentlySyncedEventTypes(
  rows: ReadonlyArray<Pick<ResultSessionRow, "event_type" | "status" | "last_synced_at">>,
  nowMs: number,
  refreshIntervalMs = RESULT_REFRESH_INTERVAL_MS
): Set<EventType> {
  return new Set(
    rows
      .filter(
        (row) =>
          row.status === "official" &&
          Number.isFinite(Date.parse(row.last_synced_at)) &&
          Date.parse(row.last_synced_at) > nowMs - refreshIntervalMs
      )
      .map((row) => row.event_type)
  );
}

export async function replaceSessionResultsAndPublish(input: {
  raceId: string;
  eventType: EventType;
  source: "openf1" | "jolpi" | "manual";
  results: ReadonlyArray<{ driverId: string; actualPosition: number }>;
}): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "replace_session_results_and_publish",
    {
      p_race_id: input.raceId,
      p_event_type: input.eventType,
      p_source: input.source,
      p_results: input.results.map((result) => ({
        driver_id: result.driverId,
        actual_position: result.actualPosition
      }))
    }
  );

  if (error) {
    throw new Error(
      `[${input.raceId}/${input.eventType}] result publication: ${error.message}`
    );
  }
  return Number(data ?? 0);
}

export async function markRaceSessionsScored(raceId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("result_sessions")
    .update({ score_updated_at: new Date().toISOString() })
    .eq("race_id", raceId)
    .eq("status", "official");

  if (error) {
    throw new Error(`[${raceId}] result session scoring status: ${error.message}`);
  }
}
