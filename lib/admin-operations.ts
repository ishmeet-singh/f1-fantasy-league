import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { EventType } from "@/lib/types";

export type AdminCronRun = {
  id: number;
  job: "sync-results" | "send-reminders" | "sync-calendar" | "recompute";
  status: "running" | "ok" | "error";
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  summary: Record<string, unknown> | null;
};

export type AdminProviderAttempt = {
  raceId: string;
  eventType: EventType;
  attemptedAt: string;
  openf1Count: number;
  jolpiCount: number;
  rowsPublished: number;
  source: "openf1" | "jolpi" | "none";
  error: string | null;
};

export type AdminSessionOperations = {
  eventType: EventType;
  startsAt: string;
  publication: {
    source: "openf1" | "jolpi" | "manual" | "backfill";
    resultCount: number;
    lastSyncedAt: string;
    scoreUpdatedAt: string | null;
  } | null;
  lastAttempt: AdminProviderAttempt | null;
};

export type AdminRaceOperations = {
  id: string;
  grandPrix: string;
  raceStart: string;
  sessions: AdminSessionOperations[];
};

export type AdminRaceEntrySync = {
  id: number;
  raceId: string;
  source: "fia" | "openf1-session";
  documentUrl: string | null;
  attemptedAt: string;
  status: "updated" | "unchanged" | "rejected" | "error";
  entryCount: number;
  addedDriverIds: string[];
  removedDriverIds: string[];
  affectedPredictionRows: number;
  error: string | null;
};

export type AdminCalendarChange = {
  id: number;
  raceId: string;
  grandPrix: string;
  changeType: "added" | "timing-changed" | "removed" | "removal-blocked";
  detectedAt: string;
  affectedPredictionRows: number;
};

export type AdminOperationsData = {
  generatedAt: string;
  cronRuns: AdminCronRun[];
  races: AdminRaceOperations[];
  raceEntrySyncs: AdminRaceEntrySync[];
  calendarChanges: AdminCalendarChange[];
};

type RaceRow = {
  id: string;
  grand_prix: string;
  quali_start: string;
  sprint_start: string | null;
  race_start: string;
};

export async function getAdminOperationsData(): Promise<AdminOperationsData> {
  const supabase = getSupabaseAdmin();
  const [
    { data: races, error: racesError },
    { data: sessions, error: sessionsError },
    cron,
    attempts,
    entrySyncs,
    calendarChanges
  ] = await Promise.all([
      supabase
        .from("race_weekends")
        .select("id,grand_prix,quali_start,sprint_start,race_start")
        .not("id", "like", "jolpi-%")
        .not("id", "like", "test-%")
        .order("race_start", { ascending: true }),
      supabase
        .from("result_sessions")
        .select("race_id,event_type,source,result_count,last_synced_at,score_updated_at")
        .order("last_synced_at", { ascending: false }),
      supabase
        .from("cron_runs")
        .select("id,job,status,started_at,finished_at,error,summary")
        .order("started_at", { ascending: false })
        .limit(60),
      supabase
        .from("results_sync_log")
        .select("race_id,event_type,attempted_at,openf1_count,jolpi_count,rows_upserted,source,error")
        .order("attempted_at", { ascending: false })
        .limit(500),
      supabase
        .from("race_entry_sync_log")
        .select(
          "id,race_id,source,document_url,attempted_at,status,entry_count,added_driver_ids,removed_driver_ids,affected_prediction_rows,error"
        )
        .order("attempted_at", { ascending: false })
        .limit(100),
      supabase
        .from("calendar_sync_log")
        .select("id,race_id,grand_prix,change_type,detected_at,affected_prediction_rows")
        .order("detected_at", { ascending: false })
        .limit(100)
    ]);

  if (racesError) throw new Error(`Race operations: ${racesError.message}`);
  if (sessionsError) throw new Error(`Session operations: ${sessionsError.message}`);
  if (cron.error) throw new Error(`Cron operations: ${cron.error.message}`);
  if (attempts.error) throw new Error(`Provider operations: ${attempts.error.message}`);
  if (entrySyncs.error) throw new Error(`Race entry operations: ${entrySyncs.error.message}`);
  if (calendarChanges.error) throw new Error(`Calendar operations: ${calendarChanges.error.message}`);

  const publicationBySession = new Map(
    (sessions ?? []).map((session) => [
      `${session.race_id}:${session.event_type}`,
      {
        source: session.source as "openf1" | "jolpi" | "manual" | "backfill",
        resultCount: session.result_count,
        lastSyncedAt: session.last_synced_at,
        scoreUpdatedAt: session.score_updated_at
      }
    ])
  );

  const latestAttemptBySession = new Map<string, AdminProviderAttempt>();
  for (const attempt of attempts.data ?? []) {
    const key = `${attempt.race_id}:${attempt.event_type}`;
    if (latestAttemptBySession.has(key)) continue;
    latestAttemptBySession.set(key, {
      raceId: attempt.race_id,
      eventType: attempt.event_type as EventType,
      attemptedAt: attempt.attempted_at,
      openf1Count: attempt.openf1_count,
      jolpiCount: attempt.jolpi_count,
      rowsPublished: attempt.rows_upserted,
      source: attempt.source as AdminProviderAttempt["source"],
      error: attempt.error
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    cronRuns: (cron.data ?? []).map((run) => ({
      id: run.id,
      job: run.job as AdminCronRun["job"],
      status: run.status as AdminCronRun["status"],
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      error: run.error,
      summary: run.summary as Record<string, unknown> | null
    })),
    raceEntrySyncs: (entrySyncs.data ?? []).map((sync) => ({
      id: sync.id,
      raceId: sync.race_id,
      source: sync.source as AdminRaceEntrySync["source"],
      documentUrl: sync.document_url,
      attemptedAt: sync.attempted_at,
      status: sync.status as AdminRaceEntrySync["status"],
      entryCount: sync.entry_count,
      addedDriverIds: sync.added_driver_ids ?? [],
      removedDriverIds: sync.removed_driver_ids ?? [],
      affectedPredictionRows: sync.affected_prediction_rows,
      error: sync.error
    })),
    calendarChanges: (calendarChanges.data ?? []).map((change) => ({
      id: change.id,
      raceId: change.race_id,
      grandPrix: change.grand_prix,
      changeType: change.change_type as AdminCalendarChange["changeType"],
      detectedAt: change.detected_at,
      affectedPredictionRows: change.affected_prediction_rows
    })),
    races: ((races ?? []) as RaceRow[]).map((race) => {
      const sessionStarts: Array<{ eventType: EventType; startsAt: string }> = [
        { eventType: "quali", startsAt: race.quali_start },
        ...(race.sprint_start
          ? [{ eventType: "sprint" as const, startsAt: race.sprint_start }]
          : []),
        { eventType: "race", startsAt: race.race_start }
      ];

      return {
        id: race.id,
        grandPrix: race.grand_prix,
        raceStart: race.race_start,
        sessions: sessionStarts.map(({ eventType, startsAt }) => {
          const key = `${race.id}:${eventType}`;
          return {
            eventType,
            startsAt,
            publication: publicationBySession.get(key) ?? null,
            lastAttempt: latestAttemptBySession.get(key) ?? null
          };
        })
      };
    })
  };
}
