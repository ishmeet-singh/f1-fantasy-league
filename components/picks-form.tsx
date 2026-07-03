"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { F1 } from "@/lib/f1-theme";

type Driver = { id: string; name: string; team: string };
type EventType = "quali" | "sprint" | "race";

const EVENT_LABELS: Record<EventType, string> = {
  quali: "Qualifying",
  sprint: "Sprint",
  race: "Race"
};

const TEAM_COLORS: Record<string, string> = {
  McLaren: "bg-orange-500",
  "Red Bull": "bg-blue-700",
  "Red Bull Racing": "bg-blue-700",
  Ferrari: "bg-red-600",
  Mercedes: "bg-teal-500",
  "Aston Martin": "bg-emerald-700",
  "Alpine F1 Team": "bg-pink-500",
  Alpine: "bg-pink-500",
  Williams: "bg-sky-500",
  "Racing Bulls": "bg-indigo-500",
  "RB F1 Team": "bg-indigo-500",
  "Haas F1 Team": "bg-slate-400",
  Haas: "bg-slate-400",
  Sauber: "bg-lime-500",
  "Kick Sauber": "bg-lime-500"
};

function teamDot(team: string) {
  const cls = TEAM_COLORS[team] ?? "bg-slate-600";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function posBadge(slotIdx: number) {
  const bg = slotIdx < 3 ? F1.podium[slotIdx] : F1.carbonMid;
  const color = slotIdx === 0 ? F1.carbon : "#fff";
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
      style={{ background: bg, color }}
    >
      P{slotIdx + 1}
    </span>
  );
}

function useCountdown(deadline: string, locked: boolean) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (locked) return;
    function update() {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Locking…");
        return;
      }
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

function SortableSlot({
  id,
  slotIdx,
  driver,
  onRemove
}: {
  id: string;
  slotIdx: number;
  driver: Driver | null;
  onRemove: () => void;
}) {
  const isEmpty = !driver;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id, disabled: isEmpty });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none" as const
  };

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className="flex items-center gap-3 rounded-2xl border border-dashed p-3 transition-colors"
        style={{
          ...style,
          borderColor: isOver ? F1.red : F1.gridLine,
          background: isOver ? F1.redLight : F1.offWhite,
          opacity: isOver ? 1 : 0.7
        }}
      >
        {posBadge(slotIdx)}
        <span className="text-sm" style={{ color: isOver ? F1.red : F1.carbonLight }}>
          {isOver ? "Drop here" : "Tap a driver below"}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-3 rounded-2xl border p-3 transition-colors"
      style={{
        ...style,
        opacity: isDragging ? 0 : 1,
        borderColor: isOver ? F1.red : F1.gridLine,
        background: F1.white,
        boxShadow: isOver ? `0 0 0 2px ${F1.red}33` : undefined
      }}
    >
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab px-1 text-lg leading-none active:cursor-grabbing"
        style={{ color: F1.carbonLight, touchAction: "none" }}
      >
        ⠿
      </span>
      {posBadge(slotIdx)}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {teamDot(driver.team)}
        <span className="truncate font-semibold" style={{ color: F1.carbon }}>
          {driver.name}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 px-2 py-1 text-sm"
        style={{ color: F1.carbonLight }}
      >
        ✕
      </button>
    </div>
  );
}

function SlotOverlayCard({ slotIdx, driver }: { slotIdx: number; driver: Driver }) {
  return (
    <div
      className="flex cursor-grabbing items-center gap-3 rounded-2xl border p-3 shadow-xl"
      style={{ borderColor: F1.red, background: F1.white }}
    >
      {posBadge(slotIdx)}
      <div className="flex items-center gap-1.5">
        {teamDot(driver.team)}
        <span className="font-semibold" style={{ color: F1.carbon }}>
          {driver.name}
        </span>
      </div>
    </div>
  );
}

