"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DRIVERS = [
  "Verstappen", "Norris", "Leclerc", "Piastri", "Russell",
  "Hamilton", "Antonelli", "Albon", "Hadjar", "Lawson",
  "Hulkenberg", "Bearman", "Ocon", "Gasly", "Bottas",
  "Colapinto", "Alonso", "Magnussen", "Doohan", "Bortoleto",
  "Stroll", "Tsunoda"
];

const MAX = 5;

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

function useDndSensors() {
  return useSensors(
    // distance: 3 — starts drag after 3px movement, no delay
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    // distance only (no delay) — drag starts as soon as finger moves 8px
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );
}

// ─── OPTION A: Dropdown rows + drag to reorder ───────────

function SortableDropdownRow({
  id, position, value, available, onChange
}: {
  id: string; position: number; value: string;
  available: string[]; onChange: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 rounded-lg"
    >
      {/* Drag handle */}
      <span
        {...listeners} {...attributes}
        className="cursor-grab active:cursor-grabbing px-2 text-slate-500 text-lg leading-none select-none touch-none"
      >⠿</span>
      <span className="text-slate-500 font-mono text-xs w-5 shrink-0 select-none">P{position}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
      >
        <option value="">Select driver…</option>
        {available.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
}

export function OptionAPrototype() {
  // Each slot is an object with a stable id + value
  const [slots, setSlots] = useState(() =>
    Array.from({ length: MAX }, (_, i) => ({ id: `slot-${i}`, value: "" }))
  );
  const sensors = useDndSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlots(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id);
      const newIdx = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  function setValue(id: string, val: string) {
    setSlots(prev => {
      const next = prev.map(s => ({ ...s }));
      // Clear this driver from any other slot
      next.forEach(s => { if (s.value === val && s.id !== id) s.value = ""; });
      const slot = next.find(s => s.id === id);
      if (slot) slot.value = val;
      return next;
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slots.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-3">Hold ⠿ and drag to reorder</p>
          {slots.map((slot, i) => (
            <SortableDropdownRow
              key={slot.id}
              id={slot.id}
              position={i + 1}
              value={slot.value}
              available={DRIVERS.filter(d => d === slot.value || !slots.some(s => s.value === d))}
              onChange={val => setValue(slot.id, val)}
            />
          ))}
          <SaveButton filled={slots.filter(s => s.value).length} total={MAX} />
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ─── OPTION B: Tap to add + drag to reorder ──────────────

// Reusable row content (used in both live list and DragOverlay)
function PickRowContent({ position, driver, onRemove, isOverlay = false }: {
  position: number; driver: string; onRemove?: () => void; isOverlay?: boolean;
}) {
  return (
    <>
      <span className={`px-1 text-lg leading-none ${isOverlay ? "text-red-400" : "text-slate-400 group-hover:text-slate-200"}`}>⠿</span>
      <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{position}</span>
      <span className="flex-1 text-white font-medium">{driver}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400 text-sm px-1">✕</button>
      )}
    </>
  );
}

function SortablePickRow({
  id, position, driver, onRemove
}: {
  id: string; position: number; driver: string; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm select-none cursor-grab active:cursor-grabbing transition-colors ${
        isDragging
          ? "opacity-30 bg-slate-800 border-slate-600"
          : "bg-slate-800 border-slate-700 hover:border-slate-500"
      }`}
      {...listeners} {...attributes}
    >
      <PickRowContent position={position} driver={driver} onRemove={onRemove} />
    </div>
  );
}

// Floating ghost shown during drag
function DragOverlayRow({ position, driver }: { position: number; driver: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-700 border border-red-500/60 px-3 py-2.5 text-sm shadow-2xl shadow-black/60 select-none cursor-grabbing scale-105">
      <PickRowContent position={position} driver={driver} isOverlay />
    </div>
  );
}

export function OptionBPrototype() {
  const [picked, setPicked] = useState<{ id: string; driver: string }[]>([]);
  const [activeItem, setActiveItem] = useState<{ id: string; driver: string } | null>(null);
  const sensors = useDndSensors();
  const pool = DRIVERS.filter(d => !picked.some(p => p.driver === d));

  function add(driver: string) {
    if (picked.length >= MAX) return;
    setPicked(prev => [...prev, { id: `pick-${driver}`, driver }]);
  }

  function remove(id: string) {
    setPicked(prev => prev.filter(p => p.id !== id));
  }

  function handleDragStart(event: DragStartEvent) {
    const item = picked.find(p => p.id === event.active.id);
    setActiveItem(item ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPicked(prev => {
      const oldIdx = prev.findIndex(p => p.id === active.id);
      const newIdx = prev.findIndex(p => p.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 mb-2">Your picks — {picked.length}/{MAX} · hold ⠿ to reorder</p>

        {/* Empty slots (visual only) */}
        {picked.length < MAX && (
          <div className="space-y-1.5 mb-1.5">
            {Array.from({ length: MAX - picked.length }, (_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700/40 px-3 py-2 opacity-30">
                <span className="w-7 shrink-0" />
                <span className="text-slate-500 font-mono text-xs w-5 shrink-0">P{picked.length + i + 1}</span>
                <span className="text-slate-600 text-sm">─ ─ ─ ─ ─</span>
              </div>
            ))}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={picked.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {picked.map((p, i) => (
                <SortablePickRow
                  key={p.id}
                  id={p.id}
                  position={i + 1}
                  driver={p.driver}
                  onRemove={() => remove(p.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <DragOverlayRow
                position={picked.findIndex(p => p.id === activeItem.id) + 1}
                driver={activeItem.driver}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2">Tap a driver to add</p>
        <div className="flex flex-wrap gap-2">
          {pool.map(d => (
            <button
              key={d}
              onClick={() => add(d)}
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
  const [picked, setPicked] = useState<{ id: string; driver: string }[]>([]);
  const [activeItem, setActiveItem] = useState<{ id: string; driver: string } | null>(null);
  const sensors = useDndSensors();
  const pool = DRIVERS.filter(d => !picked.some(p => p.driver === d));

  function add(driver: string) {
    if (picked.length >= MAX) return;
    setPicked(prev => [...prev, { id: `pick-${driver}`, driver }]);
  }

  function remove(id: string) {
    setPicked(prev => prev.filter(p => p.id !== id));
  }

  function handleDragStart(event: DragStartEvent) {
    const item = picked.find(p => p.id === event.active.id);
    setActiveItem(item ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPicked(prev => {
      const oldIdx = prev.findIndex(p => p.id === active.id);
      const newIdx = prev.findIndex(p => p.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your picks</span>
        <span className="text-xs text-slate-500">{picked.length}/{MAX} · hold ⠿ to reorder</span>
      </div>

      {picked.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-600 text-sm border-b border-dashed border-slate-800">
          ↓ tap a driver below to add
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={picked.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-slate-800/60">
              {picked.map((p, i) => (
                <SortablePickRow
                  key={p.id}
                  id={p.id}
                  position={i + 1}
                  driver={p.driver}
                  onRemove={() => remove(p.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <DragOverlayRow
                position={picked.findIndex(p => p.id === activeItem.id) + 1}
                driver={activeItem.driver}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <div className="px-4 py-2 border-t border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Driver pool</span>
        <span className="text-xs text-slate-600">{pool.length} remaining</span>
      </div>
      <div className="divide-y divide-slate-800/40 max-h-56 overflow-y-auto">
        {pool.map(d => (
          <button
            key={d}
            onClick={() => add(d)}
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
