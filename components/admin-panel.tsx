"use client";

import { useState } from "react";
import { F1 } from "@/lib/f1-theme";
import { PICKS_REQUIRED } from "@/lib/pick-rules";

type Player = { id: string; email: string; display_name: string | null; created_at: string };
type RaceOption = {
  id: string;
  grand_prix: string;
  race_start: string;
  has_sprint: boolean;
  sprint_start: string | null;
  drivers?: DriverOption[];
};
type DriverOption = { id: string; name: string; team: string };
export type AdminHealth = {
  available: boolean;
  scoreRows: number;
  weekendRows: number;
  officialSessions: number;
  pendingSessions: number;
  aggregateMismatches: number;
  lastSync: {
    status: string;
    started_at: string;
    finished_at: string | null;
    error: string | null;
  } | null;
};

const TEST_RACE_ID = "test-race-2099";

const fieldClass =
  "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D31411]/30";
const fieldStyle = { borderColor: F1.gridLine, background: F1.offWhite, color: F1.carbon };
const btnClass =
  "rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <h2
        className="border-b pb-2 text-base font-bold"
        style={{ color: F1.carbon, borderColor: F1.gridLine }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function CollapsibleSection({
  title,
  summary,
  children
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <summary className="cursor-pointer list-none">
        <h2 className="inline text-base font-bold" style={{ color: F1.carbon }}>
          {title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: F1.carbonLight }}>
          {summary}
        </p>
      </summary>
      <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: F1.gridLine }}>
        {children}
      </div>
    </details>
  );
}

function StatusMsg({ status, error }: { status: string; error: string }) {
  if (!status && !error) return null;
  return error ? (
    <p className="text-sm font-medium" style={{ color: F1.red }}>
      {error}
    </p>
  ) : (
    <p className="text-sm font-medium" style={{ color: "#166534" }}>
      {status}
    </p>
  );
}

