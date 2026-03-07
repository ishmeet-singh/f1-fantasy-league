"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Driver = { id: string; name: string; team: string };
type EventType = "quali" | "sprint" | "race";

function useCountdown(deadline: string, locked: boolean) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (locked) return;
    function update() {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) { setLabel("Locking…"); return; }
      const totalMins = Math.floor(ms / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const secs = Math.floor((ms % 60000) / 1000);
      if (hours > 0) setLabel(`${hours}h ${mins}m`);
      else if (totalMins > 0) setLabel(`${mins}m ${secs}s`);
      else setLabel(`${secs}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline, locked]);

  return label;
}

const EVENT_LABELS: Record<EventType, string> = {
  quali: "Qualifying",
  sprint: "Sprint",
  race: "Race"
};

export function PicksForm({
  drivers,
  raceId,
  eventType,
  size,
  locked,
  deadline,
  initial
}: {
  drivers: Driver[];
  raceId: string;
  eventType: EventType;
  size: number;
  locked: boolean;
  deadline: string;
  initial: Record<number, string>;
}) {
  const [picks, setPicks] = useState<Record<number, string>>(initial);
  const [savedPicks, setSavedPicks] = useState<Record<number, string>>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = useMemo(() => new Set(Object.values(picks).filter(Boolean)), [picks]);
  const countdown = useCountdown(deadline, locked);

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const hasSavedPicks = Object.values(savedPicks).some(Boolean);
  const hasUnsavedChanges =
    !locked &&
    hasSavedPicks &&
    JSON.stringify(picks) !== JSON.stringify(savedPicks);

  const allFilled = Array.from({ length: size }, (_, i) => i + 1).every((pos) => picks[pos]);

  async function submit() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId, eventType, picks })
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error || "Failed to save picks");
      } else {
        setStatus("saved");
        setSavedPicks({ ...picks });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again");
    }
  }

  // Locked state: show a clean read-only summary
  if (locked) {
    return (
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{EVENT_LABELS[eventType]}</h3>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">Locked</span>
        </div>

        {hasSavedPicks ? (
          <div className="space-y-1.5">
            {Array.from({ length: size }, (_, i) => i + 1).map((pos) => {
              const driverId = savedPicks[pos];
              const driver = driverId ? driverById.get(driverId) : null;
              return (
                <div key={pos} className="flex items-center gap-3 rounded-md bg-slate-800/40 px-3 py-2">
                  <span className="w-6 text-right text-slate-500 text-xs font-mono flex-shrink-0">
                    P{pos}
                  </span>
                  {driver ? (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium text-sm text-slate-200">{driver.name}</span>
                      <span className="text-xs text-slate-500">{driver.team}</span>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-sm italic">No pick submitted</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md bg-slate-800/40 px-4 py-3 text-sm text-slate-500 text-center">
            No picks submitted for this session
          </div>
        )}
      </div>
    );
  }

  // Open state: editable form
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{EVENT_LABELS[eventType]} — Top {size}</h3>
          {hasSavedPicks && !hasUnsavedChanges && status !== "saved" && (
            <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">
              ✓ Saved
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-800/50 px-2 py-0.5 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
        {countdown && (
          <span className="text-xs bg-red-900/40 text-red-400 border border-red-800/50 px-2 py-1 rounded-full">
            Locks in {countdown}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {Array.from({ length: size }).map((_, i) => {
          const position = i + 1;
          return (
            <div key={position} className="flex items-center gap-3">
              <span className="w-7 text-right text-slate-500 text-sm font-mono flex-shrink-0">
                P{position}
              </span>
              <select
                className="flex-1 rounded bg-slate-800 border border-slate-700 p-2 text-sm focus:outline-none focus:border-red-500 transition-colors"
                value={picks[position] || ""}
                onChange={(e) => setPicks((prev) => ({ ...prev, [position]: e.target.value }))}
              >
                <option value="">Select driver…</option>
                {drivers.map((d) => {
                  const taken = selected.has(d.id) && picks[position] !== d.id;
                  return (
                    <option key={d.id} value={d.id} disabled={taken}>
                      {d.name} · {d.team}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          disabled={status === "loading" || !allFilled}
          onClick={submit}
          className="rounded bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
        >
          {status === "loading" && (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {status === "loading" ? "Saving…" : hasSavedPicks ? "Update picks" : "Save picks"}
        </button>

        {status === "saved" && (
          <span className="text-sm text-emerald-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved!
          </span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-400">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
