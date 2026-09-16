"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocalTime } from "@/components/local-time";
import { F1 } from "@/lib/f1-theme";
import type {
  AdminCronRun,
  AdminCalendarChange,
  AdminOperationsData,
  AdminProviderAttempt,
  AdminRaceEntrySync,
  AdminSessionOperations
} from "@/lib/admin-operations";

const JOBS = [
  { id: "sync-results", label: "Result sync", cadence: "Frequent schedule", overdueMs: 30 * 60 * 1000 },
  { id: "send-reminders", label: "Reminders", cadence: "Frequent schedule", overdueMs: 30 * 60 * 1000 },
  { id: "sync-calendar", label: "Calendar sync", cadence: "Every 6 hours", overdueMs: 9 * 60 * 60 * 1000 },
  { id: "recompute", label: "Score repair", cadence: "On demand", overdueMs: null }
] as const;

const EVENT_LABELS = { quali: "Qualifying", sprint: "Sprint", race: "Race" } as const;
const SOURCE_LABELS = {
  openf1: "OpenF1",
  jolpi: "Jolpi",
  manual: "Manual",
  backfill: "Backfill"
} as const;
const ENTRY_SOURCE_LABELS = {
  fia: "FIA entry list",
  "openf1-session": "OpenF1 session"
} as const;

function entrySyncTone(sync: AdminRaceEntrySync): Tone {
  if (sync.status === "error") return "bad";
  if (sync.status === "rejected") return "warning";
  return "good";
}

function calendarChangeState(change: AdminCalendarChange): { label: string; tone: Tone } {
  if (change.changeType === "removal-blocked") {
    return { label: "Review needed", tone: "bad" };
  }
  if (change.changeType === "timing-changed") {
    return { label: "Times updated", tone: "info" };
  }
  if (change.changeType === "removed") {
    return { label: "Race removed", tone: "warning" };
  }
  return { label: "Race added", tone: "good" };
}

type Tone = "good" | "warning" | "bad" | "neutral" | "info";

const TONES: Record<Tone, { background: string; color: string; border: string }> = {
  good: { background: "#ECFDF5", color: "#166534", border: "#BBF7D0" },
  warning: { background: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  bad: { background: "#FEF2F2", color: "#B91C1C", border: "#FECACA" },
  neutral: { background: F1.offWhite, color: F1.carbonLight, border: F1.gridLine },
  info: { background: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" }
};

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const colors = TONES[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: colors.background, color: colors.color, borderColor: colors.border }}
    >
      {label}
    </span>
  );
}

function relativeTime(iso: string, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - Date.parse(iso));
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function latestRunFor(data: AdminOperationsData, job: AdminCronRun["job"]) {
  return data.cronRuns.find((run) => run.job === job) ?? null;
}

function jobState(
  run: AdminCronRun | null,
  overdueMs: number | null,
  nowMs: number
): { label: string; tone: Tone } {
  if (!run) return { label: "No history", tone: "neutral" };
  if (run.status === "running") {
    if (overdueMs && nowMs - Date.parse(run.startedAt) > overdueMs) {
      return { label: "Stuck", tone: "bad" };
    }
    return { label: "Running", tone: "info" };
  }
  if (run.status === "error") return { label: "Failed", tone: "bad" };
  if (overdueMs && nowMs - Date.parse(run.startedAt) > overdueMs) {
    return { label: "Delayed", tone: "warning" };
  }
  return { label: "Healthy", tone: "good" };
}

function providerState(
  provider: "openf1" | "jolpi",
  attempt: AdminProviderAttempt | null
): { label: string; detail: string; tone: Tone } {
  if (!attempt) return { label: "No fetch", detail: "No recorded attempt", tone: "neutral" };
  const count = provider === "openf1" ? attempt.openf1Count : attempt.jolpiCount;
  if (count > 0) {
    return { label: "Available", detail: `${count} result rows`, tone: "good" };
  }
  if (provider === "jolpi" && attempt.source === "openf1") {
    return { label: "Not needed", detail: "Primary source succeeded", tone: "neutral" };
  }
  if (attempt.error) return { label: "Fetch issue", detail: "See recent issues", tone: "bad" };
  return { label: "No results", detail: "Provider returned no rows", tone: "warning" };
}