export function AdminPanel({
  initialPlayers,
  upcomingRaces = [],
  allRaces = [],
  drivers = [],
  health
}: {
  initialPlayers: Player[];
  upcomingRaces?: RaceOption[];
  allRaces?: RaceOption[];
  drivers?: DriverOption[];
  health: AdminHealth;
}) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [newEmail, setNewEmail] = useState("");
  const [playerStatus, setPlayerStatus] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);

  const [testStatus, setTestStatus] = useState("");
  const [testError, setTestError] = useState("");
  const [testLoading, setTestLoading] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState("");
  const [syncError, setSyncError] = useState("");
  const [syncLoading, setSyncLoading] = useState<string | null>(null);

  const [reminderRaceId, setReminderRaceId] = useState(upcomingRaces[0]?.id || "");
  const [reminderEvent, setReminderEvent] = useState<"quali" | "sprint" | "race">("race");
  const [reminderStatus, setReminderStatus] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);

  const [setPicksEmail, setSetPicksEmail] = useState("");
  const [setPicksRaceId, setSetPicksRaceId] = useState(
    () => upcomingRaces[0]?.id ?? allRaces[0]?.id ?? ""
  );
  const [setPicksEvent, setSetPicksEvent] = useState<"quali" | "sprint" | "race">("quali");
  const [setPicks, setSetPicks] = useState<string[]>(() => Array(PICKS_REQUIRED.race).fill(""));
  const [setPicksStatus, setSetPicksStatus] = useState("");
  const [setPicksError, setSetPicksError] = useState("");
  const [setPicksLoading, setSetPicksLoading] = useState(false);

  async function addPlayer() {
    if (!newEmail.trim()) return;
    setPlayerLoading(true);
    setPlayerStatus("");
    setPlayerError("");
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() })
    });
    const json = await res.json();
    setPlayerLoading(false);
    if (!res.ok) {
      setPlayerError(json.error || "Failed to add player");
    } else {
      setNewEmail("");
      const msg = json.existed ? `${json.email} already registered` : `${json.email} added`;
      setPlayerStatus(msg);
      if (!json.existed) {
        setPlayers((prev) => [
          ...prev,
          { id: json.userId, email: json.email, display_name: null, created_at: new Date().toISOString() }
        ]);
      }
    }
  }

  async function removePlayer(userId: string, email: string) {
    if (!confirm(`Remove ${email}? This deletes all their data.`)) return;
    setPlayerError("");
    const res = await fetch("/api/admin/players", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId })
    });
    if (res.ok) {
      setPlayers((prev) => prev.filter((p) => p.id !== userId));
      setPlayerStatus(`${email} removed`);
    } else {
      const json = await res.json();
      setPlayerError(json.error || "Failed to remove");
    }
  }

  async function getMagicLink(email: string) {
    setPlayerError("");
    setPlayerStatus("");
    const res = await fetch(`/api/admin/players?email=${encodeURIComponent(email)}`);
    const json = await res.json();
    if (!res.ok) {
      setPlayerError(json.error || "Failed to generate link");
    } else {
      await navigator.clipboard.writeText(json.link);
      setPlayerStatus(`Link copied for ${email} — open in incognito`);
    }
  }

  async function testRaceAction(action: "create" | "clear") {
    setTestLoading(action);
    setTestStatus("");
    setTestError("");
    const res = await fetch("/api/admin/test-race", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    const json = await res.json();
    setTestLoading(null);
    if (!res.ok) setTestError(json.error || "Failed");
    else setTestStatus(action === "create" ? "Test race created — go to Make Picks to submit predictions" : "Test race cleared");
  }

  async function simulateResults() {
    setTestLoading("simulate");
    setTestStatus("");
    setTestError("");
    const res = await fetch("/api/admin/simulate-results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raceId: TEST_RACE_ID })
    });
    const json = await res.json();
    setTestLoading(null);
    if (!res.ok) setTestError(json.error || "Failed — make sure the test race exists");
    else setTestStatus("Random results simulated and scores recomputed — check the leaderboard");
  }

  async function submitSetPicks() {
    const required = PICKS_REQUIRED[setPicksEvent];
    const selectedPicks = setPicks.slice(0, required);
    if (!setPicksEmail.trim() || !setPicksRaceId || selectedPicks.some((driverId) => !driverId)) {
      setSetPicksError(`Email, race, and all ${required} positions are required`);
      return;
    }
    if (new Set(selectedPicks).size !== selectedPicks.length) {
      setSetPicksError("Each driver can only be selected once");
      return;
    }
    setSetPicksLoading(true);
    setSetPicksStatus("");
    setSetPicksError("");
    try {
      const res = await fetch("/api/admin/set-picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: setPicksEmail.trim(),
          raceId: setPicksRaceId,
          eventType: setPicksEvent,
          picks: Object.fromEntries(
            selectedPicks.map((driverId, index) => [String(index + 1), driverId])
          )
        })
      });
      const json = await res.json();
      if (!res.ok) setSetPicksError(json.error || "Failed to save picks");
      else setSetPicksStatus(`Saved ${setPicksEvent} picks for ${json.email}`);
    } catch {
      setSetPicksError("Network error");
    }
    setSetPicksLoading(false);
  }

  async function manualAction(endpoint: string, label: string) {
    if (
      endpoint === "/api/admin/recompute" &&
      !confirm(
        "Rebuild every historical score from stored official results? Use this only for a verified scoring repair."
      )
    ) {
      return;
    }
    setSyncLoading(label);
    setSyncStatus("");
    setSyncError("");
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = json.errors?.length ? json.errors.join("; ") : json.error;
        setSyncError(detail ? `${label} failed: ${detail}` : `${label} failed`);
        return;
      }
      if (label === "Recompute" && typeof json.sprintWeekendCount === "number") {
        setSyncStatus(
          `${label} complete — ${json.scoreRows} session scores, ${json.sprintWeekendCount} sprint weekend(s) in calendar`
        );
      } else if (label === "Sync results") {
        setSyncStatus(
          json.syncedSessions > 0
            ? `Official results checked — ${json.syncedSessions} session(s), ${json.scoreRows} score row(s) updated`
            : "Check complete — no new official results were ready"
        );
      } else if (label === "Sync calendar") {
        setSyncStatus("Calendar, drivers, and future race entries refreshed");
      } else {
        setSyncStatus(`${label} complete`);
      }
    } catch {
      setSyncError(`${label} failed — request error`);
    } finally {
      setSyncLoading(null);
    }
  }

  async function sendReminderNow() {
    if (!reminderRaceId) return;
    setReminderLoading(true);
    setReminderStatus("");
    setReminderError("");
    try {
      const res = await fetch("/api/admin/send-reminder-now", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId: reminderRaceId, eventType: reminderEvent })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setReminderStatus(
          `Sent ${json.sent} email${json.sent !== 1 ? "s" : ""}. ${json.alreadySubmitted} player${json.alreadySubmitted !== 1 ? "s" : ""} already submitted — skipped.`
        );
      } else {
        setReminderError(json.error || "Failed");
      }
    } catch {
      setReminderError("Request failed — try again");
    } finally {
      setReminderLoading(false);
    }
  }

  async function fixDriverNames() {
    setSyncLoading("fix-drivers");
    setSyncStatus("");
    setSyncError("");
    const res = await fetch("/api/admin/fix-driver-names", { method: "POST" });
    const json = await res.json();
    setSyncLoading(null);
    if (res.ok) {
      if (json.fixed > 0) {
        setSyncStatus(`Fixed ${json.fixed} driver(s): ${json.results.map((r: {driver_id: string; new_name: string}) => `${r.driver_id}→${r.new_name}`).join(", ")}`);
      } else {
        setSyncStatus(json.message || "All driver names already correct");
      }
    } else {
      setSyncError(json.error || "Failed");
    }
  }

  async function testReminder() {
    setSyncLoading("test-reminder");
    setSyncStatus("");
    setSyncError("");
    const res = await fetch("/api/admin/test-reminder", { method: "POST" });
    const json = await res.json();
    setSyncLoading(null);
    if (res.ok) {
      setSyncStatus(`✓ Test email sent. Checks: ${JSON.stringify(json.checks)}`);
    } else {
      setSyncError(`Email failed: ${json.error} | Checks: ${JSON.stringify(json.checks)}`);
    }
  }

  const setPicksRequired = PICKS_REQUIRED[setPicksEvent];
  const selectedRaceDrivers =
    allRaces.find((race) => race.id === setPicksRaceId)?.drivers ?? drivers;
  const scoringHealthy =
    health.available && health.aggregateMismatches === 0 && health.pendingSessions === 0;

  return (
    <div className="space-y-4">
      <Section title="System status">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl p-3" style={{ background: scoringHealthy ? "#ECFDF5" : "#FEF2F2" }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Scoring data
            </p>
            <p className="mt-1 font-bold" style={{ color: scoringHealthy ? "#166534" : F1.red }}>
              {scoringHealthy ? "Healthy" : health.available ? "Needs attention" : "Unavailable"}
            </p>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              {health.aggregateMismatches} aggregate mismatches · {health.pendingSessions} pending sessions
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: F1.offWhite }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Last result sync
            </p>
            <p className="mt-1 font-bold" style={{ color: health.lastSync?.status === "ok" ? "#166534" : F1.carbon }}>
              {health.lastSync?.status === "ok" ? "Successful" : health.lastSync ? "Failed" : "No run recorded"}
            </p>
            {health.lastSync?.started_at && (
              <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
                {new Date(health.lastSync.started_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: F1.offWhite }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonLight }}>
              Published data
            </p>
            <p className="mt-1 font-bold" style={{ color: F1.carbon }}>
              {health.officialSessions} official sessions
            </p>
            <p className="mt-1 text-xs" style={{ color: F1.carbonLight }}>
              {health.scoreRows} session scores · {health.weekendRows} weekend totals
            </p>
          </div>
        </div>
      </Section>

      <Section title="What to use">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl p-3" style={{ background: "#ECFDF5", color: "#166534" }}>
            <strong className="block">Automatic</strong>
            Calendar updates, result sync, scoring, and scheduled reminders normally need no action.
          </div>
          <div className="rounded-xl p-3" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
            <strong className="block">Routine check</strong>
            Use Pick Monitor to confirm submissions. Run result sync only when published results are delayed.
          </div>
          <div className="rounded-xl p-3" style={{ background: "#FFFBEB", color: "#92400E" }}>
            <strong className="block">Exception only</strong>
            Backfills, full score rebuilds, and test tools change data. Use them for a specific verified reason.
          </div>
        </div>
      </Section>

      {/* Players */}
      <Section title="Player access">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            placeholder="player@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            className={`flex-1 ${fieldClass}`}
            style={fieldStyle}
          />
          <button
            onClick={addPlayer}
            disabled={playerLoading}
            className={`shrink-0 ${btnClass} text-white`}
            style={{ background: F1.red }}
          >
            {playerLoading ? "Adding…" : "Add"}
          </button>
        </div>
        <StatusMsg status={playerStatus} error={playerError} />

        {players.length === 0 ? (
          <p className="text-sm" style={{ color: F1.carbonLight }}>
            No players yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr
                  className="text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: F1.carbonLight, borderBottom: `1px solid ${F1.gridLine}` }}
                >
                  <th className="pb-2 pr-2">Email</th>
                  <th className="pb-2 pr-2">Name</th>
                  <th className="pb-2 pr-2">Joined</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderTop: `1px solid ${F1.gridLine}`,
                      background: i % 2 ? F1.offWhite : F1.white
                    }}
                  >
                    <td className="py-2.5 pr-2" style={{ color: F1.carbon }}>
                      {p.email}
                    </td>
                    <td className="py-2.5 pr-2" style={{ color: F1.carbonMid }}>
                      {p.display_name || "—"}
                    </td>
                    <td className="py-2.5 pr-2 text-xs" style={{ color: F1.carbonLight }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => getMagicLink(p.email)}
                          className="text-xs font-semibold transition hover:opacity-80"
                          style={{ color: "#2563EB" }}
                          title="Generate sign-in link (no email needed)"
                        >
                          Get link
                        </button>
                        <button
                          onClick={() => removePlayer(p.id, p.email)}
                          className="text-xs font-semibold transition hover:opacity-80"
                          style={{ color: F1.red }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Backfill picks */}
      {allRaces.length > 0 && drivers.length > 0 && (
        <Section title="Correct missing picks">
          <p className="text-sm" style={{ color: F1.carbonLight }}>
            Exception only. Saves a complete pick set for a player and bypasses normal lock checks. The change
            uses the real submission time and automatically repairs that race&apos;s scores if results exist.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
                Player email
              </span>
              <input
                type="email"
                value={setPicksEmail}
                onChange={(e) => setSetPicksEmail(e.target.value)}
                placeholder="friend@example.com"
                className={fieldClass}
                style={fieldStyle}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
                Race
              </span>
              <select
                value={setPicksRaceId}
                onChange={(event) => {
                  setSetPicksRaceId(event.target.value);
                  setSetPicksEvent("quali");
                  setSetPicks(Array(PICKS_REQUIRED.race).fill(""));
                }}
                className={fieldClass}
                style={fieldStyle}
              >
                {allRaces.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.grand_prix}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
                Session
              </span>
              <select
                value={setPicksEvent}
                onChange={(event) => {
                  setSetPicksEvent(event.target.value as "quali" | "sprint" | "race");
                  setSetPicks(Array(PICKS_REQUIRED.race).fill(""));
                }}
                className={fieldClass}
                style={fieldStyle}
              >
                <option value="quali">Qualifying</option>
                {allRaces.find((race) => race.id === setPicksRaceId)?.sprint_start && (
                  <option value="sprint">Sprint</option>
                )}
                <option value="race">Race</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: setPicksRequired }, (_, index) => {
              const value = setPicks[index] ?? "";
              const selectedElsewhere = new Set(
                setPicks.slice(0, setPicksRequired).filter((driverId, pickIndex) => pickIndex !== index && driverId)
              );
              return (
                <label key={index} className="space-y-1 text-sm">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
                    P{index + 1}
                  </span>
                  <select
                    value={value}
                    onChange={(event) =>
                      setSetPicks((current) =>
                        current.map((driverId, pickIndex) =>
                          pickIndex === index ? event.target.value : driverId
                        )
                      )
                    }
                    className={fieldClass}
                    style={fieldStyle}
                  >
                    <option value="">—</option>
                    {selectedRaceDrivers.map((driver) => (
                      <option
                        key={driver.id}
                        value={driver.id}
                        disabled={selectedElsewhere.has(driver.id)}
                      >
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={submitSetPicks}
            disabled={setPicksLoading}
            className={`${btnClass} text-white`}
            style={{ background: "#D97706" }}
          >
            {setPicksLoading ? "Saving…" : "Save picks to database"}
          </button>
          <StatusMsg status={setPicksStatus} error={setPicksError} />
        </Section>
      )}

      {/* Test Race */}
      <CollapsibleSection
        title="Testing tools"
        summary="Creates disposable data. Keep closed during normal race operations."
      >
        <p className="text-sm" style={{ color: F1.carbonLight }}>
          Create a dummy race to test the full prediction and scoring flow before a live race.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => testRaceAction("create")}
            disabled={testLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#2563EB" }}
          >
            {testLoading === "create" ? "Creating…" : "Create test race"}
          </button>
          <button
            onClick={simulateResults}
            disabled={testLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#166534" }}
          >
            {testLoading === "simulate" ? "Simulating…" : "Simulate results"}
          </button>
          <button
            onClick={() => testRaceAction("clear")}
            disabled={testLoading !== null}
            className={btnClass}
            style={{ background: F1.white, color: F1.carbon, border: `1px solid ${F1.gridLine}` }}
          >
            {testLoading === "clear" ? "Clearing…" : "Clear test race"}
          </button>
        </div>
        <StatusMsg status={testStatus} error={testError} />
        <ol className="list-inside list-decimal space-y-1 text-xs" style={{ color: F1.carbonLight }}>
          <li>Click &quot;Create test race&quot; — it will appear in Make Picks with the window already open</li>
          <li>Submit your own predictions (and ask others to do the same)</li>
          <li>Click &quot;Simulate results&quot; to generate random results and compute scores</li>
          <li>Check the leaderboard to verify scoring</li>
          <li>Click &quot;Clear test race&quot; to remove all test data when done</li>
        </ol>
      </CollapsibleSection>

      {/* Send Reminder Now */}
      {upcomingRaces.length > 0 && (
        <Section title="Manual reminder">
          <p className="text-sm" style={{ color: F1.carbonLight }}>
            Sends an email immediately to every player missing a complete pick set. This is separate from the
            automatic reminder schedule.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={reminderRaceId}
              onChange={(e) => setReminderRaceId(e.target.value)}
              className={fieldClass}
              style={fieldStyle}
            >
              {upcomingRaces.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.grand_prix}
                </option>
              ))}
            </select>
            <select
              value={reminderEvent}
              onChange={(e) => setReminderEvent(e.target.value as "quali" | "sprint" | "race")}
              className={fieldClass}
              style={fieldStyle}
            >
              <option value="quali">Qualifying</option>
              {upcomingRaces.find((r) => r.id === reminderRaceId)?.sprint_start && (
                <option value="sprint">Sprint</option>
              )}
              <option value="race">Race</option>
            </select>
            <button
              onClick={sendReminderNow}
              disabled={reminderLoading}
              className={`${btnClass} text-white`}
              style={{ background: F1.red }}
            >
              {reminderLoading ? "Sending…" : "Send reminder emails"}
            </button>
          </div>
          {reminderStatus && (
            <p className="text-sm font-medium" style={{ color: "#166534" }}>
              {reminderStatus}
            </p>
          )}
          {reminderError && (
            <p className="text-sm font-medium" style={{ color: F1.red }}>
              {reminderError}
            </p>
          )}
        </Section>
      )}

      {/* Manual Tools */}
      <Section title="Data operations">
        <p className="text-sm" style={{ color: F1.carbonLight }}>
          Results normally sync automatically. This safe action checks started sessions for newly published
          official results and updates scores only when needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => manualAction("/api/admin/sync", "Sync results")}
            disabled={syncLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#2563EB" }}
          >
            {syncLoading === "Sync results" ? "Checking…" : "Check for official results"}
          </button>
        </div>
        <StatusMsg status={syncStatus} error={syncError} />

        <details className="rounded-xl border p-3" style={{ borderColor: F1.gridLine }}>
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: F1.carbonMid }}>
            Advanced maintenance
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs" style={{ color: F1.carbonLight }}>
              Use these only to repair a diagnosed issue. A full score rebuild recalculates every historical
              race from stored official results and requires confirmation.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => manualAction("/api/admin/sync-calendar", "Sync calendar")}
                disabled={syncLoading !== null}
                className={btnClass}
                style={{ background: F1.white, color: F1.carbon, border: `1px solid ${F1.gridLine}` }}
              >
                {syncLoading === "Sync calendar" ? "Refreshing…" : "Refresh calendar & race entries"}
              </button>
              <button
                onClick={() => manualAction("/api/admin/recompute", "Recompute")}
                disabled={syncLoading !== null}
                className={btnClass}
                style={{ background: "#FFF7ED", color: "#9A3412", border: "1px solid #FED7AA" }}
              >
                {syncLoading === "Recompute" ? "Rebuilding…" : "Rebuild all historical scores"}
              </button>
              <button
                onClick={fixDriverNames}
                disabled={syncLoading !== null}
                className={btnClass}
                style={{ background: F1.white, color: F1.carbon, border: `1px solid ${F1.gridLine}` }}
              >
                {syncLoading === "fix-drivers" ? "Repairing…" : "Repair invalid driver names"}
              </button>
              <button
                onClick={testReminder}
                disabled={syncLoading !== null}
                className={btnClass}
                style={{ background: F1.white, color: F1.carbon, border: `1px solid ${F1.gridLine}` }}
              >
                {syncLoading === "test-reminder" ? "Sending…" : "Send test email to me"}
              </button>
            </div>
          </div>
        </details>
      </Section>
    </div>
  );
}