function PoolChip({
  driver,
  onTap,
  disabled
}: {
  driver: Driver;
  onTap: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${driver.id}`,
    disabled
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={!isDragging ? onTap : undefined}
      disabled={disabled}
      {...listeners}
      {...attributes}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        transform: CSS.Translate.toString(transform),
        touchAction: "none",
        opacity: isDragging ? 0 : 1,
        background: F1.white,
        color: F1.carbon,
        border: `1px solid ${F1.gridLine}`
      }}
    >
      {teamDot(driver.team)}
      {driver.name}
    </button>
  );
}

function PoolChipOverlay({ driver }: { driver: Driver }) {
  return (
    <span
      className="inline-flex cursor-grabbing items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-xl"
      style={{ borderColor: F1.red, background: F1.red, color: F1.white }}
    >
      {teamDot(driver.team)}
      {driver.name}
    </span>
  );
}

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
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: size }, (_, i) => initial[i + 1] || null)
  );
  const [savedSlots, setSavedSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: size }, (_, i) => initial[i + 1] || null)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdown = useCountdown(deadline, locked);

  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const filledCount = slots.filter(Boolean).length;
  const allFilled = filledCount === size;
  const hasUnsavedChanges = JSON.stringify(slots) !== JSON.stringify(savedSlots);
  const hasSavedPicks = savedSlots.some(Boolean);
  const poolIds = new Set(slots.filter(Boolean) as string[]);
  const pool = drivers.filter((d) => !poolIds.has(d.id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } })
  );

  const slotIds = slots.map((driverId, i) => driverId ?? `empty-${i}`);
  const isPoolDrag = activeId?.startsWith("pool-");
  const activeSlotDriver = activeId && !isPoolDrag ? (driverById.get(activeId) ?? null) : null;
  const activeSlotIdx = activeSlotDriver ? slots.indexOf(activeId!) : null;
  const activePoolDriver = isPoolDrag ? (driverById.get(activeId!.slice(5)) ?? null) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (!activeIdStr.startsWith("pool-")) {
      const from = slotIds.indexOf(activeIdStr);
      const to = slotIds.indexOf(overIdStr);
      if (from !== -1 && to !== -1 && from !== to) {
        setSlots((prev) => arrayMove(prev, from, to));
      }
    } else {
      const driverId = activeIdStr.slice(5);
      const to = slotIds.indexOf(overIdStr);
      if (to !== -1) {
        setSlots((prev) => {
          const next = [...prev];
          next[to] = driverId;
          return next;
        });
      }
    }
  }

  function tapAddToPool(driverId: string) {
    const emptyIdx = slots.indexOf(null);
    if (emptyIdx === -1) return;
    setSlots((prev) => {
      const next = [...prev];
      next[emptyIdx] = driverId;
      return next;
    });
  }

  function removeFromSlot(slotIdx: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }

  async function submit() {
    setStatus("loading");
    setErrorMsg("");
    const picks: Record<string, string> = {};
    slots.forEach((driverId, i) => {
      if (driverId) picks[String(i + 1)] = driverId;
    });
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
        setSavedSlots([...slots]);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again");
    }
  }

  if (locked) {
    return (
      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-bold" style={{ color: F1.carbon }}>
            {EVENT_LABELS[eventType]}
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: F1.offWhite, color: F1.carbonMid }}
          >
            Locked
          </span>
        </div>
        {savedSlots.some(Boolean) ? (
          <div className="space-y-2">
            {savedSlots.map((driverId, i) => {
              const driver = driverId ? driverById.get(driverId) : null;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ background: F1.offWhite, border: `1px solid ${F1.gridLine}` }}
                >
                  {posBadge(i)}
                  {driver ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {teamDot(driver.team)}
                      <span className="truncate text-sm font-medium" style={{ color: F1.carbon }}>
                        {driver.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm italic" style={{ color: F1.carbonLight }}>
                      No pick submitted
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl py-4 text-center text-sm" style={{ color: F1.carbonLight, background: F1.offWhite }}>
            No picks submitted for this session
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4" style={{ boxShadow: F1.cardShadow }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold" style={{ color: F1.carbon }}>
            {EVENT_LABELS[eventType]}
          </h3>
          {hasSavedPicks && !hasUnsavedChanges && status !== "saved" && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "#ECFDF5", color: "#166534" }}
            >
              ✓ Saved
            </span>
          )}
          {hasUnsavedChanges && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: F1.redLight, color: F1.red }}
            >
              Unsaved
            </span>
          )}
        </div>
        {countdown && (
          <span
            className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: F1.redLight, color: F1.red }}
          >
            Locks in {countdown}
          </span>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          <p className="text-xs" style={{ color: F1.carbonLight }}>
            {filledCount}/{size} picked · hold ⠿ to reorder
          </p>
          <SortableContext items={slotIds} strategy={verticalListSortingStrategy}>
            {slots.map((driverId, i) => {
              const id = slotIds[i];
              const driver = driverId ? (driverById.get(driverId) ?? null) : null;
              return (
                <SortableSlot
                  key={id}
                  id={id}
                  slotIdx={i}
                  driver={driver}
                  onRemove={() => removeFromSlot(i)}
                />
              );
            })}
          </SortableContext>
        </div>

        <div className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: F1.gridLine }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
            Driver pool
          </p>
          <p className="text-xs" style={{ color: F1.carbonLight }}>
            {pool.length > 0 ? "Tap to add · or drag to a slot" : "All drivers picked"}
          </p>
          <div className="flex flex-wrap gap-2">
            {pool.map((d) => (
              <PoolChip key={d.id} driver={d} onTap={() => tapAddToPool(d.id)} disabled={allFilled} />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeSlotDriver && activeSlotIdx !== null && (
            <SlotOverlayCard slotIdx={activeSlotIdx} driver={activeSlotDriver} />
          )}
          {activePoolDriver && <PoolChipOverlay driver={activePoolDriver} />}
        </DragOverlay>
      </DndContext>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={status === "loading" || !allFilled}
          onClick={submit}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: F1.red }}
        >
          {status === "loading" && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {status === "loading" ? "Saving…" : hasSavedPicks ? "Update picks" : "Save picks"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium" style={{ color: "#166534" }}>
            ✓ Saved!
          </span>
        )}
        {status === "error" && (
          <span className="text-sm" style={{ color: F1.red }}>
            {errorMsg}
          </span>
        )}
      </div>
    </section>
  );
}
