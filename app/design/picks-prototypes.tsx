"use client";

import { useState, useRef } from "react";

const DRIVERS = [
  "Verstappen", "Norris", "Leclerc", "Piastri", "Russell",
  "Hamilton", "Antonelli", "Albon", "Hadjar", "Lawson",
  "Hulkenberg", "Bearman", "Ocon", "Gasly", "Bottas",
  "Colapinto", "Alonso", "Magnussen", "Doohan", "Bortoleto",
  "Stroll", "Tsunoda"
];

const MAX = 5;

// ─── DRAG-SORT HOOK ──────────────────────────────────────
//
// Two key insights that make this work reliably:
//
// 1. Capture on the HANDLE itself (not a container). The handle received
//    onPointerDown so it's allowed to call setPointerCapture. The container
//    never received pointerdown, so setPointerCapture on it throws InvalidStateError.
//
// 2. Use INDEX keys on rows (key={i}), not content keys (key={driver}).
//    Index keys mean React NEVER unmounts/remounts a row during reorder —
//    it just updates the content. This keeps pointer capture alive.
//    Content keys cause React to move DOM elements, releasing capture.

function useDragSort<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const dragIdxRef = useRef<number | null>(null);

  const getClosestRow = (clientY: number): number => {
    let best = 0, bestDist = Infinity;
    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs(clientY - (r.top + r.height / 2));
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  };

  // Returns event handlers to spread onto the drag handle <span>
  const dragHandlers = (i: number) => ({
    style: { touchAction: "none" } as React.CSSProperties,
    className: "select-none cursor-grab active:cursor-grabbing px-2 text-slate-500 text-lg leading-none",
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      e.preventDefault();
      // Capture pointer on the handle itself — safe because it received pointerdown
      e.currentTarget.setPointerCapture(e.pointerId);
      dragIdxRef.current = i;
      setDragIdx(i);
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (dragIdxRef.current === null) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const target = getClosestRow(e.clientY);
      if (target === dragIdxRef.current) return;
      setItems(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIdxRef.current!, 1);
        next.splice(target, 0, moved);
        return next;
      });
      dragIdxRef.current = target;
      setDragIdx(target);
    },
    onPointerUp(e: React.PointerEvent<HTMLElement>) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragIdxRef.current = null;
      setDragIdx(null);
    },
    onPointerCancel() {
      dragIdxRef.current = null;
      setDragIdx(null);
    },
  });

  return { items, setItems, rowRefs, dragIdx, dragHandlers };
}

// ─── SHARED ──────────────────────────────────────────────

function SaveButton({ filled, total }: { filled: number; total: number }) {
  const ready = filled === total;
  return (
    <button className={`w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      ready ? "bg-red-600 hover:bg-red-500 text-white" : "bg-slate-800 text-slate-500 cursor-not-allowed"
    }`}>
      {ready ? `Save picks (${total}/${total})` : `Select ${total - filled} more`}
    </button>
  );
}

// ─── OPTION A: Dropdowns + drag-to-reorder ───────────────

