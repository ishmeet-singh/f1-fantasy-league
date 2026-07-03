"use client";

import { useState } from "react";
import { F1 } from "@/lib/f1-theme";

type Player = { id: string; email: string; display_name: string | null; created_at: string };
type RaceOption = { id: string; grand_prix: string; race_start: string; has_sprint: boolean };
type DriverOption = { id: string; name: string; team: string };

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
  drivers = []
}: {
  initialPlayers: Player[];
  upcomingRaces?: RaceOption[];
  allRaces?: RaceOption[];
  drivers?: DriverOption[];
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
    () => allRaces.find((r) => r.grand_prix.toLowerCase().includes("canada"))?.id ?? allRaces[0]?.id ?? ""
  );
  const [setPicksEvent, setSetPicksEvent] = useState<"quali" | "sprint" | "race">("quali");
  const [setPicksP1, setSetPicksP1] = useState("");
  const [setPicksP2, setSetPicksP2] = useState("");
  const [setPicksP3, setSetPicksP3] = useState("");
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
    if (!setPicksEmail.trim() || !setPicksRaceId || !setPicksP1 || !setPicksP2 || !setPicksP3) {
      setSetPicksError("Email, race, and all three positions are required");
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
          picks: { "1": setPicksP1, "2": setPicksP2, "3": setPicksP3 }
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
    setSyncLoading(label);
    setSyncStatus("");
    setSyncError("");
    const res = await fetch(endpoint, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setSyncLoading(null);
    if (!res.ok) {
      const detail = json.errors?.length ? json.errors.join("; ") : json.error;
      setSyncError(detail ? `${label} failed: ${detail}` : `${label} failed`);
      return;
    }
    if (label === "Recompute" && typeof json.sprintWeekendCount === "number") {
      setSyncStatus(
        `${label} complete — ${json.scoreRows} session scores, ${json.sprintWeekendCount} sprint weekend(s) in calendar`
      );
    } else {
      setSyncStatus(`${label} complete`);
    }
  }

  async function sendReminderNow() {
    if (!reminderRaceId) return;
    setReminderLoading(true);
    setReminderStatus("");
    setReminderError("");
    const res = await fetch("/api/admin/send-reminder-now", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raceId: reminderRaceId, eventType: reminderEvent })
    });
    const json = await res.json();
    setReminderLoading(false);
    if (res.ok) {
      setReminderStatus(`Sent ${json.sent} email${json.sent !== 1 ? "s" : ""}. ${json.alreadySubmitted} player${json.alreadySubmitted !== 1 ? "s" : ""} already submitted — skipped.`);
    } else {
      setReminderError(json.error || "Failed");
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

  return (
    <div className="space-y-4">
      {/* Players */}
      <Section title="Players">
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
        <Section title="Backfill player picks">
          <p className="text-sm" style={{ color: F1.carbonLight }}>
            Save picks for someone who arranged them but forgot to click Save. Bypasses lock checks (use after
            quali only if results are not in yet).
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
                onChange={(e) => setSetPicksRaceId(e.target.value)}
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
                onChange={(e) => setSetPicksEvent(e.target.value as "quali" | "sprint" | "race")}
                className={fieldClass}
                style={fieldStyle}
              >
                <option value="quali">Qualifying</option>
                <option value="sprint">Sprint</option>
                <option value="race">Race</option>
              </select>
            </label>
          </div>
          {setPicksEvent === "quali" && (
            <div className="grid gap-3 sm:grid-cols-3">
              {(["P1", "P2", "P3"] as const).map((label, i) => {
                const val = [setPicksP1, setPicksP2, setPicksP3][i];
                const set = [setSetPicksP1, setSetPicksP2, setSetPicksP3][i];
                return (
                  <label key={label} className="space-y-1 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
                      {label}
                    </span>
                    <select
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                    >
                      <option value="">—</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          )}
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
      <Section title="Test / demo race">
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
      </Section>

      {/* Send Reminder Now */}
      {upcomingRaces.length > 0 && (
        <Section title="Send reminder now">
          <p className="text-sm" style={{ color: F1.carbonLight }}>
            Immediately email all players who haven&apos;t submitted picks for a session.
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
              {upcomingRaces.find((r) => r.id === reminderRaceId)?.has_sprint && (
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
      <Section title="Manual tools">
        <p className="text-xs" style={{ color: F1.carbonLight }}>
          Run &quot;Sync Season Calendar&quot; once to populate all races and drivers from OpenF1. After that, results sync automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fixDriverNames}
            disabled={syncLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#CA8A04" }}
          >
            {syncLoading === "fix-drivers" ? "Fixing…" : "Fix driver names"}
          </button>
          <button
            onClick={testReminder}
            disabled={syncLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#EA580C" }}
          >
            {syncLoading === "test-reminder" ? "Sending…" : "Test reminder email"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => manualAction("/api/admin/sync-calendar", "Sync calendar")}
            disabled={syncLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#7C3AED" }}
          >
            {syncLoading === "Sync calendar" ? "Syncing…" : "Sync season calendar"}
          </button>
          <button
            onClick={() => manualAction("/api/admin/sync", "Sync results")}
            disabled={syncLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#2563EB" }}
          >
            {syncLoading === "Sync results" ? "Syncing…" : "Sync race results"}
          </button>
          <button
            onClick={() => manualAction("/api/admin/recompute", "Recompute")}
            disabled={syncLoading !== null}
            className={`${btnClass} text-white`}
            style={{ background: "#166534" }}
          >
            {syncLoading === "Recompute" ? "Recomputing…" : "Recompute scores"}
          </button>
        </div>
        <StatusMsg status={syncStatus} error={syncError} />
      </Section>
    </div>
  );
}
