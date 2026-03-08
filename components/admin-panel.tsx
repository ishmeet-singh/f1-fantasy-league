"use client";

import { useState } from "react";

type Player = { id: string; email: string; display_name: string | null; created_at: string };
type RaceOption = { id: string; grand_prix: string; race_start: string; has_sprint: boolean };

const TEST_RACE_ID = "test-race-2099";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function StatusMsg({ status, error }: { status: string; error: string }) {
  if (!status && !error) return null;
  return error ? (
    <p className="text-sm text-red-400">{error}</p>
  ) : (
    <p className="text-sm text-emerald-400">{status}</p>
  );
}

export function AdminPanel({ initialPlayers, upcomingRaces = [] }: { initialPlayers: Player[]; upcomingRaces?: RaceOption[] }) {
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

  async function manualAction(endpoint: string, label: string) {
    setSyncLoading(label);
    setSyncStatus("");
    setSyncError("");
    const res = await fetch(endpoint, { method: "POST" });
    setSyncLoading(null);
    if (res.ok) setSyncStatus(`${label} complete`);
    else setSyncError(`${label} failed`);
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
    <div className="space-y-6">
      {/* Players */}
      <Section title="Players">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="player@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            className="flex-1 rounded bg-slate-800 border border-slate-700 p-2 text-sm focus:outline-none focus:border-red-500"
          />
          <button
            onClick={addPlayer}
            disabled={playerLoading}
            className="rounded bg-red-600 hover:bg-red-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {playerLoading ? "Adding…" : "Add"}
          </button>
        </div>
        <StatusMsg status={playerStatus} error={playerError} />

        {players.length === 0 ? (
          <p className="text-slate-500 text-sm">No players yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="pb-2">Email</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Joined</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/50">
                  <td className="py-2 text-slate-300">{p.email}</td>
                  <td className="py-2 text-slate-400">{p.display_name || "—"}</td>
                  <td className="py-2 text-slate-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => getMagicLink(p.email)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        title="Generate sign-in link (no email needed)"
                      >
                        Get link
                      </button>
                      <button
                        onClick={() => removePlayer(p.id, p.email)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Test Race */}
      <Section title="Test / Demo Race">
        <p className="text-sm text-slate-400">
          Create a dummy race to test the full prediction and scoring flow before a live race.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => testRaceAction("create")}
            disabled={testLoading !== null}
            className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {testLoading === "create" ? "Creating…" : "Create test race"}
          </button>
          <button
            onClick={simulateResults}
            disabled={testLoading !== null}
            className="rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {testLoading === "simulate" ? "Simulating…" : "Simulate results"}
          </button>
          <button
            onClick={() => testRaceAction("clear")}
            disabled={testLoading !== null}
            className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {testLoading === "clear" ? "Clearing…" : "Clear test race"}
          </button>
        </div>
        <StatusMsg status={testStatus} error={testError} />
        <ol className="text-xs text-slate-500 list-decimal list-inside space-y-1">
          <li>Click &quot;Create test race&quot; — it will appear in Make Picks with the window already open</li>
          <li>Submit your own predictions (and ask others to do the same)</li>
          <li>Click &quot;Simulate results&quot; to generate random results and compute scores</li>
          <li>Check the leaderboard to verify scoring</li>
          <li>Click &quot;Clear test race&quot; to remove all test data when done</li>
        </ol>
      </Section>

      {/* Send Reminder Now */}
      {upcomingRaces.length > 0 && (
        <Section title="Send Reminder Now">
          <p className="text-sm text-slate-400">
            Immediately email all players who haven&apos;t submitted picks for a session.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={reminderRaceId}
              onChange={e => setReminderRaceId(e.target.value)}
              className="rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            >
              {upcomingRaces.map(r => (
                <option key={r.id} value={r.id}>{r.grand_prix}</option>
              ))}
            </select>
            <select
              value={reminderEvent}
              onChange={e => setReminderEvent(e.target.value as "quali" | "sprint" | "race")}
              className="rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            >
              <option value="quali">Qualifying</option>
              {upcomingRaces.find(r => r.id === reminderRaceId)?.has_sprint && (
                <option value="sprint">Sprint</option>
              )}
              <option value="race">Race</option>
            </select>
            <button
              onClick={sendReminderNow}
              disabled={reminderLoading}
              className="rounded bg-red-600 hover:bg-red-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
            >
              {reminderLoading ? "Sending…" : "Send reminder emails"}
            </button>
          </div>
          {reminderStatus && <p className="text-sm text-emerald-400">{reminderStatus}</p>}
          {reminderError && <p className="text-sm text-red-400">{reminderError}</p>}
        </Section>
      )}

      {/* Manual Tools */}
      <Section title="Manual Tools">
        <p className="text-xs text-slate-500">
          Run &quot;Sync Season Calendar&quot; once to populate all races and drivers from OpenF1. After that, results sync automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fixDriverNames}
            disabled={syncLoading !== null}
            className="rounded bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {syncLoading === "fix-drivers" ? "Fixing…" : "Fix driver names"}
          </button>
          <button
            onClick={testReminder}
            disabled={syncLoading !== null}
            className="rounded bg-orange-600 hover:bg-orange-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {syncLoading === "test-reminder" ? "Sending…" : "Test reminder email"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => manualAction("/api/admin/sync-calendar", "Sync calendar")}
            disabled={syncLoading !== null}
            className="rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {syncLoading === "Sync calendar" ? "Syncing…" : "Sync season calendar"}
          </button>
          <button
            onClick={() => manualAction("/api/admin/sync", "Sync results")}
            disabled={syncLoading !== null}
            className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {syncLoading === "Sync results" ? "Syncing…" : "Sync race results"}
          </button>
          <button
            onClick={() => manualAction("/api/admin/recompute", "Recompute")}
            disabled={syncLoading !== null}
            className="rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium transition-colors"
          >
            {syncLoading === "Recompute" ? "Recomputing…" : "Recompute scores"}
          </button>
        </div>
        <StatusMsg status={syncStatus} error={syncError} />
      </Section>
    </div>
  );
}
