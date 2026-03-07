"use client";

import { useState, useRef, useCallback } from "react";

const DRIVERS = [
  "Verstappen", "Norris", "Leclerc", "Piastri", "Russell",
  "Hamilton", "Antonelli", "Albon", "Hadjar", "Lawson",
  "Hulkenberg", "Bearman", "Ocon", "Gasly", "Bottas",
  "Colapinto", "Alonso", "Magnussen", "Doohan", "Bortoleto",
  "Stroll", "Tsunoda"
];

const MAX = 5;

// ─── DRAG-SORT HOOK ──────────────────────────────────────
// Uses pointer events (works for both mouse AND touch).
// Measures item positions from DOM refs — no HTML5 drag API
// (which breaks on re-render) and no passive touch event issues.

function useDragSort<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const dragFrom = useRef<number | null>(null);

  const setRef = useCallback((el: HTMLElement | null, i: number) => {
    itemRefs.current[i] = el;
  }, []);

  // Find the closest item index by comparing pointer Y to each item's midpoint
  function closestIndex(y: number): number {
    let best = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }

  const startDrag = useCallback((index: number) => {
    dragFrom.current = index;
    setDraggingIndex(index);

    function onMove(e: PointerEvent) {
      e.preventDefault();
      if (dragFrom.current === null) return;
      const target = closestIndex(e.clientY);
      if (target === dragFrom.current) return;
      setItems(prev => {
        const next = [...prev];
        const [item] = next.splice(dragFrom.current!, 1);
        next.splice(target, 0, item);
        return next;
      });
      dragFrom.current = target;
      setDraggingIndex(target);
    }

    function onUp() {
      dragFrom.current = null;
      setDraggingIndex(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, setItems, itemRefs, setRef, draggingIndex, startDrag };
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

function Handle({ onStart }: { onStart: () => void }) {
  return (
    <span
      onPointerDown={(e) => { e.preventDefault(); onStart(); }}
      className="text-slate-500 select-none cursor-grab active:cursor-grabbing px-2 text-lg leading-none touch-none"
      style={{ touchAction: "none" }}
    >
      ⠿
    </span>
  );
}

// ─── OPTION A: Dropdowns + drag handle to reorder ────────

export function OptionAPrototype() {
  const emptyPicks = Array(MAX).fill("");
  const { items: picks, setItems: setPicks, setRef, draggingIndex, startDrag } = useDragSort(emptyPicks);

  function set(i: number, val: string) {
    const next = [...picks];
    const existing = next.indexOf(val);
    if (existing !== -1 && existing !== i) next[existing] = "";
    next[i] = val;
    setPicks(next);
  }

  const available = (current: string) =>
    DRIVERS.filter(d => d === current || !picks.includes(d));

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">Hold ⠿ and drag to reorder</p>
      {picks.map((pick, i) => (
        <div
          key={i}
          ref={el => setRef(el, i)}
          style={{ touchAction: "none" }}
          className={`flex items-center gap-2 rounded-lg transition-opacity select-none ${draggingIndex === i ? "opacity-40 scale-95" : "opacity-100"}`}
        >
          <Handle onStart={() => startDrag(i)} />
          <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
          <select
            value={pick}
            onChange={e => set(i, e.target.value)}
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            style={{ touchAction: "auto" }}
          >
            <option value="">Select driver…</option>
            {available(pick).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      ))}
      <SaveButton filled={picks.filter(Boolean).length} total={MAX} />
    </div>
  );
}

// ─── OPTION B: Tap to select + drag to reorder ───────────

export function OptionBPrototype() {
  const { items: picked, setItems: setPicked, setRef, draggingIndex, startDrag } = useDragSort<string>([]);

  function addDriver(d: string) {
    if (picked.length >= MAX) return;
    setPicked(prev => [...prev, d]);
  }

  function removeDriver(d: string) {
    setPicked(prev => prev.filter(p => p !== d));
  }

  const pool = DRIVERS.filter(d => !picked.includes(d));
  const slots = Array(MAX).fill(null).map((_, i) => picked[i] ?? null);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 mb-2">Your picks — {picked.length}/{MAX} · hold ⠿ to reorder</p>
        <div className="space-y-1.5">
          {slots.map((driver, i) => (
            driver ? (
              <div
                key={driver}
                ref={el => setRef(el, i)}
                style={{ touchAction: "none" }}
                className={`flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm transition-all select-none ${draggingIndex === i ? "opacity-40 scale-95" : "opacity-100"}`}
              >
                <Handle onStart={() => startDrag(i)} />
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
                <span className="flex-1 text-white font-medium">{driver}</span>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => removeDriver(driver)}
                  className="text-slate-500 hover:text-red-400 text-xs ml-1 px-1"
                >✕</button>
              </div>
            ) : (
              <div key={`empty-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700/50 px-3 py-2 text-sm opacity-30">
                <span className="w-6" />
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
                <span className="text-slate-600">─ ─ ─ ─ ─</span>
              </div>
            )
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2">Tap a driver to add</p>
        <div className="flex flex-wrap gap-2">
          {pool.map(d => (
            <button
              key={d}
              onClick={() => addDriver(d)}
              disabled={picked.length >= MAX}
              className="px-3 py-1.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
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

// ─── OPTION C: Unified picks + pool ──────────────────────

export function OptionCPrototype() {
  const { items: picked, setItems: setPicked, setRef, draggingIndex, startDrag } = useDragSort<string>([]);

  const pool = DRIVERS.filter(d => !picked.includes(d));

  function addFromPool(d: string) {
    if (picked.length >= MAX) return;
    setPicked(prev => [...prev, d]);
  }

  function removeFromPicks(d: string) {
    setPicked(prev => prev.filter(p => p !== d));
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      <div>
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
            {picked.map((d, i) => (
              <div
                key={d}
                ref={el => setRef(el, i)}
                style={{ touchAction: "none" }}
                className={`flex items-center gap-3 px-4 py-2.5 transition-all select-none ${draggingIndex === i ? "opacity-40 scale-95" : "opacity-100"}`}
              >
                <Handle onStart={() => startDrag(i)} />
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
                <span className="flex-1 text-white text-sm font-medium">{d}</span>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => removeFromPicks(d)}
                  className="text-red-500/50 hover:text-red-400 text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="px-4 py-2 border-t border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Driver pool</span>
          <span className="text-xs text-slate-600">{pool.length} remaining</span>
        </div>
        <div className="divide-y divide-slate-800/40 max-h-56 overflow-y-auto">
          {pool.map(d => (
            <button
              key={d}
              onClick={() => addFromPool(d)}
              disabled={picked.length >= MAX}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left active:bg-slate-700/60"
            >
              <span className="text-slate-600 text-xs font-bold">+</span>
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
