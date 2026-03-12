"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type Driver = { id: string; name: string; team: string };
type EventType = "quali" | "sprint" | "race";

const EVENT_LABELS: Record<EventType, string> = {
  quali: "Qualifying",
  sprint: "Sprint",
  race: "Race",
};

const TEAM_COLORS: Record<string, string> = {
  "McLaren": "bg-orange-500", "Red Bull": "bg-blue-700", "Red Bull Racing": "bg-blue-700",
  "Ferrari": "bg-red-600", "Mercedes": "bg-teal-500", "Aston Martin": "bg-emerald-700",
  "Alpine F1 Team": "bg-pink-500", "Alpine": "bg-pink-500", "Williams": "bg-sky-500",
  "Racing Bulls": "bg-indigo-500", "RB F1 Team": "bg-indigo-500",
  "Haas F1 Team": "bg-slate-400", "Haas": "bg-slate-400",
  "Sauber": "bg-lime-500", "Kick Sauber": "bg-lime-500",
};

function teamDot(team: string) {
  const cls = TEAM_COLORS[team] ?? "bg-slate-600";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} shrink-0`} />;
}

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

// ── Drag handle for filled slots ──────────────────────────
function FilledSlot({
  slotIdx, driver, onRemove
}: {
  slotIdx: number; driver: Driver; onRemove: () => void;
}) {
  // Both draggable (to reorder) AND droppable (to receive drops from pool or other slots)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } =
    useDraggable({ id: `slot-${slotIdx}` });
  const { setNodeRef: setDropRef, isOver } =
    useDroppable({ id: `slot-${slotIdx}` });

  const ref = (el: HTMLElement | null) => { setDragRef(el); setDropRef(el); };

  return (
    <div
      ref={ref}
      style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
      className={`flex items-center gap-2 rounded-lg border text-sm select-none transition-all ${
        isDragging
          ? "opacity-40 border-slate-600 bg-slate-800"
          : isOver
          ? "border-red-500/60 bg-red-950/20"
          : "border-slate-700 bg-slate-800 hover:border-slate-500"
      }`}
    >
      {/* Drag handle — listeners only here, not on the row */}
      <span
        {...listeners} {...attributes}
        className="cursor-grab active:cursor-grabbing px-3 py-2.5 text-slate-400 text-lg leading-none shrink-0"
        style={{ touchAction: "none" }}
      >⠿</span>
      <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{slotIdx + 1}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {teamDot(driver.team)}
        <span className="text-white font-medium truncate">{driver.name}</span>
      </div>
      <button
        onClick={onRemove}
        className="px-3 py-2.5 text-slate-500 hover:text-red-400 shrink-0"
      >✕</button>
    </div>
  );
}

// ── Empty slot — drop target only ─────────────────────────
function EmptySlot({ slotIdx }: { slotIdx: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slotIdx}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg border text-sm transition-all py-2.5 ${
        isOver
          ? "border-red-500/70 bg-red-950/30 border-solid"
          : "border-dashed border-slate-700/50 opacity-40"
      }`}
    >
      <span className="px-3 text-lg text-transparent">⠿</span>
      <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{slotIdx + 1}</span>
      <span className={`text-xs ${isOver ? "text-red-300" : "text-slate-600"}`}>
        {isOver ? "Drop here" : "─ ─ ─ ─ ─"}
      </span>
    </div>
  );
}