function publicationState(session: AdminSessionOperations, nowMs: number) {
  if (session.publication) {
    return {
      label: "Published",
      detail: `${session.publication.resultCount} rows from ${SOURCE_LABELS[session.publication.source]}`,
      tone: "good" as Tone
    };
  }
  if (Date.parse(session.startsAt) > nowMs) {
    return { label: "Upcoming", detail: "Session has not started", tone: "neutral" as Tone };
  }
  return { label: "Waiting", detail: "No official classification stored", tone: "warning" as Tone };
}

function scoringState(session: AdminSessionOperations, nowMs: number) {
  if (session.publication?.scoreUpdatedAt) {
    return { label: "Current", detail: "Scores persisted", tone: "good" as Tone };
  }
  if (session.publication) {
    return { label: "Pending", detail: "Official results are not scored", tone: "bad" as Tone };
  }
  if (Date.parse(session.startsAt) > nowMs) {
    return { label: "Not due", detail: "Awaiting the session", tone: "neutral" as Tone };
  }
  return { label: "Not available", detail: "Needs official results first", tone: "neutral" as Tone };
}

function DetailCell({
  title,
  detail,
  tone
}: {
  title: string;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className="min-w-0 rounded-xl border p-3" style={{ borderColor: TONES[tone].border }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold" style={{ color: F1.carbon }}>
          {title}
        </p>
        <StatusPill label={detail.split("|")[0]} tone={tone} />
      </div>
      <p className="mt-2 text-xs" style={{ color: F1.carbonLight }}>
        {detail.split("|")[1]}
      </p>
    </div>
  );
}

export function AdminSystemDashboard({
  data,
  scoringHealth
}: {
  data: AdminOperationsData;
  scoringHealth: {
    available: boolean;
    pendingSessions: number;
    aggregateMismatches: number;
  };
}) {
  const router = useRouter();
  const [nowMs, setNowMs] = useState(() => Date.parse(data.generatedAt));
  const [refreshing, setRefreshing] = useState(false);
  const latestCompletedRace =
    [...data.races].reverse().find((race) => Date.parse(race.raceStart) <= Date.parse(data.generatedAt)) ??
    data.races[0];
  const [selectedRaceId, setSelectedRaceId] = useState(latestCompletedRace?.id ?? "");

  useEffect(() => {
    setNowMs(Date.now());
    const clock = window.setInterval(() => setNowMs(Date.now()), 30_000);
    const refresh = window.setInterval(() => router.refresh(), 60_000);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(refresh);
    };
  }, [router]);

  const selectedRace =
    data.races.find((race) => race.id === selectedRaceId) ?? latestCompletedRace ?? null;

  const recentIssues = useMemo(() => {
    const issues: Array<{ title: string; detail: string; at: string }> = [];
    for (const run of data.cronRuns) {
      if (run.status === "error" && run.error) {
        issues.push({ title: `${run.job} failed`, detail: run.error, at: run.startedAt });
      }
    }
    for (const race of data.races) {
      for (const session of race.sessions) {
        if (session.publication && !session.publication.scoreUpdatedAt) {
          issues.push({
            title: `${race.grandPrix} ${EVENT_LABELS[session.eventType]} is unscored`,
            detail: "Official results exist, but score persistence has not completed.",
            at: session.publication.lastSyncedAt
          });
        }
        if (session.lastAttempt?.error) {
          issues.push({
            title: `${race.grandPrix} ${EVENT_LABELS[session.eventType]} fetch warning`,
            detail: session.lastAttempt.error,
            at: session.lastAttempt.attemptedAt
          });
        }
      }
    }
    for (const sync of data.raceEntrySyncs) {
      if (sync.status === "rejected" || sync.status === "error") {
        issues.push({
          title: `${ENTRY_SOURCE_LABELS[sync.source]} ${sync.status}`,
          detail: sync.error ?? "The upstream roster failed its safety checks and was not applied.",
          at: sync.attemptedAt
        });
      }
    }
    for (const change of data.calendarChanges) {
      if (change.changeType === "removal-blocked") {
        issues.push({
          title: `${change.grandPrix} removal needs review`,
          detail: `${change.affectedPredictionRows} prediction or result rows prevented automatic deletion.`,
          at: change.detectedAt
        });
      }
    }
    return issues.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6);
  }, [data]);

  const lastProviderAttempt = data.races
    .flatMap((race) => race.sessions.map((session) => session.lastAttempt))
    .filter((attempt): attempt is AdminProviderAttempt => Boolean(attempt))
    .sort((a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt))[0] ?? null;
  const lastEntrySync = data.raceEntrySyncs[0] ?? null;

  const overallHealthy =
    scoringHealth.available &&
    scoringHealth.pendingSessions === 0 &&
    scoringHealth.aggregateMismatches === 0 &&
    (!lastEntrySync || !["error", "rejected"].includes(lastEntrySync.status)) &&
    JOBS.filter((job) => job.overdueMs !== null).every(
      (job) => jobState(latestRunFor(data, job.id), job.overdueMs, nowMs).tone === "good"
    );

  function refreshNow() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
                Live overview
              </h2>
              <StatusPill
                label={overallHealthy ? "All healthy" : "Attention needed"}
                tone={overallHealthy ? "good" : "warning"}
              />
            </div>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              Auto-refreshes every minute · snapshot {relativeTime(data.generatedAt, nowMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshNow}
            disabled={refreshing}
            className="rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: F1.gridLine, color: F1.carbon }}
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl p-3" style={{ background: TONES.info.background }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Last automation
            </p>
            <p className="mt-1 font-bold" style={{ color: F1.carbon }}>
              {data.cronRuns[0] ? relativeTime(data.cronRuns[0].startedAt, nowMs) : "No history"}
            </p>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              {data.cronRuns[0]?.job ?? "No cron run recorded"}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: TONES.info.background }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Last provider fetch
            </p>
            <p className="mt-1 font-bold" style={{ color: F1.carbon }}>
              {lastProviderAttempt
                ? relativeTime(lastProviderAttempt.attemptedAt, nowMs)
                : "No fetch recorded"}
            </p>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              {lastProviderAttempt
                ? `${lastProviderAttempt.raceId} · ${EVENT_LABELS[lastProviderAttempt.eventType]}`
                : "—"}
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: scoringHealth.pendingSessions ? TONES.bad.background : TONES.good.background }}
          >
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Scoring integrity
            </p>
            <p
              className="mt-1 font-bold"
              style={{ color: scoringHealth.pendingSessions ? TONES.bad.color : TONES.good.color }}
            >
              {scoringHealth.available
                ? scoringHealth.pendingSessions || scoringHealth.aggregateMismatches
                  ? "Needs attention"
                  : "Current"
                : "Unavailable"}
            </p>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              {scoringHealth.pendingSessions} pending · {scoringHealth.aggregateMismatches} mismatches
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              background: lastEntrySync
                ? TONES[entrySyncTone(lastEntrySync)].background
                : TONES.neutral.background
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Official roster
            </p>
            <p className="mt-1 font-bold" style={{ color: F1.carbon }}>
              {lastEntrySync ? `${lastEntrySync.entryCount} drivers` : "No sync recorded"}
            </p>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              {lastEntrySync
                ? `${ENTRY_SOURCE_LABELS[lastEntrySync.source]} · ${relativeTime(lastEntrySync.attemptedAt, nowMs)}`
                : "Awaiting FIA or OpenF1 confirmation"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
                Driver roster
              </h2>
              <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
                FIA entry list, then observed competitive-session confirmation.
              </p>
            </div>
            {lastEntrySync && (
              <StatusPill
                label={lastEntrySync.status}
                tone={entrySyncTone(lastEntrySync)}
              />
            )}
          </div>
          {lastEntrySync ? (
            <div className="mt-4 rounded-xl border p-3" style={{ borderColor: F1.gridLine }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold" style={{ color: F1.carbon }}>
                  {data.races.find((race) => race.id === lastEntrySync.raceId)?.grandPrix ??
                    `Race ${lastEntrySync.raceId}`}
                </p>
                <span className="text-xs" style={{ color: F1.carbonLight }}>
                  {relativeTime(lastEntrySync.attemptedAt, nowMs)}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: F1.carbonMid }}>
                {ENTRY_SOURCE_LABELS[lastEntrySync.source]} · {lastEntrySync.entryCount} drivers
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ background: F1.offWhite }}>
                  <p className="font-bold" style={{ color: F1.carbon }}>
                    +{lastEntrySync.addedDriverIds.length}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: F1.carbonLight }}>Added</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: F1.offWhite }}>
                  <p className="font-bold" style={{ color: F1.carbon }}>
                    −{lastEntrySync.removedDriverIds.length}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: F1.carbonLight }}>Removed</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: F1.offWhite }}>
                  <p className="font-bold" style={{ color: F1.carbon }}>
                    {lastEntrySync.affectedPredictionRows}
                  </p>
                  <p className="text-[10px] uppercase" style={{ color: F1.carbonLight }}>Picks affected</p>
                </div>
              </div>
              {lastEntrySync.documentUrl?.startsWith("https://") && (
                <a
                  href={lastEntrySync.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-semibold hover:underline"
                  style={{ color: F1.red }}
                >
                  View source document ↗
                </a>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-xl p-3 text-sm" style={{ background: F1.offWhite, color: F1.carbonLight }}>
              No official roster synchronization has been recorded.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
          <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
            Calendar changes
          </h2>
          <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
            Only detected upstream additions, removals, or timing changes appear here.
          </p>
          {data.calendarChanges.length ? (
            <div className="mt-3 divide-y" style={{ borderColor: F1.gridLine }}>
              {data.calendarChanges.slice(0, 5).map((change) => {
                const state = calendarChangeState(change);
                return (
                  <div key={change.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: F1.carbon }}>
                        {change.grandPrix}
                      </p>
                      <p className="text-xs" style={{ color: F1.carbonLight }}>
                        {relativeTime(change.detectedAt, nowMs)}
                        {change.affectedPredictionRows
                          ? ` · ${change.affectedPredictionRows} rows affected`
                          : ""}
                      </p>
                    </div>
                    <StatusPill label={state.label} tone={state.tone} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl p-4" style={{ background: TONES.good.background }}>
              <p className="text-sm font-semibold" style={{ color: TONES.good.color }}>
                No calendar changes detected.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <div className="mb-4">
          <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
            Automation
          </h2>
          <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
            “Delayed” means no successful or failed invocation was recorded within the expected window.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {JOBS.map((job) => {
            const run = latestRunFor(data, job.id);
            const state = jobState(run, job.overdueMs, nowMs);
            return (
              <div key={job.id} className="rounded-xl border p-3" style={{ borderColor: F1.gridLine }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold" style={{ color: F1.carbon }}>
                      {job.label}
                    </p>
                    <p className="text-xs" style={{ color: F1.carbonLight }}>
                      {job.cadence}
                    </p>
                  </div>
                  <StatusPill label={state.label} tone={state.tone} />
                </div>
                <p className="mt-3 text-xs" style={{ color: F1.carbonMid }}>
                  {run ? (
                    <>
                      Last ran <strong>{relativeTime(run.startedAt, nowMs)}</strong> ·{" "}
                      <LocalTime iso={run.startedAt} />
                    </>
                  ) : (
                    "No run has been recorded yet"
                  )}
                </p>
                {run?.error && (
                  <p className="mt-2 line-clamp-2 text-xs" style={{ color: F1.red }}>
                    {run.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
              Results journey
            </h2>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              Last observed provider response → database publication → score persistence.
            </p>
          </div>
          <select
            value={selectedRace?.id ?? ""}
            onChange={(event) => setSelectedRaceId(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D31411]/30"
            style={{ borderColor: F1.gridLine, background: F1.offWhite, color: F1.carbon }}
            aria-label="Race weekend"
          >
            {data.races.map((race) => (
              <option key={race.id} value={race.id}>
                {race.grandPrix}
              </option>
            ))}
          </select>
        </div>

        {selectedRace ? (
          <div className="mt-4 space-y-3">
            {selectedRace.sessions.map((session) => {
              const openf1 = providerState("openf1", session.lastAttempt);
              const jolpi = providerState("jolpi", session.lastAttempt);
              const publication = publicationState(session, nowMs);
              const scoring = scoringState(session, nowMs);
              return (
                <div key={session.eventType} className="rounded-2xl border p-3" style={{ borderColor: F1.gridLine }}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: F1.carbon }}>
                        {EVENT_LABELS[session.eventType]}
                      </h3>
                      <p className="text-xs" style={{ color: F1.carbonLight }}>
                        <LocalTime iso={session.startsAt} />
                      </p>
                    </div>
                    {session.lastAttempt && (
                      <span className="text-xs" style={{ color: F1.carbonLight }}>
                        Last fetched {relativeTime(session.lastAttempt.attemptedAt, nowMs)}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailCell title="OpenF1" detail={`${openf1.label}|${openf1.detail}`} tone={openf1.tone} />
                    <DetailCell title="Jolpi" detail={`${jolpi.label}|${jolpi.detail}`} tone={jolpi.tone} />
                    <DetailCell
                      title="Our database"
                      detail={`${publication.label}|${publication.detail}`}
                      tone={publication.tone}
                    />
                    <DetailCell title="Scores" detail={`${scoring.label}|${scoring.detail}`} tone={scoring.tone} />
                  </div>
                  {session.publication && (
                    <p className="mt-2 text-[11px]" style={{ color: F1.carbonLight }}>
                      Published <LocalTime iso={session.publication.lastSyncedAt} />
                      {session.publication.scoreUpdatedAt && (
                        <>
                          {" "}· scored <LocalTime iso={session.publication.scoreUpdatedAt} />
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm" style={{ color: F1.carbonLight }}>
            No race weekends are available.
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
          <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
            Recent issues
          </h2>
          {recentIssues.length ? (
            <div className="mt-3 space-y-3">
              {recentIssues.map((issue, index) => (
                <div key={`${issue.at}-${index}`} className="rounded-xl p-3" style={{ background: F1.redLight }}>
                  <p className="text-sm font-bold" style={{ color: F1.redDark }}>
                    {issue.title}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs" style={{ color: F1.carbonMid }}>
                    {issue.detail}
                  </p>
                  <p className="mt-2 text-[11px]" style={{ color: F1.carbonLight }}>
                    <LocalTime iso={issue.at} />
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl p-4" style={{ background: TONES.good.background }}>
              <p className="text-sm font-semibold" style={{ color: TONES.good.color }}>
                No recent pipeline errors or unscored official sessions.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
          <h2 className="text-base font-bold" style={{ color: F1.carbon }}>
            Recent runs
          </h2>
          <div className="mt-3 divide-y" style={{ borderColor: F1.gridLine }}>
            {data.cronRuns.slice(0, 10).map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: F1.carbon }}>
                    {JOBS.find((job) => job.id === run.job)?.label ?? run.job}
                  </p>
                  <p className="text-xs" style={{ color: F1.carbonLight }}>
                    <LocalTime iso={run.startedAt} /> · {relativeTime(run.startedAt, nowMs)}
                  </p>
                </div>
                <StatusPill
                  label={run.status === "ok" ? "Success" : run.status}
                  tone={run.status === "ok" ? "good" : run.status === "error" ? "bad" : "info"}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="px-1 text-[11px] leading-relaxed" style={{ color: F1.carbonLight }}>
        Provider availability reflects the latest recorded fetch. Opening this page does not call OpenF1 or
        Jolpi. Use “Check for official results” on the main Admin page when you need a fresh fetch.
      </p>
    </div>
  );
}
