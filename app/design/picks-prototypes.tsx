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
// Pattern: container captures the pointer on drag start.
// Container's onPointerMove/Up handles all moves — no window listeners,
// no passive event issues, works on mouse and touch.

function useDragSort<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragFrom = useRef<number | null>(null);
  const capturedPointerId = useRef<number | null>(null);

  const setRef = useCallback((el: HTMLElement | null, i: number) => {
    itemRefs.current[i] = el;
  }, []);

  function closestIndex(clientY: number): number {
    let best = 0, bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(clientY - (rect.top + rect.height / 2));
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }

  const startDrag = useCallback((index: number, pointerId: number) => {
    containerRef.current?.setPointerCapture(pointerId);
    capturedPointerId.current = pointerId;
    dragFrom.current = index;
    setDraggingIndex(index);
  }, []);

  const onContainerPointerMove = useCallback((e: React.PointerEvent) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onContainerPointerUp = useCallback(() => {
    if (capturedPointerId.current !== null) {
      containerRef.current?.releasePointerCapture(capturedPointerId.current);
      capturedPointerId.current = null;
    }
    dragFrom.current = null;
    setDraggingIndex(null);
  }, []);

  return {
    items, setItems,
    itemRefs, setRef, containerRef,
    draggingIndex, startDrag,
    onContainerPointerMove, onContainerPointerUp,
  };
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

function Handle({ onStart }: { onStart: (pointerId: number) => void }) {
  return (
    <span
      className="text-slate-500 select-none cursor-grab active:cursor-grabbing px-2 text-lg leading-none"
      style={{ touchAction: "none" }}
      onPointerDown={e => {
        e.preventDefault();
        e.stopPropagation();
        onStart(e.pointerId);
      }}
    >
      ⠿
    </span>
  );
}

// ─── OPTION A: Dropdowns + drag to reorder ────────────────

export function OptionAPrototype() {
  const { items: picks, setItems: setPicks, setRef, containerRef, draggingIndex, startDrag, onContainerPointerMove, onContainerPointerUp } = useDragSort(Array(MAX).fill(""));

  function set(i: number, val: string) {
    const next = [...picks];
    const existing = next.indexOf(val);
    if (existing !== -1 && existing !== i) next[existing] = "";
    next[i] = val;
    setPicks(next);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={onContainerPointerMove}
      onPointerUp={onContainerPointerUp}
      onPointerCancel={onContainerPointerUp}
      className="space-y-2"
      style={{ touchAction: "none" }}
    >
      <p className="text-xs text-slate-500 mb-3">Hold ⠿ and drag to reorder</p>
      {picks.map((pick, i) => (
        <div
          key={i}
          ref={el => setRef(el, i)}
          className={`flex items-center gap-2 rounded-lg transition-all ${draggingIndex === i ? "opacity-40 scale-95" : ""}`}
        >
          <Handle onStart={(pid) => startDrag(i, pid)} />
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

// ─── OPTION B: Tap to select + drag to reorder ───────────

export function OptionBPrototype() {
  const { items: picked, setItems: setPicked, setRef, containerRef, draggingIndex, startDrag, onContainerPointerMove, onContainerPointerUp } = useDragSort<string>([]);

  const pool = DRIVERS.filter(d => !picked.includes(d));
  const slots = Array(MAX).fill(null).map((_, i) => picked[i] ?? null);

  return (
    <div className="space-y-4">
      {/* Sortable picks list */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Your picks — {picked.length}/{MAX} · hold ⠿ to reorder</p>
        <div
          ref={containerRef}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerCancel={onContainerPointerUp}
          className="space-y-1.5"
          style={{ touchAction: "none" }}
        >
          {slots.map((driver, i) => (
            driver ? (
              <div
                key={driver}
                ref={el => setRef(el, i)}
                className={`flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm transition-all select-none ${draggingIndex === i ? "opacity-40 scale-95" : ""}`}
              >
                <Handle onStart={(pid) => startDrag(i, pid)} />
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
                <span className="flex-1 text-white font-medium">{driver}</span>
                <button
                  style={{ touchAction: "auto" }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setPicked(prev => prev.filter(p => p !== driver))}
                  className="text-slate-500 hover:text-red-400 text-sm px-1"
                >✕</button>
              </div>
            ) : (
              <div key={`empty-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700/40 px-3 py-2 opacity-30 select-none">
                <span className="w-7" />
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{i + 1}</span>
                <span className="text-slate-600 text-sm">─ ─ ─ ─ ─</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Pool */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Tap a driver to add</p>
        <div className="flex flex-wrap gap-2">
          {pool.map(d => (
            <button
              key={d}
              onClick={() => { if (picked.length < MAX) setPicked(prev => [...prev, d]); }}
              disabled={picked.length >= MAX}
              className="px-3 py-1.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500 disabled:opacity-30 active:scale-95 transition-all"
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
  const { items: picked, setItems: setPicked, setRef, containerRef, draggingIndex, startDrag, onContainerPointerMove, onContainerPointerUp } = useDragSort<string>([]);

  const pool = DRIVERS.filter(d => !picked.includes(d));

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      {/* Sortable picks */}
      <div
        ref={containerRef}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
        onPointerCancel={onContainerPointerUp}
        style={{ touchAction: "none" }}
      >
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
                className={`flex items-center gap-3 px-4 py-2.5 select-none transition-all ${draggingIndex === i ? "opacity-40 scale-95" : ""}`}
              >
                <Handle onStart={(pid) => startDrag(i, pid)} />
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
      </div>

      {/* Pool */}
      <div>
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 disabled:opacity-30 disabled:cursor-not-allowed text-left active:bg-slate-700/60"
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