export function OptionAPrototype() {
  const { items: picks, setItems: setPicks, rowRefs, dragIdx, dragHandlers } = useDragSort(
    Array(MAX).fill("")
  );

  function set(i: number, val: string) {
    const next = [...picks];
    const existing = next.indexOf(val);
    if (existing !== -1 && existing !== i) next[existing] = "";
    next[i] = val;
    setPicks(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">Hold ⠿ and drag to reorder</p>
      {/* KEY = INDEX so React reuses DOM elements instead of remounting */}
      {picks.map((pick, i) => (
        <div
          key={i}
          ref={el => { rowRefs.current[i] = el; }}
          className={`flex items-center gap-2 rounded-lg transition-all ${dragIdx === i ? "opacity-40 scale-95" : ""}`}
        >
          <span {...dragHandlers(i)}>⠿</span>
          <span className="text-slate-500 font-mono text-xs w-5 shrink-0 select-none">P{i + 1}</span>
          <select
            value={pick}
            onChange={e => set(i, e.target.value)}
            style={{ touchAction: "auto" }}
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">Select driver…</option>
            {DRIVERS.filter(d => d === pick || !picks.includes(d)).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      ))}
      <SaveButton filled={picks.filter(Boolean).length} total={MAX} />
    </div>
  );
}

// ─── OPTION B: Tap to add + drag-to-reorder ──────────────

export function OptionBPrototype() {
  const { items: picked, setItems: setPicked, rowRefs, dragIdx, dragHandlers } = useDragSort<string | null>(
    Array(MAX).fill(null)
  );

  const filled = picked.filter(Boolean) as string[];
  const pool = DRIVERS.filter(d => !filled.includes(d));

  function tapAdd(driver: string) {
    const emptySlot = picked.indexOf(null);
    if (emptySlot === -1) return;
    const next = [...picked];
    next[emptySlot] = driver;
    setPicked(next);
  }

  function tapRemove(i: number) {
    const next = [...picked];
    next[i] = null;
    // Compact: move nulls to end
    const nonNull = next.filter(Boolean) as string[];
    const withNulls = [...nonNull, ...Array(MAX - nonNull.length).fill(null)];
    setPicked(withNulls);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 mb-2">Your picks — {filled.length}/{MAX} · hold ⠿ to reorder</p>
        {/* KEY = INDEX */}
        <div className="space-y-1.5">
          {picked.map((driver, i) => (
            <div
              key={i}
              ref={el => { rowRefs.current[i] = el; }}
              className={`flex items-center gap-2 rounded-lg text-sm transition-all ${
                driver
                  ? `bg-slate-800 border border-slate-700 px-3 py-2 ${dragIdx === i ? "opacity-40 scale-95" : ""}`
                  : "border border-dashed border-slate-700/40 px-3 py-2 opacity-30"
              }`}
            >
              {driver
                ? <span {...dragHandlers(i)}>⠿</span>
                : <span className="w-7 shrink-0" />}
              <span className="text-slate-500 font-mono text-xs w-5 shrink-0 select-none">P{i + 1}</span>
              <span className={`flex-1 ${driver ? "text-white font-medium" : "text-slate-600"}`}>
                {driver ?? "─ ─ ─ ─ ─"}
              </span>
              {driver && (
                <button
                  style={{ touchAction: "auto" }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => tapRemove(i)}
                  className="text-slate-500 hover:text-red-400 text-sm px-1 select-none"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2">Tap a driver to add</p>
        <div className="flex flex-wrap gap-2">
          {pool.map(d => (
            <button
              key={d}
              onClick={() => tapAdd(d)}
              disabled={filled.length >= MAX}
              className="px-3 py-1.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500 disabled:opacity-30 active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <SaveButton filled={filled.length} total={MAX} />
    </div>
  );
}

// ─── OPTION C: Unified picks + pool ──────────────────────

export function OptionCPrototype() {
  const { items: picked, setItems: setPicked, rowRefs, dragIdx, dragHandlers } = useDragSort<string>([]);
  const pool = DRIVERS.filter(d => !picked.includes(d));

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      {/* Picks */}
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your picks</span>
        <span className="text-xs text-slate-500">{picked.length}/{MAX} · hold ⠿ to reorder</span>
      </div>

      {picked.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-600 text-sm border-b border-dashed border-slate-800">
          ↓ tap a driver below to add
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {/* KEY = INDEX */}
          {picked.map((d, i) => (
            <div
              key={i}
              ref={el => { rowRefs.current[i] = el; }}
              className={`flex items-center gap-3 px-4 py-2.5 select-none transition-all ${dragIdx === i ? "opacity-40 scale-95" : ""}`}
            >
              <span {...dragHandlers(i)}>⠿</span>
              <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
              <span className="flex-1 text-white text-sm font-medium">{d}</span>
              <button
                style={{ touchAction: "auto" }}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => setPicked(prev => prev.filter(p => p !== d))}
                className="text-red-500/50 hover:text-red-400 text-xs"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Pool */}
      <div className="px-4 py-2 border-t border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Driver pool</span>
        <span className="text-xs text-slate-600">{pool.length} remaining</span>
      </div>
      <div className="divide-y divide-slate-800/40 max-h-56 overflow-y-auto">
        {pool.map(d => (
          <button
            key={d}
            onClick={() => { if (picked.length < MAX) setPicked(prev => [...prev, d]); }}
            disabled={picked.length >= MAX}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 disabled:opacity-30 text-left active:bg-slate-700/60"
          >
            <span className="text-slate-600 text-xs font-bold">+</span>
            <span>{d}</span>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800">
        <SaveButton filled={picked.length} total={MAX} />
      </div>
    </div>
  );
}
