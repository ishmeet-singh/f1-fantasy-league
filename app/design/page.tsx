import { OptionAPrototype, OptionBPrototype, OptionCPrototype } from "./picks-prototypes";

export default function DesignPage() {
  return (
    <div className="max-w-2xl space-y-10 py-4">

      <div>
        <h1 className="text-2xl font-bold text-white">Picks UX — 3 Options</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Try each one and decide which to build. Showing 5 picks for clarity (real version will be 10).
        </p>
      </div>

      {/* Option A */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="bg-slate-800 border border-slate-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">Option A</span>
          <span className="text-white font-medium">Dropdowns + reorder</span>
          <span className="text-slate-500 text-sm">minimal change</span>
        </div>
        <p className="text-sm text-slate-400">
          Same dropdowns as today. ▲▼ arrows to reorder after filling. Still requires N taps to fill each slot individually.
        </p>
        <div className="card">
          <OptionAPrototype />
        </div>
      </div>

      {/* Option B */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="bg-blue-900/50 border border-blue-700 text-blue-200 px-3 py-1 rounded-lg text-sm font-semibold">Option B ★</span>
          <span className="text-white font-medium">Tap to select + reorder</span>
          <span className="text-blue-400 text-sm">recommended</span>
        </div>
        <p className="text-sm text-slate-400">
          Tap a driver chip to add them to your ranked list. Tap ✕ to remove. ▲▼ to reorder. Fast, no precision dragging needed.
        </p>
        <div className="card">
          <OptionBPrototype />
        </div>
      </div>

      {/* Option C */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="bg-slate-800 border border-slate-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">Option C</span>
          <span className="text-white font-medium">Unified picks + pool list</span>
          <span className="text-slate-500 text-sm">most powerful</span>
        </div>
        <p className="text-sm text-slate-400">
          Single scrollable list. Your picks at top, driver pool below. Tap + to add, ✕ to remove, ▲▼ to reorder.
        </p>
        <OptionCPrototype />
      </div>

    </div>
  );
}
