"use client";

import { useState } from "react";

const DRIVERS = [
  "Verstappen", "Norris", "Leclerc", "Piastri", "Russell",
  "Hamilton", "Antonelli", "Albon", "Hadjar", "Lawson",
  "Hulkenberg", "Bearman", "Ocon", "Gasly", "Bottas",
  "Colapinto", "Alonso", "Magnussen", "Doohan", "Bortoleto",
  "Stroll", "Tsunoda"
];

const MAX = 5; // Reduced from 10 for prototype clarity

// ─── SHARED UTILS ────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">{children}</p>;
}

function SaveButton({ filled, total }: { filled: number; total: number }) {
  const ready = filled === total;
  return (
    <button
      className={`w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        ready
          ? "bg-red-600 hover:bg-red-500 text-white"
          : "bg-slate-800 text-slate-500 cursor-not-allowed"
      }`}
    >
      {ready ? `Save picks (${total}/${total})` : `Select ${total - filled} more`}
    </button>
  );
}

// ─── OPTION A: Dropdowns + reorder buttons ───────────────

export function OptionAPrototype() {
  const [picks, setPicks] = useState<string[]>(Array(MAX).fill(""));

  function set(i: number, val: string) {
    const next = [...picks];
    // Swap if driver already picked elsewhere
    const existing = next.indexOf(val);
    if (existing !== -1 && existing !== i) next[existing] = "";
    next[i] = val;
    setPicks(next);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...picks];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setPicks(next);
  }

  function moveDown(i: number) {
    if (i === MAX - 1) return;
    const next = [...picks];
    [next[i + 1], next[i]] = [next[i], next[i + 1]];
    setPicks(next);
  }

  const available = (current: string) =>
    DRIVERS.filter((d) => d === current || !picks.includes(d));

  return (
    <div className="space-y-2">
      <Label>Current: Dropdowns + reorder arrows</Label>
      {picks.map((pick, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-xs w-6 text-right shrink-0">P{i + 1}</span>
          <select
            value={pick}
            onChange={(e) => set(i, e.target.value)}
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">Select driver…</option>
            {available(pick).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="text-slate-500 hover:text-white disabled:opacity-20 text-xs px-1"
            >▲</button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === MAX - 1}
              className="text-slate-500 hover:text-white disabled:opacity-20 text-xs px-1"
            >▼</button>
          </div>
        </div>
      ))}
      <SaveButton filled={picks.filter(Boolean).length} total={MAX} />
    </div>
  );
}

// ─── OPTION B: Tap to select + reorder ───────────────────

export function OptionBPrototype() {
  const [picked, setPicked] = useState<string[]>([]);

  function addDriver(d: string) {
    if (picked.length >= MAX) return;
    setPicked((prev) => [...prev, d]);
  }

  function removeDriver(d: string) {
    setPicked((prev) => prev.filter((p) => p !== d));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...picked];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setPicked(next);
  }

  function moveDown(i: number) {
    if (i === picked.length - 1) return;
    const next = [...picked];
    [next[i + 1], next[i]] = [next[i], next[i + 1]];
    setPicked(next);
  }

  const pool = DRIVERS.filter((d) => !picked.includes(d));
  const slots = Array(MAX).fill(null).map((_, i) => picked[i] ?? null);

  return (
    <div className="space-y-4">
      {/* Ranked list */}
      <div>
        <Label>Your picks — {picked.length}/{MAX} · tap ✕ to remove · ▲▼ to reorder</Label>
        <div className="space-y-1.5">
          {slots.map((driver, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              driver ? "bg-slate-800 border border-slate-700" : "border border-dashed border-slate-700 opacity-40"
            }`}>
              <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
              <span className={`flex-1 ${driver ? "text-white font-medium" : "text-slate-600"}`}>
                {driver ?? "─ ─ ─ ─ ─"}
              </span>
              {driver && (
                <div className="flex items-center gap-1">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-slate-500 hover:text-white disabled:opacity-20 text-xs">▲</button>
                  <button onClick={() => moveDown(i)} disabled={i >= picked.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20 text-xs">▼</button>
                  <button onClick={() => removeDriver(driver)} className="text-slate-500 hover:text-red-400 ml-1 text-xs">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Driver pool */}
      <div>
        <Label>Tap a driver to add</Label>
        <div className="flex flex-wrap gap-2">
          {pool.map((d) => (
            <button
              key={d}
              onClick={() => addDriver(d)}
              disabled={picked.length >= MAX}
              className="px-3 py-1.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <SaveButton filled={picked.length} total={MAX} />
    </div>
  );
}

// ─── OPTION C: Unified drag-from-pool list ────────────────

export function OptionCPrototype() {
  const [picked, setPicked] = useState<string[]>([]);
  const pool = DRIVERS.filter((d) => !picked.includes(d));

  function addFromPool(d: string) {
    if (picked.length >= MAX) return;
    setPicked((prev) => [...prev, d]);
  }

  function removeFromPicks(d: string) {
    setPicked((prev) => prev.filter((p) => p !== d));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...picked];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setPicked(next);
  }

  function moveDown(i: number) {
    if (i === picked.length - 1) return;
    const next = [...picked];
    [next[i + 1], next[i]] = [next[i], next[i + 1]];
    setPicked(next);
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      {/* Picks section */}
      <div className="bg-slate-900/60">
        <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your picks</span>
          <span className="text-xs text-slate-500">{picked.length}/{MAX}</span>
        </div>
        {picked.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-600 text-sm border-b border-dashed border-slate-800">
            ↓ tap a driver below to add
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {picked.map((d, i) => (
              <div key={d} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
                <span className="flex-1 text-white text-sm font-medium">{d}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-slate-500 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                  <button onClick={() => moveDown(i)} disabled={i === picked.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                  <button onClick={() => removeFromPicks(d)} className="text-red-500/50 hover:text-red-400 text-xs ml-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pool section */}
      <div>
        <div className="px-4 py-2 border-t border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Driver pool</span>
          <span className="text-xs text-slate-600">{pool.length} remaining</span>
        </div>
        <div className="divide-y divide-slate-800/40 max-h-64 overflow-y-auto">
          {pool.map((d) => (
            <button
              key={d}
              onClick={() => addFromPool(d)}
              disabled={picked.length >= MAX}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left"
            >
              <span className="text-slate-600 text-xs">+</span>
              <span>{d}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-slate-800">
        <SaveButton filled={picked.length} total={MAX} />
      </div>
    </div>
  );
}