// ── Pool chip — draggable, also tappable ──────────────────
function PoolChip({
  driver, onTap, disabled
}: {
  driver: Driver; onTap: () => void; disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `pool-${driver.id}`, disabled });

  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
      onClick={!isDragging ? onTap : undefined}
      {...listeners} {...attributes}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border cursor-pointer select-none transition-all ${
        isDragging
          ? "opacity-40 border-red-500/50 bg-red-950/20 z-50"
          : disabled
          ? "opacity-30 cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500"
          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 active:scale-95"
      }`}
    >
      {teamDot(driver.team)}
      {driver.name}
    </span>
  );
}

// ── Main form ─────────────────────────────────────────────
export function PicksForm({
  drivers, raceId, eventType, size, locked, deadline, initial
}: {
  drivers: Driver[];
  raceId: string;
  eventType: EventType;
  size: number;
  locked: boolean;
  deadline: string;
  initial: Record<number, string>;
}) {
  // slots[i] = driverId at position i+1, or null if empty
  const [slots, setSlots] = useState<(string | null)[]>(
    () => Array.from({ length: size }, (_, i) => initial[i + 1] || null)
  );
  const [savedSlots, setSavedSlots] = useState<(string | null)[]>(
    () => Array.from({ length: size }, (_, i) => initial[i + 1] || null)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdown = useCountdown(deadline, locked);

  const driverById = new Map(drivers.map(d => [d.id, d]));
  const filledCount = slots.filter(Boolean).length;
  const allFilled = filledCount === size;
  const hasUnsavedChanges = JSON.stringify(slots) !== JSON.stringify(savedSlots);
  const hasSavedPicks = savedSlots.some(Boolean);
  const poolIds = new Set(slots.filter(Boolean) as string[]);
  const pool = drivers.filter(d => !poolIds.has(d.id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } })
  );

  function tapAddToPool(driverId: string) {
    const emptyIdx = slots.indexOf(null);
    if (emptyIdx === -1) return;
    setSlots(prev => { const next = [...prev]; next[emptyIdx] = driverId; return next; });
  }

  function removeFromSlot(slotIdx: number) {
    setSlots(prev => { const next = [...prev]; next[slotIdx] = null; return next; });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("slot-") && overId.startsWith("slot-")) {
      // Reorder: remove from source, insert at target — everything in between shifts
      const from = parseInt(activeId.slice(5));
      const to = parseInt(overId.slice(5));
      if (from === to) return;
      setSlots(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    } else if (activeId.startsWith("pool-") && overId.startsWith("slot-")) {
      // Drop from pool onto a specific slot
      const driverId = activeId.slice(5);
      const slotIdx = parseInt(overId.slice(5));
      setSlots(prev => {
        const next = [...prev];
        // If target slot already has someone, remove them (they go back to pool)
        next[slotIdx] = driverId;
        return next;
      });
    }
  }

  async function submit() {
    setStatus("loading");
    setErrorMsg("");
    const picks: Record<string, string> = {};
    slots.forEach((driverId, i) => { if (driverId) picks[String(i + 1)] = driverId; });
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId, eventType, picks }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error || "Failed to save picks");
      } else {
        setStatus("saved");
        setSavedSlots([...slots]);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again");
    }
  }

  // ── Locked read-only view ──────────────────────────────
  if (locked) {
    return (
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{EVENT_LABELS[eventType]}</h3>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">Locked</span>
        </div>
        {savedSlots.some(Boolean) ? (
          <div className="space-y-1.5">
            {savedSlots.map((driverId, i) => {
              const driver = driverId ? driverById.get(driverId) : null;
              return (
                <div key={i} className="flex items-center gap-2 rounded-md bg-slate-800/40 px-3 py-2">
                  <span className="w-6 text-right text-slate-500 text-xs font-mono shrink-0">P{i + 1}</span>
                  {driver ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {teamDot(driver.team)}
                      <span className="font-medium text-sm text-slate-200 truncate">{driver.name}</span>
                      <span className="text-xs text-slate-500 hidden sm:inline">{driver.team}</span>
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

  // ── Editable view ──────────────────────────────────────
  return (
    <div className="card space-y-4">
      {/* Header */}
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
          <span className="text-xs bg-red-900/40 text-red-400 border border-red-800/50 px-2 py-1 rounded-full shrink-0">
            Locks in {countdown}
          </span>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Picks list */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">{filledCount}/{size} picked · hold ⠿ to reorder · drag chip to specific slot</p>
          {slots.map((driverId, i) => {
            const driver = driverId ? driverById.get(driverId) : null;
            return driver ? (
              <FilledSlot key={i} slotIdx={i} driver={driver} onRemove={() => removeFromSlot(i)} />
            ) : (
              <EmptySlot key={i} slotIdx={i} />
            );
          })}
        </div>

        {/* Driver pool */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            {pool.length > 0 ? "Tap to add · or drag to a specific slot" : "All drivers picked"}
          </p>
          <div className="flex flex-wrap gap-2">
            {pool.map(d => (
              <PoolChip
                key={d.id}
                driver={d}
                onTap={() => tapAddToPool(d.id)}
                disabled={allFilled}
              />
            ))}
          </div>
        </div>
      </DndContext>

      {/* Save button */}
      <div className="flex items-center gap-3">
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
        {status === "error" && <span className="text-sm text-red-400">{errorMsg}</span>}
      </div>
    </div>
  );
}
